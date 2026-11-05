// PHASE7 verification + tuning sim. Reuses the REAL game modules (status engine, move
// hooks, combat math incl. status-effective stats, the SHIPPED Barrow-King from
// data/bosses.js) so what we verify here is exactly what ships. Three jobs:
//
//   (A) Status/hook engine self-test — apply/refresh/stack, Burn's −Atk through
//       computeDamage, Rot's healingMod, Bleed's onAction trigger, min-1 ticks, expiry,
//       recoil/applies data wiring, Blightspore learned at Lv7.
//   (B) Barrow-King re-check (PHASE7 §2.5) — boss numbers UNTOUCHED; confirm the intent
//       bars under CANONICAL max-damage play (the policy every prior phase tuned
//       against), then measure the new ceiling when a player deliberately fishes for
//       statuses ("seeker" policy). Battle flow mirrors BattleScene exactly: recoil →
//       on-hit status roll → attacker's onAction tick; turnEnd ticks when both stand;
//       Lifedrain × healingReceivedMod (Rot halves the King's drain); faint → next
//       alive, no free hit.
//
// Run:  node scripts/sim-phase7.mjs

import { SPECIES, makeCreature, gainCreatureXp } from '../src/data/creatures.js';
import { mv } from '../src/data/moves.js';
import { makeBoss } from '../src/data/bosses.js';
import { computeDamage, playerActsFirst, chooseEnemyMove } from '../src/systems/combat.js';
import {
  applyStatus, tryApplyStatus, tickStatuses, clearStatuses, hasStatus,
  effectiveStat, healingReceivedMod,
} from '../src/systems/status.js';
import { STATUSES } from '../src/data/statuses.js';

// ---- (A) engine self-test ----------------------------------------------------
let failures = 0;
function check(label, cond) {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failures++;
}

function selfTest() {
  console.log('=== (A) STATUS / MOVE-HOOK ENGINE SELF-TEST ===');

  // A1: move-hook data wiring (what mv() carries into instances and saves).
  {
    const wired = [
      ['Clatter', 'applies', 'Bleed', 0.3], ['Kiln Burst', 'applies', 'Burn', 0.35],
      ['Blightspore', 'applies', 'Poison', 0.35], ['Marrow Spikes', 'applies', 'Rot', 0.3],
    ].every(([n, , st, ch]) => { const m = mv(n); return m.applies && m.applies.status === st && m.applies.chance === ch; });
    const rec = mv('Overheat Slam').recoil === 0.25 && mv('Ossuary Crash').recoil === 0.25;
    check('move hooks wired: Clatter+Bleed.3, Kiln Burst+Burn.35, Blightspore+Poison.35, Marrow Spikes+Rot.3', wired);
    check('recoil 0.25 on Overheat Slam and Ossuary Crash', rec);
  }

  // A2: apply / refresh / stacking.
  {
    const c = makeCreature('Mireling', 10); // 48 maxHp at Lv10
    check(`apply is 'applied' then 'refreshed' (one instance per id)`,
      applyStatus(c, 'Burn') === 'applied' && applyStatus(c, 'Burn') === 'refreshed');
    applyStatus(c, 'Poison');
    check('different statuses stack (Burn + Poison both active)', hasStatus(c, 'Burn') && hasStatus(c, 'Poison'));
    tickStatuses(c, 'turnEnd'); // Burn 3->2, Poison 4->3
    applyStatus(c, 'Burn');
    check('re-apply refreshes duration to full', c.statuses.find((s) => s.id === 'Burn').turnsLeft === STATUSES.Burn.duration);
  }

  // A3: Burn's −Atk flows through computeDamage (effective stats, never baked).
  {
    const fw = makeCreature('Forgewrought', 10); // atk 26
    const king = makeBoss('BarrowKing');
    const before = computeDamage(fw, fw.moves[1], king); // Ram: floor(26*5/12) = 10
    applyStatus(fw, 'Burn');
    const after = computeDamage(fw, fw.moves[1], king); // floor(floor(26*0.75)=19 *5/12) = 7
    check(`Burn drops Ram vs the King ${before}->${after} (eff Atk ${effectiveStat(fw, 'atk')} of ${fw.atk})`,
      before === 10 && after === 7 && effectiveStat(fw, 'atk') === 19);
    clearStatuses(fw);
    check('clearStatuses restores base output', computeDamage(fw, fw.moves[1], king) === 10);
  }

  // A4: tick amounts (fraction of maxHp, min 1) + Rot healingMod.
  {
    const c = makeCreature('Mireling', 10); // maxHp 48
    for (const id of ['Burn', 'Poison', 'Bleed', 'Rot']) applyStatus(c, id);
    check('Rot halves healing received (mod 0.5)', healingReceivedMod(c) === 0.5);
    const end = tickStatuses(c, 'turnEnd'); // Burn 3, Poison 4, Rot 3 — Bleed must NOT tick
    const byId = Object.fromEntries(end.map((e) => [e.id, e.dmg]));
    check(`turnEnd ticks on 48 maxHp: Burn ${byId.Burn}, Poison ${byId.Poison}, Rot ${byId.Rot} (Bleed absent: ${!('Bleed' in byId)})`,
      byId.Burn === 3 && byId.Poison === 4 && byId.Rot === 3 && !('Bleed' in byId) && end.length === 3);
    const act = tickStatuses(c, 'onAction');
    check(`Bleed ticks onAction only: ${act.length === 1 && act[0].id === 'Bleed'} (dmg ${act[0]?.dmg} = 48/10 floored)`,
      act.length === 1 && act[0].id === 'Bleed' && act[0].dmg === 4);
    const tiny = { name: 'tiny', hp: 10, maxHp: 10 };
    applyStatus(tiny, 'Burn');
    check('min-1 tick on a 10-maxHp creature', tickStatuses(tiny, 'turnEnd')[0].dmg === 1);
  }

  // A5: expiry + fainted creatures don't tick.
  {
    const c = makeCreature('Sistern', 10);
    applyStatus(c, 'Burn'); // duration 3
    let expired = false;
    for (let i = 0; i < 3; i++) expired = tickStatuses(c, 'turnEnd').some((e) => e.expired);
    check('Burn expires after exactly 3 turnEnd ticks and is removed', expired && !hasStatus(c, 'Burn'));
    applyStatus(c, 'Poison');
    c.hp = 0;
    check('a fainted creature does not tick', tickStatuses(c, 'turnEnd').length === 0);
  }

  // A6: tryApplyStatus (the on-hit hook and the future passive seam).
  {
    const t = makeCreature('Fenmoth', 5);
    const spec = { status: 'Poison', chance: 0.35 };
    check('roll under chance applies', tryApplyStatus(t, spec, () => 0)?.result === 'applied');
    check('roll at/over chance misses', tryApplyStatus(t, spec, () => 0.35) === null);
    t.hp = 0;
    check('no application to a downed target', tryApplyStatus(t, spec, () => 0) === null);
  }

  // A7: Blightspore arrives on Mireling's learnset at Lv7 (free slot -> learned).
  {
    const c = makeCreature('Mireling', 6);
    let learned = [];
    while (c.level < 7) learned.push(...gainCreatureXp(c, 40, 10).events.filter((e) => e.kind === 'learned'));
    check(`Mireling learns Blightspore at Lv7 (${c.moves.map((m) => m.name).join(', ')})`,
      learned.some((e) => e.move.name === 'Blightspore') && c.moves.length === 3);
  }

  console.log(failures ? `\n  *** ${failures} FAILURE(S) ***\n` : '\n  all engine checks pass\n');
}

// ---- (B) battle replication (mirrors BattleScene's PHASE7 flow) ---------------
function bestMove(attacker, defender) {
  let best = attacker.moves[0], bestDmg = -1;
  for (const m of attacker.moves) {
    const d = computeDamage(attacker, m, defender);
    if (d > bestDmg) { best = m; bestDmg = d; }
  }
  return best;
}

// Canonical: pure max damage (the policy every boss tune was verified against).
const CANONICAL = (active, enemy) => bestMove(active, enemy);

// Seeker: if a carried move can inflict a status the enemy lacks, fish with the
// strongest such move; otherwise max damage. Models deliberate status play.
const SEEKER = (active, enemy) => {
  const fish = active.moves.filter((m) => m.applies && !hasStatus(enemy, m.applies.status));
  if (fish.length) return fish.reduce((a, b) => (computeDamage(active, a, enemy) >= computeDamage(active, b, enemy) ? a : b));
  return bestMove(active, enemy);
};

function simBattle(team, boss, policy, trace = false) {
  const enemy = { ...boss, hp: boss.maxHp, moves: boss.moves.map((m) => ({ ...m })), statuses: [] };
  for (const c of team) c.statuses = [];
  let active = team[0];
  let turns = 0;
  let frenzy = false;
  const say = (m) => { if (trace) console.log('    ' + m); };
  const alive = () => team.filter((c) => c.hp > 0).length;
  const teamHpLeft = () => team.reduce((s, c) => s + Math.max(0, c.hp), 0);

  const noteFrenzy = () => {
    if (!frenzy && enemy.hp <= enemy.maxHp * enemy.drain.threshold) {
      frenzy = true; say('*** feeding frenzy ***');
    }
  };
  const tickFor = (c, trigger) => {
    for (const ev of tickStatuses(c, trigger)) {
      say(`${c.name} ${ev.id} tick -${ev.dmg}${ev.expired ? ' (expires)' : ''}  [${c.name} ${c.hp}]`);
    }
  };
  const hitEffects = (user, move, dmg, target) => {
    if (move.recoil && dmg > 0) {
      const r = Math.max(1, Math.floor(move.recoil * dmg));
      user.hp = Math.max(0, user.hp - r);
      say(`${user.name} recoil -${r}`);
    }
    const ev = tryApplyStatus(target, move.applies);
    if (ev) say(`${target.name} <- ${ev.id} (${ev.result})`);
  };
  const playerAttack = (move) => {
    const d = computeDamage(active, move, enemy);
    enemy.hp = Math.max(0, enemy.hp - d);
    say(`${active.name} ${move.name} -> King -${d}   [King ${enemy.hp}/${enemy.maxHp}]`);
    noteFrenzy();
    hitEffects(active, move, d, enemy);
    tickFor(active, 'onAction');
  };
  const enemyStrike = () => {
    const em = chooseEnemyMove(enemy, active);
    const d = computeDamage(enemy, em, active);
    active.hp = Math.max(0, active.hp - d);
    noteFrenzy();
    let healed = 0;
    if (d > 0) {
      const belowHalf = enemy.hp <= enemy.maxHp * enemy.drain.threshold;
      healed = Math.floor((belowHalf ? enemy.drain.below : enemy.drain.above) * d * healingReceivedMod(enemy));
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + healed);
    }
    say(`King ${em.name} -> ${active.name} -${d}${healed ? ` (drains +${healed})` : ''}   [King ${enemy.hp}/${enemy.maxHp}, ${active.name} ${active.hp}/${active.maxHp}]`);
    hitEffects(enemy, em, d, active);
    tickFor(enemy, 'onAction');
  };

  while (true) {
    turns++;
    if (turns > 500) return { win: false, turns, aliveLeft: alive(), teamHpLeft: 0, note: 'stall' };
    const move = policy(active, enemy);

    if (playerActsFirst(active, enemy)) {
      playerAttack(move);
      if (enemy.hp <= 0) break;
      if (active.hp > 0) enemyStrike();
    } else {
      enemyStrike();
      if (active.hp > 0 && enemy.hp > 0) playerAttack(move);
    }
    if (enemy.hp <= 0) break;

    if (active.hp > 0) {
      tickFor(active, 'turnEnd');
      tickFor(enemy, 'turnEnd');
      noteFrenzy();
      if (enemy.hp <= 0) break;
    }

    if (active.hp <= 0) {
      say(`${active.name} faints.`);
      const idx = team.findIndex((c) => c.hp > 0);
      if (idx < 0) return { win: false, turns, aliveLeft: 0, teamHpLeft: 0 };
      active = team[idx];
      say(`-> send out ${active.name}`);
    }
  }
  return { win: true, turns, survivorHp: active.hp, aliveLeft: alive(), teamHpLeft: teamHpLeft() };
}

// ---- teams (realistic raised kits: a Lv7+ Mireling KNOWS Blightspore) ----------
function raisedMireling(level) {
  const c = makeCreature('Mireling', level);
  if (level >= 7) c.moves.push(mv('Blightspore'));
  return c;
}
const TEAMS = {
  'Ember-only: Slagling Lv8': () => [makeCreature('Slagling', 8)],
  'Ember-only: Forgewrought Lv9': () => [makeCreature('Forgewrought', 9)],
  'Ember-only: Forgewrought Lv10': () => [makeCreature('Forgewrought', 10)],
  'Bloom/Gale lead Mireling Lv10': () => [raisedMireling(10), makeCreature('Fenmoth', 10)],
  'Bloom/Gale lead Fenmoth Lv10': () => [makeCreature('Fenmoth', 10), raisedMireling(10)],
  'Diverse 4 Lv8': () => [raisedMireling(8), makeCreature('Fenmoth', 8), makeCreature('Marrowling', 8), makeCreature('Sistern', 8)],
  'Diverse 4 Lv10': () => [raisedMireling(10), makeCreature('Fenmoth', 10), makeCreature('Marrowling', 10), makeCreature('Sistern', 10)],
  'Ossclad solo Lv10': () => [makeCreature('Ossclad', 10)],
  'Forgewrought+Ossclad Lv10': () => [makeCreature('Forgewrought', 10), makeCreature('Ossclad', 10)],
};

const TRIALS = 2000;
function evalTeam(boss, makeTeam, policy) {
  let wins = 0, sumTeam = 0, worstTeam = Infinity, sumTurns = 0, sumAlive = 0, teamSize = 0;
  for (let i = 0; i < TRIALS; i++) {
    const t = makeTeam();
    teamSize = t.length;
    const r = simBattle(t, boss, policy);
    if (r.win) {
      wins++; sumTeam += r.teamHpLeft; sumTurns += r.turns; sumAlive += r.aliveLeft;
      worstTeam = Math.min(worstTeam, r.teamHpLeft);
    }
  }
  return {
    wr: (wins / TRIALS) * 100, teamSize,
    avgTeam: wins ? +(sumTeam / wins).toFixed(1) : '-',
    worstTeam: wins ? worstTeam : '-',
    avgTurns: wins ? +(sumTurns / wins).toFixed(1) : '-',
    avgAlive: wins ? +(sumAlive / wins).toFixed(2) : '-',
  };
}

function suite(policyName, policy) {
  const boss = makeBoss('BarrowKing');
  console.log(`=== (B) BARROW-KING (shipped HP${boss.maxHp} Atk${boss.atk} Def${boss.def}, UNCHANGED) — ${policyName} ===`);
  for (const name of Object.keys(TEAMS)) {
    const r = evalTeam(boss, TEAMS[name], policy);
    console.log(
      `  ${name.padEnd(30)} win ${String(r.wr.toFixed(1)).padStart(5)}%  ` +
      `teamHPleft ${String(r.avgTeam).padStart(5)} (worst ${String(r.worstTeam).padStart(3)})  ` +
      `turns ${String(r.avgTurns).padStart(4)}  aliveLeft ${r.avgAlive}/${r.teamSize}`
    );
  }
  console.log('');
}

// ---- run -----------------------------------------------------------------------
selfTest();
suite('CANONICAL max-damage play (the verified baseline)', CANONICAL);
suite('SEEKER status-fishing play (the new tech ceiling)', SEEKER);

console.log('=== (B) TRACE — seeker duo (lead Mireling w/ Blightspore) vs the King ===');
simBattle(TEAMS['Bloom/Gale lead Mireling Lv10'](), makeBoss('BarrowKing'), SEEKER, true);
