// PHASE5 tuning sim. Reuses the REAL game modules (combat math, type wheel, per-stat
// scaling, XP curve) so what we tune here is exactly what ships. Replicates
// BattleScene's turn resolution: player-acts-first-by-Spd, enemy picks max-damage move,
// Lifedrain heals a fraction of boss damage (escalating <=50% HP), swap costs a turn,
// faint -> send next. No Phaser, no DOM — these modules are pure.
//
// Run:  node scripts/sim-phase5.mjs
//
// Purposes:
//   (A) XP pacing — how many wild wins to take the starter from Lv5 to the cap.
//   (B) Barrow-King re-tune — sweep boss stats vs level-capped teams; report win/loss.

import { SPECIES, makeCreature, gainCreatureXp } from '../src/data/creatures.js';
import { computeDamage, playerActsFirst, chooseEnemyMove } from '../src/systems/combat.js';
import {
  statAtLevel, xpToNext, xpForDefeat, GROWTH, XP_CURVE_A, BASE_XP, BASE_LEVEL_CAP,
} from '../src/systems/progression.js';

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

// ---- A player that plays the wheel: best available move each turn, no mid-fight swaps
//      (swapping vs a drain boss just donates a free healing hit), faint -> next alive. ---
function bestMove(attacker, defender) {
  let best = attacker.moves[0], bestDmg = -1;
  for (const m of attacker.moves) {
    const d = computeDamage(attacker, m, defender);
    if (d > bestDmg) { best = m; bestDmg = d; }
  }
  return best;
}

// Simulate one boss battle. team = array of fresh creature instances (full HP).
// Returns { win, turns, survivorHp, survivorMax, survivorName, aliveLeft, teamHpLeft }.
// trace=true prints a blow-by-blow (drain + frenzy visible), mirroring BattleScene.
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

// ---- (A) XP pacing ----------------------------------------------------------
function pacingReport() {
  console.log('\n=== (A) XP PACING ===');
  console.log(`GROWTH=${GROWTH}  XP_CURVE_A=${XP_CURVE_A}  BASE_XP=${BASE_XP}  base cap=${BASE_LEVEL_CAP}`);
  console.log('\nxpToNext(L) and cumulative XP from Lv5:');
  let cum = 0;
  for (let L = 5; L <= 14; L++) {
    cum += xpToNext(L);
    console.log(`  Lv${L}->${L + 1}: ${String(xpToNext(L)).padStart(4)}   cumulative from 5: ${String(cum).padStart(5)}`);
  }
  // Battles-to-cap: shared XP, so count battles (party levels together). A "typical" grind
  // mixes route (~Lv4) and cave (~Lv5-6) wilds. Model a single lead creature 5 -> cap 10.
  for (const enemyLv of [4, 5, 6]) {
    const per = xpForDefeat(enemyLv);
    const c = makeCreature('Slagling', 5);
    let battles = 0;
    while (c.level < BASE_LEVEL_CAP && battles < 999) { gainCreatureXp(c, per, BASE_LEVEL_CAP); battles++; }
    console.log(`  vs Lv${enemyLv} wilds (${per} XP each): ${battles} wins to reach cap ${BASE_LEVEL_CAP}`);
  }
  // Boss XP as a milestone chunk.
  console.log(`  Barrow-King (Lv18) grants ${xpForDefeat(18)} XP on defeat (milestone bump).`);

  // Stat feel at key levels for each species.
  console.log('\nScaled stats (base -> Lv10 cap -> Lv15 cap):');
  for (const key of Object.keys(SPECIES)) {
    const s = SPECIES[key];
    const at = (L) => `${statAtLevel(s.hp, L)}/${statAtLevel(s.atk, L)}/${statAtLevel(s.def, L)}/${statAtLevel(s.spd, L)}`;
    console.log(`  ${key.padEnd(10)} base ${s.hp}/${s.atk}/${s.def}/${s.spd}  ->L10 ${at(10)}  ->L15 ${at(15)}`);
  }
}

// ---- (B) Boss tuning --------------------------------------------------------
// Combat is deterministic bar RNG tie-breaks, so a few hundred trials fully characterize
// an outcome; we report win%, survivor HP, and TOTAL team HP left (a better "tense" metric
// than survivor HP alone, since a fresh cleanup creature can finish untouched).
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

// Teams. Bloom/Gale tested in BOTH lead orders — a real player might lead either, and the
// deterministic outcome can differ, so a robust boss must land the intent for both.
const TEAMS = (lvl) => ({
  'Ember-only (Slagling x1)': () => team([['Slagling', lvl]]),
  'Ember-only (Slagling x3)': () => team([['Slagling', lvl], ['Slagling', lvl], ['Slagling', lvl]]),
  'Bloom/Gale lead Mireling': () => team([['Mireling', lvl], ['Fenmoth', lvl]]),
  'Bloom/Gale lead Fenmoth': () => team([['Fenmoth', lvl], ['Mireling', lvl]]),
  'Diverse 4-team': () => team([['Mireling', lvl], ['Fenmoth', lvl], ['Marrowling', lvl], ['Sistern', lvl]]),
});

function row(label, r) {
  console.log(
    `  ${label.padEnd(26)} win ${String(r.wr.toFixed(1)).padStart(5)}%  ` +
    `survivorHP ${String(r.avgSurv).padStart(5)} (worst ${String(r.worstSurv).padStart(3)})  ` +
    `teamHPleft ${String(r.avgTeam).padStart(5)} (worst ${String(r.worstTeam).padStart(3)})  ` +
    `turns ${String(r.avgTurns).padStart(4)}  aliveLeft ${r.avgAlive}/${r.teamSize}`
  );
}

function sweep() {
  console.log('\n=== (B) BARROW-KING SWEEP (canonical Bloom/Gale 2-team at cap Lv10) ===');
  console.log('  target: Ember-only loses 100%, both Bloom/Gale lead orders win 100%, finish LOW\n');
  for (const def of [10, 11, 12]) {
    for (const hp of [100, 110, 120, 130]) {
      for (const atk of [11, 12, 13, 14, 15]) {
        const boss = makeBossParams({ hp, atk, def });
        const T = TEAMS(10);
        const ember = evalBoss(boss, T['Ember-only (Slagling x1)']);
        const bgM = evalBoss(boss, T['Bloom/Gale lead Mireling']);
        const bgF = evalBoss(boss, T['Bloom/Gale lead Fenmoth']);
        const bothWin = bgM.wr >= 99.9 && bgF.wr >= 99.9;
        const worstTeam = Math.min(bgM.worstTeam, bgF.worstTeam);
        const flag = ember.wr === 0 && bothWin ? ' <== candidate' : '';
        if (ember.wr === 0 && (bothWin || (bgM.wr > 0 && bgF.wr > 0)))
          console.log(
            `  HP${hp} Atk${atk} Def${def} | ember ${ember.wr.toFixed(0)}% | ` +
            `BG(Mire) ${bgM.wr.toFixed(0)}% teamHP ${bgM.avgTeam}/${'?'} | ` +
            `BG(Fen) ${bgF.wr.toFixed(0)}% teamHP ${bgF.avgTeam} | worstTeamHP ${worstTeam}${flag}`
          );
      }
    }
  }
}

function detail(boss) {
  console.log('\n=== (B) CANDIDATE — full win/loss table ===');
  console.log(`  Boss: HP${boss.maxHp} Atk${boss.atk} Def${boss.def} Spd${boss.spd}  moves 7/6  drain ${boss.drain.above}/${boss.drain.below}`);
  for (const lvl of [8, 10]) {
    console.log(`\n  -- player teams at Lv${lvl} (pre-boss cap = 10) --`);
    const T = TEAMS(lvl);
    for (const label of Object.keys(T)) row(label, evalBoss(boss, T[label]));
  }
}

function traceOne(boss, lvl = 10) {
  console.log(`\n=== (B) TRACE — Bloom/Gale (lead Mireling) vs candidate at Lv${lvl} ===`);
  simBattle(team([['Mireling', lvl], ['Fenmoth', lvl]]), boss, true);
}

pacingReport();
if (process.argv.includes('--sweep')) sweep();
// Finalists — want: Ember-only loses at every level; Bloom/Gale (either lead) wins at both
// Lv8 (under cap, "type beats levels") and Lv10, finishing LOW; frenzy visible on the
// fragile finisher. Compare a few before locking.
for (const p of [
  { hp: 100, atk: 12, def: 11 },
  { hp: 105, atk: 13, def: 12 },
  { hp: 108, atk: 13, def: 12 },
]) {
  detail(makeBossParams(p));
}
const CANDIDATE = makeBossParams({ hp: 105, atk: 13, def: 12 });
traceOne(CANDIDATE, 10);
traceOne(CANDIDATE, 8);
