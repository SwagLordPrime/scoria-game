// PHASE6 tuning + verification sim. Reuses the REAL game modules (creatures incl.
// evolution/learnsets, combat math, type wheel, per-stat scaling, XP curve) so what we
// verify here is exactly what ships. Two jobs:
//
//   (A) Evolution & move-learning engine self-test — grind real creatures through the
//       real gainCreatureXp and assert the PHASE6 rules: evo at Lv9/Lv15, stat jumps,
//       slot caps 2→3→4, innate learns, replace-prompt ('pending') events, chained
//       multi-level awards, and the legacy-save catch-up path.
//   (B) Barrow-King re-verify (PHASE6 §2.4) — evolved forms reachable pre-boss
//       (Forgewrought/Ossclad at cap Lv10) join the pool. Intent to confirm:
//       Ember-only lead LOSES; Bloom/Gale duo WINS tensely (both lead orders).
//
// Run:  node scripts/sim-phase6.mjs [--sweep]
//
// Battle replication matches BattleScene: player-acts-first-by-Spd, enemy picks
// max-damage move, Lifedrain heals a fraction of boss damage (escalating <=50% HP),
// faint -> next alive with NO free enemy hit (forced swap), no mid-fight swaps.

import { SPECIES, makeCreature, gainCreatureXp, speciesSlots } from '../src/data/creatures.js';
import { computeDamage, playerActsFirst, chooseEnemyMove } from '../src/systems/combat.js';
import { statAtLevel, xpForDefeat, BASE_LEVEL_CAP } from '../src/systems/progression.js';

// ---- (A) Evolution & move-learning self-test --------------------------------
let failures = 0;
function check(label, cond) {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failures++;
}
const names = (c) => c.moves.map((m) => m.name).join(', ');

function selfTest() {
  console.log('\n=== (A) EVOLUTION / MOVE-LEARNING ENGINE SELF-TEST ===');

  // A1: Slagling line, level-by-level grind to the post-boss cap 15.
  {
    const c = makeCreature('Slagling', 5);
    check(`Slagling starts with 2 moves in 2 slots (${names(c)})`, c.moves.length === 2 && speciesSlots(c.species) === 2);
    const seen = [];
    while (c.level < 15) {
      const res = gainCreatureXp(c, 40, 15);
      for (const e of res.events) seen.push(e);
    }
    const evos = seen.filter((e) => e.kind === 'evolved');
    check(`evolves twice: ${evos.map((e) => `${e.from}->${e.to}@${e.atLevel}`).join(', ')}`,
      evos.length === 2 && evos[0].to === 'Forgewrought' && evos[0].atLevel === 9 &&
      evos[1].to === 'Warkiln' && evos[1].atLevel === 15);
    check(`evo stat jumps are real (+HP ${evos[0]?.gains.hp}, +Atk ${evos[0]?.gains.atk} at first evo)`,
      evos[0] && evos[0].gains.hp > 10 && evos[0].gains.atk > 0);
    const learned = seen.filter((e) => e.kind === 'learned').map((e) => e.move.name);
    const pending = seen.filter((e) => e.kind === 'pending').map((e) => e.move.name);
    check(`learns Cinderclad + Kiln Burst into opened slots (${learned.join(', ')})`,
      learned.includes('Cinderclad') && learned.includes('Kiln Burst'));
    check(`Overheat Slam hits a FULL set -> replace-prompt event (pending: ${pending.join(', ')})`,
      pending.length === 1 && pending[0] === 'Overheat Slam');
    check(`final: Warkiln Lv15, 4/4 moves (${names(c)})`,
      c.species === 'Warkiln' && c.level === 15 && c.moves.length === 4 && speciesSlots(c.species) === 4);
    const w = SPECIES.Warkiln;
    check(`Warkiln Lv15 stats scale off the NEW base (HP ${c.maxHp}=${statAtLevel(w.hp, 15)})`,
      c.maxHp === statAtLevel(w.hp, 15) && c.atk === statAtLevel(w.atk, 15) &&
      c.def === statAtLevel(w.def, 15) && c.spd === statAtLevel(w.spd, 15));
  }

  // A2: Marrowling line, one giant award (Lv5 -> 15) — chained evolutions in one gain.
  {
    const c = makeCreature('Marrowling', 5);
    const res = gainCreatureXp(c, 100000, 15);
    const evos = res.events.filter((e) => e.kind === 'evolved');
    const pending = res.events.filter((e) => e.kind === 'pending').map((e) => e.move.name);
    check(`one big award chains Marrowling->Ossclad@9->Bonemarch@15 (${evos.map((e) => e.to).join(', ')})`,
      c.species === 'Bonemarch' && evos.length === 2 && evos[0].atLevel === 9 && evos[1].atLevel === 15);
    check(`ends with Marrow Spikes + Grave Toll learned, Ossuary Crash pending (${names(c)} | pending: ${pending.join(', ')})`,
      c.moves.some((m) => m.name === 'Marrow Spikes') && c.moves.some((m) => m.name === 'Grave Toll') &&
      pending.length === 1 && pending[0] === 'Ossuary Crash');
  }

  // A3: pre-boss cap 10 — evolution at 9 happens, second evo does NOT (cap blocks Lv15).
  {
    const c = makeCreature('Slagling', 5);
    while (c.level < BASE_LEVEL_CAP) gainCreatureXp(c, 40, BASE_LEVEL_CAP);
    check(`under cap 10 the starter reaches Forgewrought (not Warkiln): ${c.species} Lv${c.level}`,
      c.species === 'Forgewrought' && c.level === 10);
  }

  // A4: legacy-save catch-up — a Lv10 Slagling (pre-PHASE6 save shape) evolves on its
  // next XP award even though it is AT the cap and cannot level.
  {
    const c = makeCreature('Slagling', 10);
    const res = gainCreatureXp(c, 10, 10);
    check(`capped Lv10 Slagling still evolves on next XP (atCap=${res.atCap}): -> ${c.species}, learned ${names(c)}`,
      res.atCap && c.species === 'Forgewrought' && c.moves.some((m) => m.name === 'Cinderclad'));
  }

  console.log(failures ? `\n  *** ${failures} FAILURE(S) ***` : '\n  all engine checks pass');
}

// ---- Boss instance from parameters (mirrors makeBoss shape) -----------------
function makeBossParams({ hp, atk, def, spd = 4, drain = { above: 0.33, below: 0.43, threshold: 0.5 } }) {
  return {
    species: 'BarrowKing', name: 'The Barrow-King', type: 'Cinder', role: 'Bruiser',
    level: 18, maxHp: hp, hp, atk, def, spd,
    moves: [
      { name: 'Marrow Drain', type: 'Cinder', power: 7 },
      { name: 'Grave Sunder', type: 'Neutral', power: 6 },
    ],
    isBoss: true, drain: { ...drain },
  };
}

function bestMove(attacker, defender) {
  let best = attacker.moves[0], bestDmg = -1;
  for (const m of attacker.moves) {
    const d = computeDamage(attacker, m, defender);
    if (d > bestDmg) { best = m; bestDmg = d; }
  }
  return best;
}

function simBattle(team, boss, trace = false) {
  const enemy = { ...boss, hp: boss.maxHp };
  let active = team[0];
  let turns = 0;
  let frenzy = false;
  const alive = () => team.filter((c) => c.hp > 0).length;
  const teamHpLeft = () => team.reduce((s, c) => s + Math.max(0, c.hp), 0);
  const say = (m) => { if (trace) console.log('    ' + m); };

  const noteFrenzy = () => {
    if (!frenzy && enemy.hp <= enemy.maxHp * enemy.drain.threshold) {
      frenzy = true; say('*** feeding frenzy — the King drops below half ***');
    }
  };
  const enemyStrike = () => {
    const em = chooseEnemyMove(enemy, active);
    const d = computeDamage(enemy, em, active);
    active.hp = Math.max(0, active.hp - d);
    noteFrenzy();
    let healed = 0;
    if (d > 0) {
      const belowHalf = enemy.hp <= enemy.maxHp * enemy.drain.threshold;
      healed = Math.floor((belowHalf ? enemy.drain.below : enemy.drain.above) * d);
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + healed);
    }
    say(`King ${em.name} -> ${active.name} -${d}${healed ? ` (drains +${healed})` : ''}   [King ${enemy.hp}/${enemy.maxHp}, ${active.name} ${active.hp}/${active.maxHp}]`);
  };
  const playerAttack = (move) => {
    const d = computeDamage(active, move, enemy);
    enemy.hp = Math.max(0, enemy.hp - d);
    noteFrenzy();
    say(`${active.name} ${move.name} -> King -${d}   [King ${enemy.hp}/${enemy.maxHp}]`);
  };

  while (true) {
    turns++;
    if (turns > 500) return { win: false, turns, survivorHp: 0, aliveLeft: alive(), teamHpLeft: 0, note: 'stall' };
    const move = bestMove(active, enemy);

    if (playerActsFirst(active, enemy)) {
      playerAttack(move);
      if (enemy.hp <= 0) break;
      enemyStrike();
    } else {
      enemyStrike();
      if (active.hp > 0) { playerAttack(move); if (enemy.hp <= 0) break; }
    }

    if (active.hp <= 0) {
      say(`${active.name} faints.`);
      const idx = team.findIndex((c) => c.hp > 0);
      if (idx < 0) return { win: false, turns, survivorHp: 0, aliveLeft: 0, teamHpLeft: 0 };
      active = team[idx];
      say(`-> send out ${active.name}`);
    }
  }
  return {
    win: true, turns,
    survivorHp: active.hp, survivorMax: active.maxHp, survivorName: active.name,
    aliveLeft: alive(), teamHpLeft: teamHpLeft(),
  };
}

function team(specsAtLevel) {
  return specsAtLevel.map(([s, l]) => makeCreature(s, l));
}

const TRIALS = 1500;

function evalBoss(boss, makeTeam) {
  let wins = 0, sumSurv = 0, worstSurv = Infinity, sumTeam = 0, worstTeam = Infinity,
      sumTurns = 0, sumAlive = 0, teamSize = 0;
  for (let i = 0; i < TRIALS; i++) {
    const t = makeTeam();
    teamSize = t.length;
    const r = simBattle(t, boss);
    if (r.win) {
      wins++; sumSurv += r.survivorHp; sumTurns += r.turns; sumAlive += r.aliveLeft; sumTeam += r.teamHpLeft;
      worstSurv = Math.min(worstSurv, r.survivorHp); worstTeam = Math.min(worstTeam, r.teamHpLeft);
    }
  }
  const wr = (wins / TRIALS) * 100;
  return {
    wr, teamSize,
    avgSurv: wins ? +(sumSurv / wins).toFixed(1) : '-',
    worstSurv: wins ? worstSurv : '-',
    avgTeam: wins ? +(sumTeam / wins).toFixed(1) : '-',
    worstTeam: wins ? worstTeam : '-',
    avgTurns: wins ? +(sumTurns / wins).toFixed(1) : '-',
    avgAlive: wins ? +(sumAlive / wins).toFixed(2) : '-',
  };
}

// PHASE6 team pool. Pre-boss cap is 10 and the first evo lands at 9, so a mono-Ember
// player ARRIVES with a Forgewrought (Slagling is not wild-catchable — the starter is the
// whole Ember pool). Ossclad = a caught Marrowling raised past 9 (a deliberate grind).
const TEAMS = {
  'Ember-only: Slagling Lv8': () => team([['Slagling', 8]]),
  'Ember-only: Forgewrought Lv9': () => team([['Forgewrought', 9]]),
  'Ember-only: Forgewrought Lv10': () => team([['Forgewrought', 10]]),
  'Bloom/Gale lead Mireling Lv10': () => team([['Mireling', 10], ['Fenmoth', 10]]),
  'Bloom/Gale lead Fenmoth Lv10': () => team([['Fenmoth', 10], ['Mireling', 10]]),
  'Diverse 4 Lv8': () => team([['Mireling', 8], ['Fenmoth', 8], ['Marrowling', 8], ['Sistern', 8]]),
  'Diverse 4 Lv10': () => team([['Mireling', 10], ['Fenmoth', 10], ['Marrowling', 10], ['Sistern', 10]]),
  'Ossclad solo Lv10': () => team([['Ossclad', 10]]),
  'Forgewrought+Ossclad Lv10': () => team([['Forgewrought', 10], ['Ossclad', 10]]),
};

function row(label, r) {
  console.log(
    `  ${label.padEnd(30)} win ${String(r.wr.toFixed(1)).padStart(5)}%  ` +
    `survivorHP ${String(r.avgSurv).padStart(5)} (worst ${String(r.worstSurv).padStart(3)})  ` +
    `teamHPleft ${String(r.avgTeam).padStart(5)} (worst ${String(r.worstTeam).padStart(3)})  ` +
    `turns ${String(r.avgTurns).padStart(4)}  aliveLeft ${r.avgAlive}/${r.teamSize}`
  );
}

function detail(boss, label = '') {
  console.log(`\n=== (B) BOSS ${label} — HP${boss.maxHp} Atk${boss.atk} Def${boss.def} Spd${boss.spd}  moves 7/6  drain ${boss.drain.above}/${boss.drain.below} ===`);
  for (const name of Object.keys(TEAMS)) row(name, evalBoss(boss, TEAMS[name]));
}

// Sweep: find params where the mono-Ember Forgewrought loses at 9 AND 10 while the
// Bloom/Gale duo still wins BOTH lead orders at the cap.
function sweep() {
  console.log('\n=== (B) SWEEP — target: Forgewrought solo 0% at Lv9+Lv10, duo 100% both orders ===');
  for (const def of [12]) {
    for (const hp of [100, 105, 110, 115]) {
      for (const atk of [13, 14, 15, 16, 17]) {
        const boss = makeBossParams({ hp, atk, def });
        const fw9 = evalBoss(boss, TEAMS['Ember-only: Forgewrought Lv9']);
        const fw10 = evalBoss(boss, TEAMS['Ember-only: Forgewrought Lv10']);
        const bgM = evalBoss(boss, TEAMS['Bloom/Gale lead Mireling Lv10']);
        const bgF = evalBoss(boss, TEAMS['Bloom/Gale lead Fenmoth Lv10']);
        const emberWalled = fw9.wr === 0 && fw10.wr === 0;
        const duoWins = bgM.wr >= 99.9 && bgF.wr >= 99.9;
        const flag = emberWalled && duoWins ? ' <== candidate' : '';
        console.log(
          `  HP${hp} Atk${atk} Def${def} | FW9 ${String(fw9.wr.toFixed(0)).padStart(3)}%  FW10 ${String(fw10.wr.toFixed(0)).padStart(3)}% | ` +
          `duo(M) ${String(bgM.wr.toFixed(0)).padStart(3)}% teamHP ${String(bgM.avgTeam).padStart(5)} | ` +
          `duo(F) ${String(bgF.wr.toFixed(0)).padStart(3)}% teamHP ${String(bgF.avgTeam).padStart(5)}${flag}`
        );
      }
    }
  }
}

function traceOne(boss, teamName) {
  console.log(`\n=== (B) TRACE — ${teamName} vs HP${boss.maxHp} Atk${boss.atk} Def${boss.def} ===`);
  simBattle(TEAMS[teamName](), boss, true);
}

// ---- run ---------------------------------------------------------------------
selfTest();

console.log('\nScaled stats of the evolution lines (Lv9 / Lv10 cap / Lv15 cap):');
for (const key of ['Slagling', 'Forgewrought', 'Warkiln', 'Marrowling', 'Ossclad', 'Bonemarch']) {
  const s = SPECIES[key];
  const at = (L) => `${statAtLevel(s.hp, L)}/${statAtLevel(s.atk, L)}/${statAtLevel(s.def, L)}/${statAtLevel(s.spd, L)}`;
  console.log(`  ${key.padEnd(12)} base ${s.hp}/${s.atk}/${s.def}/${s.spd}  ->L9 ${at(9)}  ->L10 ${at(10)}  ->L15 ${at(15)}`);
}
console.log(`  (Barrow-King grants ${xpForDefeat(18)} XP on defeat)`);

// The shipped Phase-5 boss, re-checked with evolved forms in the pool.
detail(makeBossParams({ hp: 105, atk: 13, def: 12 }), '(shipped Phase-5 tune)');

if (process.argv.includes('--sweep')) sweep();

// Finalists compared before locking. NOTE: the Phase-5 "diverse 4-team wins under-leveled
// (Lv8)" bonus dies under EVERY tune that walls the Lv10 Forgewrought (the wall needs
// HP>=~115 at Atk13, but Lv8 diversity is gone above ~HP105) — so it was not a
// discriminator. HP-only walls (115-120) leave the Ember wall one damage-floor from
// flipping (King at 5-8 HP when Forgewrought falls); Atk15 walls it with ~22 HP of margin
// because super-effective scaling taxes Ember ~2x per point vs the teams meant to win.
// LANDED: HP105 Atk15 Def12 (shipped in data/bosses.js).
for (const p of [
  { hp: 105, atk: 14, def: 12 },
  { hp: 105, atk: 15, def: 12 },
  { hp: 118, atk: 13, def: 12 },
]) {
  detail(makeBossParams(p), '(finalist)');
}

const CANDIDATE = makeBossParams({ hp: 105, atk: 15, def: 12 });
traceOne(CANDIDATE, 'Ember-only: Forgewrought Lv10');
traceOne(CANDIDATE, 'Bloom/Gale lead Mireling Lv10');
traceOne(CANDIDATE, 'Bloom/Gale lead Fenmoth Lv10');
