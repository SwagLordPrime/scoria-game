// PHASE8 verification sim — the Arcane Expansion substrate. Reuses the REAL game
// modules. Three jobs:
//
//   (A) 7-type chart unit test — every one of the 49 pairs (+ the Neutral row) checked
//       against a HAND-WRITTEN expected matrix (not derived from BEATS, so a chart bug
//       can't hide behind its own data). Shrug ×0.85 and Umbra↔Aether mutual ×1.5.
//   (B) Substrate checks — Mag on every species/boss and through level/evolution, move
//       kinds (all physical except Toll), magic damage routing off Mag, Burn nerfing
//       physical ONLY, role registry (Sorcerer + Battle Mage valid, species validated).
//   (C) Barrow-King suite re-run (boss numbers UNCHANGED) — canonical + seeker policies,
//       same teams as Phase 7; expected identical except tiny drift in Sistern comps
//       from Toll's conversion (magic @ Mag 10 > physical @ Atk 8). Report, don't tune.
//
// Run:  node scripts/sim-phase8.mjs

import { SPECIES, makeCreature, gainCreatureXp } from '../src/data/creatures.js';
import { MOVES, mv } from '../src/data/moves.js';
import { makeBoss } from '../src/data/bosses.js';
import { TYPES, typeMultiplier, MULT } from '../src/data/types.js';
import { ROLES } from '../src/data/roles.js';
import { computeDamage, playerActsFirst, chooseEnemyMove, effectiveness } from '../src/systems/combat.js';
import { applyStatus, tryApplyStatus, tickStatuses, clearStatuses, hasStatus, healingReceivedMod } from '../src/systems/status.js';
import { statAtLevel } from '../src/systems/progression.js';

let failures = 0;
function check(label, cond) {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failures++;
}

// ---- (A) the full chart, hand-written ----------------------------------------
// Rows = attacker, cols = defender, order: Ember Bloom Gale Cinder Tide Umbra Aether.
const S = MULT.super, N = MULT.neutral, H = MULT.shrug, R = MULT.resist;
const EXPECTED = {
  Ember:  { Ember: N, Bloom: S, Gale: S, Cinder: R, Tide: R, Umbra: H, Aether: H },
  Bloom:  { Ember: R, Bloom: N, Gale: S, Cinder: S, Tide: R, Umbra: H, Aether: H },
  Gale:   { Ember: R, Bloom: R, Gale: N, Cinder: S, Tide: S, Umbra: H, Aether: H },
  Cinder: { Ember: S, Bloom: R, Gale: R, Cinder: N, Tide: S, Umbra: H, Aether: H },
  Tide:   { Ember: S, Bloom: S, Gale: R, Cinder: R, Tide: N, Umbra: H, Aether: H },
  Umbra:  { Ember: N, Bloom: N, Gale: N, Cinder: N, Tide: N, Umbra: N, Aether: S },
  Aether: { Ember: N, Bloom: N, Gale: N, Cinder: N, Tide: N, Umbra: S, Aether: N },
};

function chartTest() {
  console.log('=== (A) 7-TYPE CHART — 49 pairs + Neutral row vs hand-written matrix ===');
  let bad = [];
  for (const atk of TYPES) {
    for (const def of TYPES) {
      const got = typeMultiplier(atk, def);
      if (got !== EXPECTED[atk][def]) bad.push(`${atk}->${def}: got ${got}, want ${EXPECTED[atk][def]}`);
    }
    if (typeMultiplier('Neutral', atk) !== 1) bad.push(`Neutral->${atk}: not x1`);
  }
  check(`all 49 typed pairs match (+7 Neutral) — shrug x0.85, mutual exotic x1.5`, bad.length === 0);
  if (bad.length) for (const b of bad) console.log('        ' + b);
  check('effectiveness tiers: super/neutral/shrug/resist', (
    effectiveness({ type: 'Umbra' }, { type: 'Aether' }) === 'super' &&
    effectiveness({ type: 'Ember' }, { type: 'Umbra' }) === 'shrug' &&
    effectiveness({ type: 'Ember' }, { type: 'Tide' }) === 'resist' &&
    effectiveness({ type: 'Umbra' }, { type: 'Ember' }) === 'neutral'
  ));
}

// ---- (B) substrate ------------------------------------------------------------
function substrateTest() {
  console.log('\n=== (B) MAG / KINDS / ROLES SUBSTRATE ===');

  // Mag everywhere, scaled like the rest.
  const magOk = Object.keys(SPECIES).every((k) => {
    const c = makeCreature(k, 10);
    return Number.isInteger(SPECIES[k].mag) && c.mag === statAtLevel(SPECIES[k].mag, 10);
  });
  check('every species has a Mag base and instances scale it via statAtLevel', magOk);
  const sist = makeCreature('Sistern', 10);
  check(`Sistern Lv10 is the proto-caster: Mag ${sist.mag} > Atk ${sist.atk}`, sist.mag === 16 && sist.atk === 13);
  const king = makeBoss('BarrowKing');
  check(`Barrow-King carries inert Mag ${king.mag}; both boss moves physical`,
    king.mag === 6 && king.moves.every((m) => m.kind === 'physical'));

  // Mag through level-ups and evolution.
  {
    const c = makeCreature('Slagling', 8);
    const magAt8 = c.mag;
    let res;
    while (c.level < 9) res = gainCreatureXp(c, 40, 10);
    const evo = res.events.find((e) => e.kind === 'evolved');
    check(`Mag levels and jumps on evolution (Slagling ${magAt8} -> Forgewrought ${c.mag}, evo gain +${evo?.gains.mag})`,
      c.mag === statAtLevel(SPECIES.Forgewrought.mag, 9) && evo && typeof evo.gains.mag === 'number');
  }

  // Kinds. At Phase 8 exactly ONE magic move shipped — Toll — and this row froze that
  // count. The roster has grown past it since (P9's exotic kits, P11's control carriers,
  // P12's Gloam), so the count is retired and the standing invariants stay: every move
  // declares a kind, and Toll is still the magic move this phase's numbers were tuned on.
  // STALE-FIXTURE REPAIR (P12): this row had been red since P11 landed Undertoll/Lull —
  // a bookkeeping failure, never a behaviour one. The magic roster is asserted EXACTLY
  // in sim-phase9, which is the right home for it.
  const magicMoves = Object.entries(MOVES).filter(([, d]) => d.kind === 'magic').map(([n]) => n);
  check(`every move declares a kind; Toll is magic (roster has since grown to [${magicMoves.join(', ')}])`,
    Object.values(MOVES).every((d) => d.kind === 'physical' || d.kind === 'magic') &&
    MOVES.Toll.kind === 'magic');
  check('mv() carries kind onto instances', mv('Toll').kind === 'magic' && mv('Ram').kind === 'physical');

  // Damage routing: Toll reads Mag, physical reads Atk. Neutral-type dummy avoids
  // multiplier noise (def 12, type Tide vs Sistern's own moves: Toll is Neutral x1).
  {
    const dummy = { name: 'dummy', type: 'Tide', def: 12, hp: 50, maxHp: 50 };
    const toll = computeDamage(sist, sist.moves[1], dummy); // Toll: floor(16*4/12) = 5
    const douse = computeDamage(sist, sist.moves[0], dummy); // Douse Tide vs Tide x1: floor(13*5/12) = 5
    check(`Toll routes off Mag: ${toll} = floor(16*4/12); Douse off Atk: ${douse} = floor(13*5/12)`,
      toll === 5 && douse === 5);
    applyStatus(sist, 'Burn'); // -Atk only
    const tollBurned = computeDamage(sist, sist.moves[1], dummy);
    const douseBurned = computeDamage(sist, sist.moves[0], dummy); // eff atk floor(13*.75)=9 -> floor(9*5/12)=3
    check(`Burn nerfs PHYSICAL only: Douse ${douse}->${douseBurned}, Toll ${toll}->${tollBurned} (unchanged)`,
      douseBurned === 3 && tollBurned === toll);
    clearStatuses(sist);
  }

  // Roles: the six registered, incl. the arcane two; species all validate.
  check('ROLES registers 6 incl. Sorcerer + Battle Mage',
    Object.keys(ROLES).length === 6 && !!ROLES.Sorcerer && !!ROLES['Battle Mage'] && !!ROLES.Trickster);
  check('every shipped species carries a registered role (makeCreature validates loudly)',
    Object.keys(SPECIES).every((k) => !!ROLES[SPECIES[k].role]));
}

// ---- (C) Barrow-King suite (identical harness to sim-phase7) -------------------
function bestMove(attacker, defender) {
  let best = attacker.moves[0], bestDmg = -1;
  for (const m of attacker.moves) {
    const d = computeDamage(attacker, m, defender);
    if (d > bestDmg) { best = m; bestDmg = d; }
  }
  return best;
}
const CANONICAL = (active, enemy) => bestMove(active, enemy);
const SEEKER = (active, enemy) => {
  const fish = active.moves.filter((m) => m.applies && !hasStatus(enemy, m.applies.status));
  if (fish.length) return fish.reduce((a, b) => (computeDamage(active, a, enemy) >= computeDamage(active, b, enemy) ? a : b));
  return bestMove(active, enemy);
};

function simBattle(team, boss, policy) {
  const enemy = { ...boss, hp: boss.maxHp, moves: boss.moves.map((m) => ({ ...m })), statuses: [] };
  for (const c of team) c.statuses = [];
  let active = team[0];
  let turns = 0;
  const alive = () => team.filter((c) => c.hp > 0).length;
  const teamHpLeft = () => team.reduce((s, c) => s + Math.max(0, c.hp), 0);

  const tickFor = (c, trigger) => { tickStatuses(c, trigger); };
  const hitEffects = (user, move, dmg, target) => {
    if (move.recoil && dmg > 0) user.hp = Math.max(0, user.hp - Math.max(1, Math.floor(move.recoil * dmg)));
    tryApplyStatus(target, move.applies);
  };
  const playerAttack = (move) => {
    const d = computeDamage(active, move, enemy);
    enemy.hp = Math.max(0, enemy.hp - d);
    hitEffects(active, move, d, enemy);
    tickFor(active, 'onAction');
  };
  const enemyStrike = () => {
    const em = chooseEnemyMove(enemy, active);
    const d = computeDamage(enemy, em, active);
    active.hp = Math.max(0, active.hp - d);
    if (d > 0) {
      const belowHalf = enemy.hp <= enemy.maxHp * enemy.drain.threshold;
      const healed = Math.floor((belowHalf ? enemy.drain.below : enemy.drain.above) * d * healingReceivedMod(enemy));
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + healed);
    }
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
      if (enemy.hp <= 0) break;
    }
    if (active.hp <= 0) {
      const idx = team.findIndex((c) => c.hp > 0);
      if (idx < 0) return { win: false, turns, aliveLeft: 0, teamHpLeft: 0 };
      active = team[idx];
    }
  }
  return { win: true, turns, aliveLeft: alive(), teamHpLeft: teamHpLeft() };
}

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

// Phase-7 published results, for the drift report (win% / avg teamHP left / avg turns).
const PHASE7 = {
  CANONICAL: {
    'Ember-only: Slagling Lv8': [0, '-', '-'], 'Ember-only: Forgewrought Lv9': [0, '-', '-'],
    'Ember-only: Forgewrought Lv10': [0, '-', '-'],
    'Bloom/Gale lead Mireling Lv10': [100, 12, 13], 'Bloom/Gale lead Fenmoth Lv10': [100, 8, 13],
    'Diverse 4 Lv8': [0, '-', '-'], 'Diverse 4 Lv10': [100, 112, 13],
    'Ossclad solo Lv10': [100, 38.3, 6.8], 'Forgewrought+Ossclad Lv10': [100, 63, 13],
  },
  SEEKER: {
    'Ember-only: Slagling Lv8': [0, '-', '-'], 'Ember-only: Forgewrought Lv9': [0, '-', '-'],
    'Ember-only: Forgewrought Lv10': [0, '-', '-'],
    'Bloom/Gale lead Mireling Lv10': [98.9, 39.2, 9], 'Bloom/Gale lead Fenmoth Lv10': [97.6, 19.4, 10.4],
    'Diverse 4 Lv8': [99.6, 97.6, 11], 'Diverse 4 Lv10': [100, 137.9, 9.2],
    'Ossclad solo Lv10': [100, 36.8, 6.8], 'Forgewrought+Ossclad Lv10': [100, 63, 13],
  },
};

const TRIALS = 2000;
function suite(policyName, policy) {
  const boss = makeBoss('BarrowKing');
  console.log(`\n=== (C) BARROW-KING (HP${boss.maxHp} Atk${boss.atk} Def${boss.def} — UNCHANGED) — ${policyName} ===`);
  for (const name of Object.keys(TEAMS)) {
    let wins = 0, sumTeam = 0, sumTurns = 0, sumAlive = 0, teamSize = 0;
    for (let i = 0; i < TRIALS; i++) {
      const t = TEAMS[name]();
      teamSize = t.length;
      const r = simBattle(t, boss, policy);
      if (r.win) { wins++; sumTeam += r.teamHpLeft; sumTurns += r.turns; sumAlive += r.aliveLeft; }
    }
    const wr = (wins / TRIALS) * 100;
    const avgTeam = wins ? +(sumTeam / wins).toFixed(1) : '-';
    const avgTurns = wins ? +(sumTurns / wins).toFixed(1) : '-';
    const p7 = PHASE7[policyName.startsWith('CANONICAL') ? 'CANONICAL' : 'SEEKER'][name];
    console.log(
      `  ${name.padEnd(30)} win ${String(wr.toFixed(1)).padStart(5)}%  teamHPleft ${String(avgTeam).padStart(5)}  ` +
      `turns ${String(avgTurns).padStart(4)}  aliveLeft ${(wins ? (sumAlive / wins).toFixed(2) : '-')}/${teamSize}` +
      `   [P7: ${p7[0]}% / ${p7[1]} / ${p7[2]}]`
    );
  }
}

// ---- run -----------------------------------------------------------------------
chartTest();
substrateTest();
console.log(failures ? `\n  *** ${failures} FAILURE(S) ***` : '\n  all substrate checks pass');
suite('CANONICAL max-damage play', CANONICAL);
suite('SEEKER status-fishing play', SEEKER);
