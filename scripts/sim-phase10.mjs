// PHASE10 verification sim — THE CHOICE AT THE TABLE. Reuses the REAL game modules.
// Jobs (build plan §8):
//
//   (A) Species integrity — the wolf line vs a HAND-WRITTEN table (stats/types/roles/
//       slots/kits/learnsets), 20 species total, and the two new moves in the shared
//       table, STATUS-FREE by design (the Phase-6/7 discipline).
//   (B) The pick contract — over a localStorage polyfill: New Game wakes in the
//       tavern with an EMPTY party and the choice OPEN (v4 saves never backfill);
//       bindStarter grants Lv5 full HP, seen+caught, unpicked UNSEEN; rival claims
//       are deterministic by canonical list order for all three picks; legacy (v<4)
//       saves backfill starterChoice=Slagling + rivals={a:Staticur,b:Marrowling}
//       with party/position untouched. Tavern fixtures: doorBlock + 3 cores + table.
//   (C) Evolution — Staticur pinned at the pre-boss cap 10 NEVER evolves (the
//       Staticur picker fights the gate pre-evolution, by design); under cap 15 it
//       evolves at 12, gains the 4th slot, learns Deadband Howl, stats land.
//   (D) Encounter tables — asserted byte-identical to Phase 9 (nothing wild carries
//       the wolf line; Staticur is the handler's to stake, ROSTER §7).
//   (E) The FULL Barrow-King suite re-run, boss numbers UNCHANGED, plus the P10
//       asymmetry rows: Slagling-solo 0% (hard, the existing lock), Marrowling
//       BASE-FORM solo <25% (the plan's medium row — see the report note: the
//       starter PATH reaches the gate evolved, and that row is the existing
//       Ossclad-solo 100% bar, which must ALSO hold), Staticur-solo (easy — the
//       ⚠ DETERMINISTIC-BAND row, see report), and the Staticur duos vs the
//       Bloom/Gale bars.
//   (F) Voltwraith@15 vs the post-boss wilds — REPORT ONLY (never tune wilds):
//       1v1 profile vs the Deep Hollow table, with Warkiln/Bonemarch Lv15 as the
//       peer baselines.
//
// Run:  node scripts/sim-phase10.mjs

import { SPECIES, makeCreature, gainCreatureXp, STARTER_CORES } from '../src/data/creatures.js';
import { MOVES, mv } from '../src/data/moves.js';
import { makeBoss } from '../src/data/bosses.js';
import { computeDamage, playerActsFirst, chooseEnemyMove } from '../src/systems/combat.js';
import {
  tryApplyStatus, resolveApplyTarget, tickStatuses, hasStatus, healingReceivedMod,
} from '../src/systems/status.js';
import { statAtLevel } from '../src/systems/progression.js';
import { MAPS } from '../src/data/maps/index.js';

let failures = 0;
function check(label, cond) {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failures++;
}

// ---- (A) the wolf line vs the hand-written roster ---------------------------------
// Staticur carries the sim-landed tune (atk 15 / def 8 — see the run log and the
// creatures.js note): the §3 bid (13/7) was a deterministic 0% at the gate.
const ROSTER10 = {
  //            hp  atk mag def spd  type    role       slots  kit
  Staticur:   [24, 15, 6,  8,  12, 'Gale', 'Striker', 3, ['Static Lash', 'Nip']],
  Voltwraith: [38, 20, 8,  10, 16, 'Gale', 'Striker', 4, ['Static Lash', 'Nip', 'Gust', 'Deadband Howl']],
};

function speciesTest() {
  console.log('=== (A) THE WOLF LINE (stats vs hand-written table) ===');
  check('the Numinary holds 20 species (18 held + the wolf line)', Object.keys(SPECIES).length === 20);

  let bad = [];
  for (const [key, [hp, atk, mag, def, spd, type, role, slots, kit]] of Object.entries(ROSTER10)) {
    const s = SPECIES[key];
    if (!s) { bad.push(`${key}: missing`); continue; }
    if (s.hp !== hp || s.atk !== atk || s.mag !== mag || s.def !== def || s.spd !== spd)
      bad.push(`${key}: stats ${s.hp}/${s.atk}/${s.mag}/${s.def}/${s.spd} want ${hp}/${atk}/${mag}/${def}/${spd}`);
    if (s.type !== type || s.role !== role) bad.push(`${key}: ${s.type}/${s.role} want ${type}/${role}`);
    if (s.slots !== slots) bad.push(`${key}: slots ${s.slots} want ${slots}`);
    if (JSON.stringify(s.moves) !== JSON.stringify(kit)) bad.push(`${key}: kit [${s.moves}] want [${kit}]`);
    makeCreature(key, 10); // validates loudly
  }
  check('both stages match the table verbatim', bad.length === 0);
  if (bad.length) for (const b of bad) console.log('        ' + b);

  check('the line is single-evolution 3 → 4 at Lv12; Voltwraith is final',
    SPECIES.Staticur.evolvesTo === 'Voltwraith' && SPECIES.Staticur.evolvesAtLevel === 12 &&
    !SPECIES.Voltwraith.evolvesTo);
  check('learnsets: Staticur Gust @7 · Voltwraith Deadband Howl @12',
    JSON.stringify(SPECIES.Staticur.learnset) === JSON.stringify([{ level: 7, move: 'Gust' }]) &&
    JSON.stringify(SPECIES.Voltwraith.learnset) === JSON.stringify([{ level: 12, move: 'Deadband Howl' }]));

  const sl = MOVES['Static Lash'];
  const dh = MOVES['Deadband Howl'];
  check('Static Lash: Gale · physical · 6 · STATUS-FREE (Emberlash-tier)',
    sl && sl.type === 'Gale' && sl.kind === 'physical' && sl.power === 6 && !sl.applies && !sl.recoil);
  check('Deadband Howl: Gale · physical · 8 · STATUS-FREE (Kiln Burst-tier signature)',
    dh && dh.type === 'Gale' && dh.kind === 'physical' && dh.power === 8 && !dh.applies && !dh.recoil);
  check('the trio order is canon (ROSTER §7): Slagling · Staticur · Marrowling',
    JSON.stringify(STARTER_CORES) === JSON.stringify(['Slagling', 'Staticur', 'Marrowling']));
}

// ---- (B) the pick contract (real save layer over a polyfill) ----------------------
async function pickContractTest() {
  console.log('\n=== (B) THE PICK CONTRACT — flags.starterChoice/rivals (the P12 substrate) ===');
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const { newGame, saveGame, loadGame } = await import('../src/systems/save.js');
  const { GameState } = await import('../src/systems/state.js');
  const { bindStarter, rivalClaims, backfillLegacyFlags } = await import('../src/systems/starterSelect.js');

  // Tavern fixtures: the scene's data is all present.
  check('tavern: doorBlock on starterChoice · 3 staked cores · table tiles under them',
    MAPS.tavern.doorBlock?.flag === 'starterChoice' &&
    MAPS.tavern.objects.filter((o) => o.type === 'core').length === 3 &&
    MAPS.tavern.objects.filter((o) => o.type === 'core').every((o) => MAPS.tavern.grid[o.y][o.x] === 'p'));

  // New Game: tavern spawn, EMPTY party, the choice open, a v4 blob on disk.
  newGame();
  check('New Game wakes in the tavern with an EMPTY party and the choice OPEN',
    GameState.position.mapId === 'tavern' && GameState.party.length === 0 &&
    !GameState.flags.starterChoice && !GameState.flags.rivals);
  // v4 when P10 wrote this row; v5 since PHASE13 added gilt/bag/Temper. What P10 actually
  // cares about is the row below — that a pre-pick blob is never backfilled — so this one
  // just tracks the current version rather than freezing it again.
  check('the initial save is at the current version (v5 since PHASE13)',
    JSON.parse(store.get('creature-collector.save')).version === 5);
  loadGame();
  check('a v4 PRE-PICK save reloads with the choice still open (never backfilled)',
    !GameState.flags.starterChoice && GameState.party.length === 0);

  // All three picks: grant + flags + the deterministic claims.
  const want = {
    Slagling: { a: 'Staticur', b: 'Marrowling' },
    Staticur: { a: 'Slagling', b: 'Marrowling' },
    Marrowling: { a: 'Slagling', b: 'Staticur' },
  };
  for (const pick of STARTER_CORES) {
    newGame();
    const { starter, rivals } = bindStarter(pick);
    const w = want[pick];
    const unpicked = STARTER_CORES.filter((k) => k !== pick);
    check(`pick ${pick}: Lv5 full-HP grant · seen+caught · rivals {a:${w.a}, b:${w.b}} · unpicked UNSEEN`,
      starter.species === pick && starter.level === 5 && starter.hp === starter.maxHp &&
      GameState.party.length === 1 && GameState.caught.includes(pick) &&
      rivals.a === w.a && rivals.b === w.b &&
      GameState.flags.starterChoice === pick &&
      unpicked.every((k) => !GameState.seen.includes(k)));
    saveGame();
    loadGame();
    check(`pick ${pick}: flags round-trip the save layer`,
      GameState.flags.starterChoice === pick && GameState.flags.rivals.a === w.a && GameState.flags.rivals.b === w.b);
  }

  // Legacy (§7): a pre-P10 v3 blob backfills flags ONLY — party/position untouched,
  // and the backfill is IDENTICAL to a new save that picked Slagling.
  store.set('creature-collector.save', JSON.stringify({
    version: 3,
    party: [
      { species: 'Forgewrought', level: 10, xp: 37, hp: 41, moves: ['Emberlash', 'Ram', 'Cinderclad'] },
      { species: 'Mireling', level: 9, xp: 5, hp: 20, moves: ['Spore Bash', 'Gnash', 'Blightspore'] },
    ],
    box: [],
    position: { mapId: 'cave', x: 5, y: 5 },
    facing: 'left',
    flags: { respawn: { mapId: 'town', x: 9, y: 10 }, reachedHollowSeam: true },
    seen: ['Slagling', 'Forgewrought', 'Mireling'],
    caught: ['Slagling', 'Forgewrought', 'Mireling'],
    levelCap: 10,
  }));
  loadGame();
  check('legacy v3: backfills starterChoice=Slagling, rivals={a:Staticur, b:Marrowling} (§7 verbatim)',
    GameState.flags.starterChoice === 'Slagling' &&
    GameState.flags.rivals.a === 'Staticur' && GameState.flags.rivals.b === 'Marrowling');
  check('legacy v3: backfill == rivalClaims(Slagling) — old and new saves are identical for P12',
    JSON.stringify(GameState.flags.rivals) === JSON.stringify(rivalClaims('Slagling')));
  check('legacy v3: party, position, respawn, seam flag all untouched; Staticur NOT seen',
    GameState.party.length === 2 && GameState.party[0].hp === 41 &&
    GameState.position.mapId === 'cave' && GameState.flags.respawn.mapId === 'town' &&
    GameState.flags.reachedHollowSeam === true && !GameState.seen.includes('Staticur'));
  check('backfillLegacyFlags is idempotent and respects an existing choice',
    backfillLegacyFlags({ starterChoice: 'Marrowling' }).rivals.b === 'Staticur');

  // New Game reset clears the P10 flags (§7).
  newGame();
  check('New Game reset clears starterChoice/rivals', !GameState.flags.starterChoice && !GameState.flags.rivals);
}

// ---- (C) evolution under the caps -------------------------------------------------
function evolutionTest() {
  console.log('\n=== (C) STATICUR → VOLTWRAITH under the milestone caps ===');
  // Pinned at the pre-boss cap: the Staticur picker fights the gate PRE-evolution.
  const pinned = makeCreature('Staticur', 5);
  for (let i = 0; i < 40; i++) gainCreatureXp(pinned, 500, 10);
  check('Staticur pinned at cap 10 NEVER evolves (evo Lv12 > pre-boss cap — by design)',
    pinned.level === 10 && pinned.species === 'Staticur');
  check('...and learned Gust on the way up (Lv7 innate)',
    pinned.moves.some((m) => m.name === 'Gust') && pinned.moves.length === 3);

  // Under the post-boss cap 15 the evolve fires at 12 and everything lands.
  const raised = makeCreature('Staticur', 5);
  let res;
  while (raised.level < 12) res = gainCreatureXp(raised, 400, 15);
  const evo = res.events.find((e) => e.kind === 'evolved');
  check('under cap 15: evolves at 12 → Voltwraith, keeps its moves, learns Deadband Howl into the 4th slot',
    evo?.to === 'Voltwraith' && raised.species === 'Voltwraith' &&
    ['Static Lash', 'Nip', 'Gust', 'Deadband Howl'].every((n) => raised.moves.some((m) => m.name === n)) &&
    raised.moves.length === 4);
  check(`Voltwraith stats land on the new base (Lv12 Atk ${raised.atk} = ${statAtLevel(SPECIES.Voltwraith.atk, 12)}, Spd ${raised.spd} = ${statAtLevel(SPECIES.Voltwraith.spd, 12)})`,
    raised.atk === statAtLevel(SPECIES.Voltwraith.atk, 12) &&
    raised.spd === statAtLevel(SPECIES.Voltwraith.spd, 12) &&
    raised.maxHp === statAtLevel(SPECIES.Voltwraith.hp, 12));
}

// ---- (D) encounter tables byte-identical to Phase 9 -------------------------------
const EXPECTED_TABLES = {
  route: [
    { species: 'Mireling', rarity: 'common', min: 3, max: 5 },
    { species: 'Fenmoth', rarity: 'common', min: 3, max: 5 },
    { species: 'Marrowling', rarity: 'common', min: 3, max: 5 },
    { species: 'Sistern', rarity: 'uncommon', min: 3, max: 5 },
    { species: 'Snarebriar', rarity: 'uncommon', min: 3, max: 5 },
    { species: 'Fenlight', rarity: 'rare', min: 4, max: 6 },
  ],
  cave: [
    { species: 'Marrowling', rarity: 'common', min: 5, max: 6 },
    { species: 'Fenmoth', rarity: 'common', min: 5, max: 6 },
    { species: 'Sistern', rarity: 'uncommon', min: 4, max: 6 },
    { species: 'Borck', rarity: 'uncommon', min: 5, max: 6 },
  ],
  wastes: [
    { species: 'Ashwhelp', rarity: 'common', min: 2, max: 4 },
    { species: 'Sporemote', rarity: 'common', min: 2, max: 4 },
    { species: 'Ashcap', rarity: 'uncommon', min: 3, max: 5 },
  ],
  deephollow: [
    { species: 'Marrowling', rarity: 'common', min: 7, max: 9 },
    { species: 'Sistern', rarity: 'uncommon', min: 7, max: 9 },
    { species: 'Borck', rarity: 'uncommon', min: 7, max: 9 },
    { species: 'Murkmaw', rarity: 'epic', min: 8, max: 10 },
  ],
};

function encounterTest() {
  console.log('\n=== (D) ENCOUNTER TABLES — untouched, and the wolf line is NOWHERE wild ===');
  let same = true;
  for (const [id, table] of Object.entries(EXPECTED_TABLES)) {
    if (JSON.stringify(MAPS[id].encounters.table) !== JSON.stringify(table)) {
      same = false;
      console.log(`        ${id}: table drifted from Phase 9`);
    }
  }
  check('route/cave/wastes/deephollow tables are byte-identical to Phase 9', same);
  const wild = new Set(
    Object.values(MAPS).flatMap((m) => (m.encounters ? m.encounters.table.map((e) => e.species) : []))
  );
  check('Staticur and Voltwraith appear in NO encounter table (the handler stakes; the wild does not)',
    !wild.has('Staticur') && !wild.has('Voltwraith'));
  check('the tavern and town remain encounter-free',
    MAPS.tavern.encounters === null && MAPS.town.encounters == null);
}

// ---- Barrow-King suite (identical harness to sim-phase7/8/9) ----------------------
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
  const fish = active.moves.filter((m) => m.applies &&
    !hasStatus(resolveApplyTarget(active, enemy, m.applies), m.applies.status));
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
    tryApplyStatus(resolveApplyTarget(user, target, move.applies), move.applies);
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
    if (turns > 500) return { win: false, turns, aliveLeft: alive(), teamHpLeft: 0, stall: true };
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
// The Staticur STARTER at the gate: picked at Lv5, raised — Gust learned at 7.
function raisedStaticur(level) {
  const c = makeCreature('Staticur', level);
  if (level >= 7) c.moves.push(mv('Gust'));
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
  'Borck solo Lv10 (the wall)': () => [makeCreature('Borck', 10)],
  'Snarebriar+Mireling Lv10': () => [makeCreature('Snarebriar', 10), raisedMireling(10)],
  'Snarebriar+Fenmoth Lv10': () => [makeCreature('Snarebriar', 10), makeCreature('Fenmoth', 10)],
  'Fenlight+Mireling Lv10': () => [makeCreature('Fenlight', 10), raisedMireling(10)],
  // ---- PHASE10 rows — the trio asymmetry (§8) -----------------------------------
  'Marrowling BASE solo Lv10 (§8 row)': () => [makeCreature('Marrowling', 10)],
  'Staticur solo Lv10 (the easy gate)': () => [raisedStaticur(10)],
  'Staticur+Mireling Lv10': () => [raisedStaticur(10), raisedMireling(10)],
  'Staticur+Fenmoth Lv10': () => [raisedStaticur(10), makeCreature('Fenmoth', 10)],
};

// Phase-8 published results, for the drift columns (unchanged rows only).
const PHASE8 = {
  CANONICAL: {
    'Ember-only: Slagling Lv8': [0, '-', '-'], 'Ember-only: Forgewrought Lv9': [0, '-', '-'],
    'Ember-only: Forgewrought Lv10': [0, '-', '-'],
    'Bloom/Gale lead Mireling Lv10': [100, 12, 13], 'Bloom/Gale lead Fenmoth Lv10': [100, 8, 13],
    'Diverse 4 Lv8': [0, '-', '-'], 'Diverse 4 Lv10': [100, 112, 13],
    'Ossclad solo Lv10': [100, 38.6, 6.8], 'Forgewrought+Ossclad Lv10': [100, 63, 13],
  },
  SEEKER: {
    'Ember-only: Slagling Lv8': [0, '-', '-'], 'Ember-only: Forgewrought Lv9': [0, '-', '-'],
    'Ember-only: Forgewrought Lv10': [0, '-', '-'],
    'Bloom/Gale lead Mireling Lv10': [98.5, 38.7, 9.1], 'Bloom/Gale lead Fenmoth Lv10': [97.8, 19.6, 10.4],
    'Diverse 4 Lv8': [99.8, 97.9, 11], 'Diverse 4 Lv10': [100, 137.8, 9.2],
    'Ossclad solo Lv10': [100, 37.1, 6.7], 'Forgewrought+Ossclad Lv10': [100, 63, 13],
  },
};

const TRIALS = 2000;
function suite(policyName, policy) {
  const boss = makeBoss('BarrowKing');
  console.log(`\n=== BARROW-KING (HP${boss.maxHp} Atk${boss.atk} Def${boss.def} — UNCHANGED) — ${policyName} ===`);
  const results = {};
  for (const name of Object.keys(TEAMS)) {
    let wins = 0, sumTeam = 0, sumTurns = 0, sumAlive = 0, teamSize = 0, teamMaxHp = 0, stalls = 0;
    for (let i = 0; i < TRIALS; i++) {
      const t = TEAMS[name]();
      teamSize = t.length;
      teamMaxHp = t.reduce((s, c) => s + c.maxHp, 0);
      const r = simBattle(t, boss, policy);
      if (r.stall) stalls++;
      if (r.win) { wins++; sumTeam += r.teamHpLeft; sumTurns += r.turns; sumAlive += r.aliveLeft; }
    }
    const wr = (wins / TRIALS) * 100;
    const avgTeam = wins ? +(sumTeam / wins).toFixed(1) : '-';
    const avgTurns = wins ? +(sumTurns / wins).toFixed(1) : '-';
    results[name] = { wr, avgTeam, avgTurns, teamMaxHp, stalls };
    const p8 = PHASE8[policyName.startsWith('CANONICAL') ? 'CANONICAL' : 'SEEKER'][name];
    console.log(
      `  ${name.padEnd(35)} win ${String(wr.toFixed(1)).padStart(5)}%  teamHPleft ${String(avgTeam).padStart(5)}/${String(teamMaxHp).padStart(3)}  ` +
      `turns ${String(avgTurns).padStart(4)}  aliveLeft ${(wins ? (sumAlive / wins).toFixed(2) : '-')}/${teamSize}` +
      (stalls ? `  (${stalls} 500-turn stalls)` : '') +
      (p8 ? `   [P8: ${p8[0]}% / ${p8[1]} / ${p8[2]}]` : '   [NEW]')
    );
  }
  return results;
}

function bossAssertions(canon, seeker) {
  console.log('\n=== BOSS SUITE ASSERTIONS (the bars that must hold) ===');
  const b = makeBoss('BarrowKing');
  check('boss numbers untouched: HP105 Atk15 Def12 Spd4, drain .33/.43 @ .5 — LOCKED',
    b.maxHp === 105 && b.atk === 15 && b.def === 12 && b.spd === 4 &&
    b.drain.above === 0.33 && b.drain.below === 0.43 && b.drain.threshold === 0.5);

  // The held bars (Phase 5–9).
  check('HARD — Slagling-solo path still 0% at every level ≤ cap (both policies)',
    ['Ember-only: Slagling Lv8', 'Ember-only: Forgewrought Lv9', 'Ember-only: Forgewrought Lv10']
      .every((n) => canon[n].wr === 0 && seeker[n].wr === 0));
  check(`Bloom/Gale duo bars hold EXACTLY (100% tense: ${canon['Bloom/Gale lead Mireling Lv10'].avgTeam} / ${canon['Bloom/Gale lead Fenmoth Lv10'].avgTeam} team HP)`,
    canon['Bloom/Gale lead Mireling Lv10'].wr === 100 && canon['Bloom/Gale lead Fenmoth Lv10'].wr === 100 &&
    canon['Bloom/Gale lead Mireling Lv10'].avgTeam <= 25 && canon['Bloom/Gale lead Fenmoth Lv10'].avgTeam <= 25);
  check('the raised-Ossclad counter is intact (solo 100%, both policies) — the Marrowling STARTER PATH at the gate',
    canon['Ossclad solo Lv10'].wr === 100 && seeker['Ossclad solo Lv10'].wr === 100);
  check('Diverse 4 at the cap still wins big', canon['Diverse 4 Lv10'].wr === 100);
  check('Borck-solo is still a stall-LOSS both ways (Calcify does not out-sustain Lifedrain)',
    canon['Borck solo Lv10 (the wall)'].wr === 0 && seeker['Borck solo Lv10 (the wall)'].wr === 0);

  // The P10 asymmetry rows.
  const marrow = canon['Marrowling BASE solo Lv10 (§8 row)'];
  check(`MEDIUM — Marrowling BASE-form solo < 25% at cap (canonical ${marrow.wr}%) — losing-to-rare, per the §8 band`,
    marrow.wr < 25 && seeker['Marrowling BASE solo Lv10 (§8 row)'].wr < 25);

  const stat = canon['Staticur solo Lv10 (the easy gate)'];
  const fracLeft = stat.wr > 0 ? stat.avgTeam / stat.teamMaxHp : 0;
  // ⚠ DETERMINISTIC-BAND NOTE (report to Shane): this matchup has ZERO variance —
  // status-free kits both sides, no damage rolls — so a literal 60–90% win rate is
  // unreachable; every trial is the same fight. The band is read in spirit: the
  // Staticur picker WINS the gate, but limps out (≤35% of max HP left — no
  // steamroll). Shane adjudicates whether that reading stands.
  check(`EASY — Staticur-solo WINS the gate (${stat.wr}%) and limps out (${stat.avgTeam}/${stat.teamMaxHp} HP left = ${(fracLeft * 100).toFixed(0)}% ≤ 35%) [deterministic-band reading]`,
    stat.wr === 100 && fracLeft <= 0.35);

  // Duos: Staticur + a route catch ≥ the Bloom/Gale bar.
  const bar = Math.min(canon['Bloom/Gale lead Mireling Lv10'].avgTeam, canon['Bloom/Gale lead Fenmoth Lv10'].avgTeam);
  check(`Staticur duos ≥ the Bloom/Gale bar (win 100% with ≥ ${bar} team HP: Mireling ${canon['Staticur+Mireling Lv10'].avgTeam}, Fenmoth ${canon['Staticur+Fenmoth Lv10'].avgTeam})`,
    canon['Staticur+Mireling Lv10'].wr === 100 && canon['Staticur+Fenmoth Lv10'].wr === 100 &&
    canon['Staticur+Mireling Lv10'].avgTeam >= bar && canon['Staticur+Fenmoth Lv10'].avgTeam >= bar);
}

// ---- (F) Voltwraith at cap 15 vs the post-boss wilds — REPORT ONLY ----------------
function wildDuel(attacker, wild) {
  // 1v1, both greedy; attacker acts by Spd like the real engine.
  const a = { ...attacker, hp: attacker.maxHp, statuses: [] };
  const w = { ...wild, hp: wild.maxHp, statuses: [] };
  let turns = 0;
  while (turns < 100) {
    turns++;
    const am = bestMove(a, w);
    const strike = (u, m, t) => {
      const d = computeDamage(u, m, t);
      t.hp = Math.max(0, t.hp - d);
      if (m.recoil && d > 0) u.hp = Math.max(0, u.hp - Math.max(1, Math.floor(m.recoil * d)));
      tryApplyStatus(resolveApplyTarget(u, t, m.applies), m.applies);
      tickStatuses(u, 'onAction');
    };
    if (playerActsFirst(a, w)) {
      strike(a, am, w);
      if (w.hp > 0 && a.hp > 0) strike(w, chooseEnemyMove(w, a), a);
    } else {
      strike(w, chooseEnemyMove(w, a), a);
      if (a.hp > 0 && w.hp > 0) strike(a, am, w);
    }
    if (a.hp > 0 && w.hp > 0) { tickStatuses(a, 'turnEnd'); tickStatuses(w, 'turnEnd'); }
    if (a.hp <= 0 || w.hp <= 0) break;
  }
  return { won: w.hp <= 0 && a.hp > 0, turns, hpLost: a.maxHp - a.hp };
}

function voltwraithWildsReport() {
  console.log('\n=== (F) VOLTWRAITH @ CAP 15 vs THE POST-BOSS WILDS — report only, wilds never tuned ===');
  const N = 500;
  const champions = {
    'Voltwraith Lv15': () => makeCreature('Voltwraith', 15),
    'Warkiln Lv15 (peer)': () => makeCreature('Warkiln', 15),
    'Bonemarch Lv15 (peer)': () => makeCreature('Bonemarch', 15),
  };
  const wilds = [
    ['Marrowling Lv9 (deep)', () => makeCreature('Marrowling', 9)],
    ['Sistern Lv9 (deep)', () => makeCreature('Sistern', 9)],
    ['Borck Lv9 (deep)', () => makeCreature('Borck', 9)],
    ['Murkmaw Lv10 (deep, epic)', () => makeCreature('Murkmaw', 10)],
    ['Ashcap Lv5 (wastes)', () => makeCreature('Ashcap', 5)],
  ];
  for (const [cname, cmake] of Object.entries(champions)) {
    const rows = [];
    for (const [wname, wmake] of wilds) {
      let wins = 0, sumTurns = 0, sumLost = 0;
      for (let i = 0; i < N; i++) {
        const r = wildDuel(cmake(), wmake());
        if (r.won) wins++;
        sumTurns += r.turns;
        sumLost += r.hpLost;
      }
      rows.push(`${wname}: ${((wins / N) * 100).toFixed(0)}% in ${(sumTurns / N).toFixed(1)}t, −${(sumLost / N).toFixed(1)} HP`);
    }
    console.log(`  ${cname.padEnd(22)} ${rows.join('  ·  ')}`);
  }
  console.log('  (interpretation for the report: Voltwraith should sit near its evolved-starter peers, not above them)');
}

// ---- run --------------------------------------------------------------------------
speciesTest();
await pickContractTest();
evolutionTest();
encounterTest();
console.log(failures ? `\n  *** ${failures} FAILURE(S) so far ***` : '\n  all engine/data/contract checks pass');
const canon = suite('CANONICAL max-damage play', CANONICAL);
const seeker = suite('SEEKER status-fishing play', SEEKER);
bossAssertions(canon, seeker);
voltwraithWildsReport();
console.log(failures ? `\n*** ${failures} TOTAL FAILURE(S) ***` : '\nALL CHECKS PASS');
process.exit(failures ? 1 : 0);
