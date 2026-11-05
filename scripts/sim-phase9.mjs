// PHASE9 verification sim — the demo region made real. Reuses the REAL game modules.
// Seven jobs:
//
//   (A) Engine — the §5 self-target hook: Calcify as a damage-less status move
//       (0 damage, consumes the turn, always hits SELF, one-instance-refresh), and
//       the greedy enemy AI never preferring it to a real hit.
//   (B) Wave-1 statuses — Slowed/Calcified/Hasted/Drowning: stat-mods (incl. the
//       first buffs), Drowning's /16→/12→/8 escalation, turn-order flips under
//       Slowed, and the HARD check that Hasted + Drowning are wired to NO move.
//   (C) New-move routing — kinds, Mag scaling, the first exotic move on the
//       Phase-8 chart (Drag Under; Murkmaw shrugs elemental hits).
//   (D) Species integrity — the nine new numens vs a HAND-WRITTEN roster table
//       (stats/types/roles/slots/kits), both Neutral-branch evolutions firing,
//       and Mycelegion's Lv17 gating itself above the demo cap of 15.
//   (E) Rarity-weighted encounters — tier math (rare ≈ 9%, epic ≈ 10% in-room),
//       table hygiene, the exotic-rarity guardrail, Murkmaw ONLY in the deep.
//   (F) Map graph — BFS over walkable tiles + warps from the New Game spawn:
//       the Deep Hollow is UNREACHABLE while the Barrow-King stands, reachable
//       once he falls. The gate literally guards it.
//   (G) Saves — real loadGame/saveGame over a localStorage polyfill: a pre-Phase9
//       v3 blob Continues exactly where it stood; New Game wakes in the tavern.
//
// Then the FULL Barrow-King suite re-run (boss numbers UNCHANGED): the Phase-8 teams
// must hold their published bars, plus the new rows — Borck-solo (a self-buffing wall
// must be a stall-LOSS; if Calcify flips it, REPORT — do not touch the boss) and the
// Snarebriar duos (Barbed-Kick Bleed as a gamble, not a free win).
//
// Run:  node scripts/sim-phase9.mjs

import { SPECIES, makeCreature, gainCreatureXp, rollEncounter, RARITY_WEIGHTS } from '../src/data/creatures.js';
import { MOVES, mv } from '../src/data/moves.js';
import { STATUSES } from '../src/data/statuses.js';
import { makeBoss } from '../src/data/bosses.js';
import { EXOTIC, typeMultiplier } from '../src/data/types.js';
import { ROLES } from '../src/data/roles.js';
import { computeDamage, playerActsFirst, chooseEnemyMove, effectiveness } from '../src/systems/combat.js';
import {
  applyStatus, tryApplyStatus, resolveApplyTarget, tickStatuses, clearStatuses,
  hasStatus, effectiveStat, healingReceivedMod,
} from '../src/systems/status.js';
import { statAtLevel } from '../src/systems/progression.js';
import { MAPS } from '../src/data/maps/index.js';
import { TILE } from '../src/data/tiles.js';

let failures = 0;
function check(label, cond) {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failures++;
}

// ---- (A) the self-target hook / status moves -----------------------------------
function selfTargetTest() {
  console.log('=== (A) SELF-TARGET APPLIES + STATUS MOVES (§5) ===');
  const borck = makeCreature('Borck', 10);
  const foe = makeCreature('Marrowling', 10);
  const calcify = borck.moves.find((m) => m.name === 'Calcify');

  check('mv() carries the spec: Calcify power 0, applies Calcified chance 1 target self',
    calcify && calcify.power === 0 && calcify.applies.status === 'Calcified' &&
    calcify.applies.chance === 1 && calcify.applies.target === 'self');
  check('computeDamage of a power-0 move is exactly 0 (min-1 clamp bypassed)',
    computeDamage(borck, calcify, foe) === 0);
  check("resolveApplyTarget: 'self' -> user, default -> foe",
    resolveApplyTarget(borck, foe, calcify.applies) === borck &&
    resolveApplyTarget(borck, foe, { status: 'Bleed', chance: 1 }) === foe);

  // The full exchange, engine-level: it always "hits" self, foe untouched.
  const ev1 = tryApplyStatus(resolveApplyTarget(borck, foe, calcify.applies), calcify.applies);
  check(`Calcify lands on SELF (${ev1?.result}); the foe carries nothing`,
    ev1?.result === 'applied' && hasStatus(borck, 'Calcified') && !hasStatus(foe, 'Calcified'));
  const defBefore = statAtLevel(SPECIES.Borck.def, 10);
  check(`Calcified is a real wall: Def ${defBefore} -> ${effectiveStat(borck, 'def')} (x1.35 floored)`,
    effectiveStat(borck, 'def') === Math.floor(defBefore * 1.35));
  const ev2 = tryApplyStatus(resolveApplyTarget(borck, foe, calcify.applies), calcify.applies);
  check('one-instance-refresh holds: re-casting refreshes, never stacks',
    ev2?.result === 'refreshed' && borck.statuses.length === 1);
  clearStatuses(borck);

  // Greedy AI: a wild Borck never wastes its turn on a 0-damage move.
  let aiPicksMaul = true;
  for (let i = 0; i < 50; i++) {
    if (chooseEnemyMove(borck, foe).name !== 'Petrified Maul') aiPicksMaul = false;
  }
  check('greedy enemy AI never picks the power-0 move over a real hit', aiPicksMaul);
}

// ---- (B) wave-1 statuses ---------------------------------------------------------
function statusWaveTest() {
  console.log('\n=== (B) WAVE-1 STATUSES (Slowed/Calcified wired · Hasted/Drowning dark) ===');

  // Slowed: pure statMod, no tick damage, flips turn order, expires on schedule.
  const fen = makeCreature('Fenmoth', 5); // spd 16 at Lv5
  const ash = makeCreature('Ashwhelp', 5); // spd 15 at Lv5
  check(`pre-Slow: Fenmoth (spd ${effectiveStat(fen, 'spd')}) outspeeds Ashwhelp (${effectiveStat(ash, 'spd')})`,
    playerActsFirst(fen, ash) === true);
  applyStatus(fen, 'Slowed');
  check(`Slowed x0.6: Fenmoth spd -> ${effectiveStat(fen, 'spd')}; the turn order FLIPS`,
    effectiveStat(fen, 'spd') === Math.floor(16 * 0.6) && playerActsFirst(fen, ash) === false);
  const hpBefore = fen.hp;
  let ticks = 0;
  for (let i = 0; i < 3; i++) ticks += tickStatuses(fen, 'turnEnd').length;
  check('Slowed is turnEnd no-tick: 3 activations, ZERO damage, then it expires',
    ticks === 3 && fen.hp === hpBefore && !hasStatus(fen, 'Slowed'));

  // Hasted: the first pure buff on the same engine.
  const sis = makeCreature('Sistern', 10); // spd 8 at Lv10
  applyStatus(sis, 'Hasted');
  check(`Hasted x1.4: Sistern spd 8 -> ${effectiveStat(sis, 'spd')} (buffs ride the statMod engine)`,
    effectiveStat(sis, 'spd') === Math.floor(8 * 1.4));
  check('Calcified + Hasted carry the beneficial flag; Slowed does not',
    STATUSES.Calcified.beneficial === true && STATUSES.Hasted.beneficial === true && !STATUSES.Slowed.beneficial);
  clearStatuses(sis);

  // Drowning: escalating DoT — /16 -> /12 -> /8 of maxHp, then out.
  const dummy = { name: 'dummy', maxHp: 48, hp: 48 };
  applyStatus(dummy, 'Drowning');
  const t1 = tickStatuses(dummy, 'turnEnd')[0];
  const t2 = tickStatuses(dummy, 'turnEnd')[0];
  const t3 = tickStatuses(dummy, 'turnEnd')[0];
  check(`Drowning escalates: ticks ${t1.dmg}/${t2.dmg}/${t3.dmg} on maxHp 48 (= 3/4/6), expires on the third`,
    t1.dmg === 3 && t2.dmg === 4 && t3.dmg === 6 && t3.expired && !hasStatus(dummy, 'Drowning'));
  applyStatus(dummy, 'Drowning');
  tickStatuses(dummy, 'turnEnd'); // one tick down the ladder...
  applyStatus(dummy, 'Drowning'); // ...refresh restarts it
  const r1 = tickStatuses(dummy, 'turnEnd')[0];
  check(`re-applying Drowning restarts the ladder (next tick ${r1.dmg} = /16, not /12)`, r1.dmg === 3);

  // The dark pair are DATA-ONLY: no shipped move may apply them yet.
  const wired = new Set(Object.values(MOVES).filter((d) => d.applies).map((d) => d.applies.status));
  check('Hasted + Drowning are wired to NO move (shipped dark, tests passing)',
    !wired.has('Hasted') && !wired.has('Drowning'));
  check('Slowed is wired to Coldlight only; Calcified to Calcify only',
    MOVES['Coldlight'].applies.status === 'Slowed' &&
    MOVES['Calcify'].applies.status === 'Calcified' &&
    Object.entries(MOVES).filter(([, d]) => ['Slowed', 'Calcified'].includes(d.applies?.status)).length === 2);

  // Coldlight's 25% roll, deterministic via injected rand.
  const tgt = makeCreature('Slagling', 5);
  const cold = mv('Coldlight');
  check('Coldlight applies Slowed at 25%: rand .24 lands it, rand .25 does not',
    tryApplyStatus(tgt, cold.applies, () => 0.24)?.result === 'applied' &&
    tryApplyStatus(makeCreature('Slagling', 5), cold.applies, () => 0.25) === null);
}

// ---- (C) new-move routing ---------------------------------------------------------
function moveRoutingTest() {
  console.log('\n=== (C) NEW-MOVE DAMAGE ROUTING (kinds, Mag, the first exotic move) ===');
  // The Phase-9 magic roster PLUS everything that has landed since: P11's control
  // carriers (Undertoll, Lull) and P12's Gloam. Held EXACT on purpose — a move quietly
  // changing kind would re-route its damage off the wrong stat and no other row would
  // notice. STALE-FIXTURE REPAIR (P12): red since P11; extend this list every time a
  // magic move ships.
  const expectMagic = [
    'Toll', 'Coldlight', 'Beckon', 'Drag Under', 'Calcify', 'Spore Burst', 'Sporestorm',
    'Undertoll', 'Lull', 'Gloam',
  ];
  const magic = Object.entries(MOVES).filter(([, d]) => d.kind === 'magic').map(([n]) => n).sort();
  check(`magic list is exactly [${expectMagic.slice().sort().join(', ')}]`,
    JSON.stringify(magic) === JSON.stringify(expectMagic.slice().sort()));
  check('every move still declares physical|magic',
    Object.values(MOVES).every((d) => d.kind === 'physical' || d.kind === 'magic'));

  // Coldlight scales off Mag through the real formula (Fenlight is the first Sorcerer).
  const fen = makeCreature('Fenlight', 10);
  const slag = makeCreature('Slagling', 10);
  const expected = Math.max(1, Math.floor((fen.mag * 6) / slag.def * typeMultiplier('Tide', 'Ember')));
  const got = computeDamage(fen, fen.moves.find((m) => m.name === 'Coldlight'), slag);
  check(`Coldlight routes off Mag ${fen.mag} (not Atk ${fen.atk}): ${got} = floor(${fen.mag}*6/${slag.def} * 1.5 super)`,
    got === expected && fen.mag > fen.atk);

  // The first exotic content lands on the Phase-8 chart exactly as shipped.
  const murk = makeCreature('Murkmaw', 10);
  const drag = murk.moves.find((m) => m.name === 'Drag Under');
  check('Drag Under (Umbra) vs the elemental five is NEUTRAL x1; vs Aether x1.5',
    typeMultiplier('Umbra', 'Ember') === 1 && typeMultiplier('Umbra', 'Aether') === 1.5 &&
    drag.kind === 'magic');
  check("elemental hits only graze Murkmaw: Emberlash vs Umbra reads 'shrug' (x0.85)",
    effectiveness(mv('Emberlash'), murk) === 'shrug' && typeMultiplier('Ember', 'Umbra') === 0.85);
  const dragDmg = computeDamage(murk, drag, slag);
  check(`Drag Under deals real damage off Mag (${dragDmg} = floor(${murk.mag}*7/${slag.def}))`,
    dragDmg === Math.max(1, Math.floor((murk.mag * 7) / slag.def)));
}

// ---- (D) the nine new numens (hand-written roster table) ---------------------------
const ROSTER9 = {
  //           hp  atk mag def spd  type      role           slots  kit
  Ashwhelp:   [22, 11, 4,  6,  12, 'Ember',  'Striker',     4, ['Emberlash', 'Nip']],
  Sporemote:  [24, 9,  10, 6,  9,  'Bloom',  'Battle Mage', 3, ['Spore Burst', 'Swarm']],
  Mycelegion: [40, 13, 15, 9,  8,  'Bloom',  'Battle Mage', 4, ['Spore Burst', 'Swarm', 'Sporestorm']],
  Ashcap:     [34, 7,  8,  12, 4,  'Bloom',  'Warden',      3, ['Spore Bash', 'Spore Burst']],
  Mycolith:   [46, 8,  13, 16, 4,  'Bloom',  'Warden',      4, ['Spore Bash', 'Spore Burst', 'Sporestorm']],
  Snarebriar: [24, 9,  6,  8,  11, 'Bloom',  'Trickster',   4, ['Spore Bash', 'Barbed Kick']],
  Fenlight:   [24, 5,  13, 7,  10, 'Tide',   'Sorcerer',    4, ['Coldlight', 'Beckon']],
  Borck:      [36, 9,  3,  13, 4,  'Cinder', 'Warden',      3, ['Petrified Maul', 'Calcify']],
  Murkmaw:    [30, 7,  11, 9,  12, 'Umbra',  'Trickster',   4, ['Drag Under', 'Snatch']],
};

function speciesTest() {
  console.log('\n=== (D) THE NINE NEW NUMENS (stats vs hand-written roster) ===');
  // 18 at Phase 9 (9 held + 9 new); 20 since P10 added the Staticur → Voltwraith line.
  // STALE-FIXTURE REPAIR (P12): red since P10. The nine NEW numens are still checked
  // stat-for-stat below — that is the row that actually guards the roster.
  check(`the Numinary holds 20 species (9 held + 9 new + P10's wolf line)`,
    Object.keys(SPECIES).length === 20);

  let bad = [];
  for (const [key, [hp, atk, mag, def, spd, type, role, slots, kit]] of Object.entries(ROSTER9)) {
    const s = SPECIES[key];
    if (!s) { bad.push(`${key}: missing`); continue; }
    if (s.hp !== hp || s.atk !== atk || s.mag !== mag || s.def !== def || s.spd !== spd)
      bad.push(`${key}: stats ${s.hp}/${s.atk}/${s.mag}/${s.def}/${s.spd} want ${hp}/${atk}/${mag}/${def}/${spd}`);
    if (s.type !== type || s.role !== role) bad.push(`${key}: ${s.type}/${s.role} want ${type}/${role}`);
    if (s.slots !== slots) bad.push(`${key}: slots ${s.slots} want ${slots}`);
    if (JSON.stringify(s.moves) !== JSON.stringify(kit)) bad.push(`${key}: kit [${s.moves}] want [${kit}]`);
    if (!ROLES[s.role]) bad.push(`${key}: unregistered role`);
    makeCreature(key, 10); // validates loudly
  }
  check('all nine match the roster verbatim (stats, type/role, slot caps, kits)', bad.length === 0);
  if (bad.length) for (const b of bad) console.log('        ' + b);

  check('Borck ships evolution-less (the Cairn Path is post-V1; Dolmen NOT built)',
    !SPECIES.Borck.evolvesTo && !SPECIES.Dolmen && !SPECIES.Pyrecap);

  // Ashcap -> Mycolith at 13 under the post-boss cap of 15; Sporestorm arrives with it.
  {
    const c = makeCreature('Ashcap', 12);
    let res;
    while (c.level < 13) res = gainCreatureXp(c, 200, 15);
    const evo = res.events.find((e) => e.kind === 'evolved');
    check(`Ashcap evolves at 13 -> Mycolith (post-boss reachable) and learns Sporestorm`,
      evo?.to === 'Mycolith' && c.species === 'Mycolith' &&
      c.moves.some((m) => m.name === 'Sporestorm') &&
      c.def === statAtLevel(SPECIES.Mycolith.def, 13));
  }
  // Sporemote's Lv17 gates ITSELF above the demo cap of 15 — ships in data, unreachable.
  {
    const capped = makeCreature('Sporemote', 14);
    for (let i = 0; i < 40; i++) gainCreatureXp(capped, 500, 15);
    check('Mycelegion is cap-gated: a Sporemote pinned at Lv15 NEVER evolves',
      capped.level === 15 && capped.species === 'Sporemote');
    const future = makeCreature('Sporemote', 16);
    let res;
    while (future.level < 17) res = gainCreatureXp(future, 500, 20); // a future region's cap
    const evo = res.events.find((e) => e.kind === 'evolved');
    check('...but the moment a future cap allows Lv17, the drift agrees on a shape',
      evo?.to === 'Mycelegion' && future.moves.some((m) => m.name === 'Sporestorm'));
  }
}

// ---- (E) rarity-weighted encounters -------------------------------------------------
function encounterTest() {
  console.log('\n=== (E) RARITY-WEIGHTED ENCOUNTERS (common 60 · uncommon 30 · rare 9 · epic 10) ===');

  // Table hygiene + the exotic guardrail + placement locks, over the REAL map data.
  let bad = [];
  const placements = {};
  for (const [id, m] of Object.entries(MAPS)) {
    if (!m.encounters) continue;
    for (const e of m.encounters.table) {
      if (!SPECIES[e.species]) bad.push(`${id}: unknown species ${e.species}`);
      if (!RARITY_WEIGHTS[e.rarity]) bad.push(`${id}: unknown rarity ${e.rarity}`);
      if (!(e.min <= e.max)) bad.push(`${id}: bad level band ${e.min}..${e.max}`);
      if (EXOTIC.includes(SPECIES[e.species]?.type) && !['rare', 'epic'].includes(e.rarity))
        bad.push(`${id}: EXOTIC ${e.species} below rare tier`);
      (placements[e.species] ??= []).push(id);
    }
  }
  check('every table entry is valid; exotic-rarity guardrail holds (no common Umbra/Aether)', bad.length === 0);
  if (bad.length) for (const b of bad) console.log('        ' + b);
  check('Murkmaw spawns in the Deep Hollow ONLY (epic tier)',
    JSON.stringify(placements.Murkmaw) === '["deephollow"]');
  check('placements per the plan: wastes=Ashwhelp/Sporemote/Ashcap · route+=Snarebriar/Fenlight · Hollow+=Borck',
    placements.Ashwhelp?.join() === 'wastes' && placements.Ashcap?.join() === 'wastes' &&
    placements.Snarebriar?.join() === 'route' && placements.Fenlight?.join() === 'route' &&
    (placements.Borck || []).includes('cave'));

  // Distribution: 30k rolls per table, tolerance ±1.5 points.
  const dist = (table, n = 30000) => {
    const counts = {};
    for (let i = 0; i < n; i++) {
      const c = rollEncounter(table);
      counts[c.species] = (counts[c.species] || 0) + 1;
      const e = table.find((t) => t.species === c.species);
      if (c.level < e.min || c.level > e.max) counts.__bad = (counts.__bad || 0) + 1;
    }
    for (const k of Object.keys(counts)) counts[k] = (counts[k] / n) * 100;
    return counts;
  };
  const near = (got, want, tol = 1.5) => Math.abs(got - want) <= tol;

  const route = dist(MAPS.route.encounters.table);
  check(`route: Fenlight (rare) ${route.Fenlight.toFixed(1)}% ≈ 9.1%, commons ${(route.Mireling + route.Fenmoth + route.Marrowling).toFixed(1)}% ≈ 60.6%, levels in band`,
    near(route.Fenlight, 9.1) && near(route.Mireling + route.Fenmoth + route.Marrowling, 60.6) && !route.__bad);
  const deep = dist(MAPS.deephollow.encounters.table);
  check(`deep hollow: Murkmaw (epic) ${deep.Murkmaw.toFixed(1)}% ≈ 10% within the room`,
    near(deep.Murkmaw, 10) && !deep.__bad);
  const wastes = dist(MAPS.wastes.encounters.table);
  check(`wastes: Ashcap (uncommon) ${wastes.Ashcap.toFixed(1)}% ≈ 33.3%, the two commons split ${wastes.Ashwhelp.toFixed(1)}/${wastes.Sporemote.toFixed(1)}`,
    near(wastes.Ashcap, 33.3) && near(wastes.Ashwhelp, 33.3) && near(wastes.Sporemote, 33.3));

  let threw = false;
  try { rollEncounter([{ species: 'Borck', rarity: 'mythic', min: 1, max: 1 }]); } catch { threw = true; }
  check('an unknown rarity tier throws loudly (data bug, not a silent skew)', threw);
}

// ---- (F) the map graph: the Deep Hollow sits BEHIND the gate ------------------------
function reachableMaps(flags) {
  for (const m of Object.values(MAPS)) {
    if (m.gate) {
      const cleared = !!flags[m.gate.flag];
      for (const [gx, gy] of m.gate.seamTiles) m.grid[gy][gx] = cleared ? 'G' : 'X';
    }
  }
  const visited = new Set();
  const found = new Set();
  const start = MAPS.tavern.spawns.start; // the New Game spawn
  const queue = [{ mapId: 'tavern', x: start.x, y: start.y }];
  while (queue.length) {
    const { mapId, x, y } = queue.shift();
    const key = `${mapId}:${x}:${y}`;
    if (visited.has(key)) continue;
    visited.add(key);
    found.add(mapId);
    const map = MAPS[mapId];
    const warp = (map.warps || []).find((w) => w.x === x && w.y === y);
    if (warp) {
      // stepping onto a warp tile moves you immediately (WorldScene.onEnterTile)
      const sp = MAPS[warp.target].spawns[warp.spawn];
      queue.push({ mapId: warp.target, x: sp.x, y: sp.y });
      continue;
    }
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
      if ((map.npcs || []).some((n) => n.x === nx && n.y === ny)) continue;
      const t = TILE[map.grid[ny][nx]];
      if (t && t.walk) queue.push({ mapId, x: nx, y: ny });
    }
  }
  return found;
}

function gatingTest() {
  console.log('\n=== (F) MAP GRAPH — the Deep Hollow is provably gated behind the Barrow-King ===');
  let ok = true;
  for (const m of Object.values(MAPS)) {
    for (const w of m.warps || []) {
      if (!MAPS[w.target]?.spawns?.[w.spawn]) { ok = false; console.log(`        broken warp ${m.id} -> ${w.target}:${w.spawn}`); }
    }
  }
  check('every warp on every map resolves to a real spawn', ok);

  const pre = reachableMaps({});
  check(`pre-boss reach from the tavern: [${[...pre].sort().join(', ')}] — Deep Hollow ABSENT`,
    ['tavern', 'town', 'house', 'route', 'cave', 'wastes'].every((id) => pre.has(id)) && !pre.has('deephollow'));
  const post = reachableMaps({ barrowKingDefeated: true });
  check('post-boss the same walk reaches the Deep Hollow — the gate was the only door',
    post.has('deephollow'));
  // leave the world pre-boss for any later consumer
  reachableMaps({});
}

// ---- (G) saves: v3 Continues untouched; New Game wakes in the tavern ----------------
async function saveTest() {
  console.log('\n=== (G) SAVES — v3 loads clean; New Game -> tavern; reset correct ===');
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const { saveGame, loadGame, newGame, hasSave, clearSave } = await import('../src/systems/save.js');
  const { GameState } = await import('../src/systems/state.js');

  // A pre-Phase9 v3 blob, exactly as Phase 6-8 wrote them: mid-run in the Hollow,
  // an evolved starter with a customized moveset, boss not yet fallen.
  const oldBlob = {
    version: 3,
    party: [
      { species: 'Forgewrought', level: 10, xp: 37, hp: 41, moves: ['Emberlash', 'Ram', 'Cinderclad'] },
      { species: 'Mireling', level: 9, xp: 5, hp: 20, moves: ['Spore Bash', 'Gnash', 'Blightspore'] },
    ],
    box: [{ species: 'Fenmoth', level: 4, xp: 0, hp: 22, moves: ['Gust', 'Flit'] }],
    position: { mapId: 'cave', x: 5, y: 5 },
    facing: 'left',
    flags: { respawn: { mapId: 'town', x: 9, y: 10 }, reachedHollowSeam: true },
    seen: ['Slagling', 'Forgewrought', 'Mireling', 'Fenmoth'],
    caught: ['Slagling', 'Forgewrought', 'Mireling', 'Fenmoth'],
    levelCap: 10,
    savedAt: 1751500000000,
  };
  store.set('creature-collector.save', JSON.stringify(oldBlob));
  check('an old save is seen (hasSave)', hasSave());
  check('a pre-Phase9 v3 blob loads clean', loadGame() === true);
  const fw = GameState.party[0];
  check(`Continue restores WHERE IT STOOD: cave (5,5), respawn town — untouched by the tavern spawn`,
    GameState.position.mapId === 'cave' && GameState.position.x === 5 &&
    GameState.flags.respawn.mapId === 'town');
  check(`the old party rehydrates exactly (Forgewrought Lv10: maxHp ${fw.maxHp}=${statAtLevel(46, 10)}, hp 41, 3 moves)`,
    fw.species === 'Forgewrought' && fw.maxHp === statAtLevel(46, 10) && fw.hp === 41 &&
    fw.moves.length === 3 && GameState.box.length === 1);
  check('pre-boss cap re-derives to 10 (flags, not the stored number)', GameState.levelCap === 10);

  // The same save post-boss: the cap derives to 15.
  store.set('creature-collector.save', JSON.stringify({
    ...oldBlob, flags: { ...oldBlob.flags, barrowKingDefeated: true },
  }));
  loadGame();
  check('a post-boss old save derives cap 15', GameState.levelCap === 15);

  // New Game: the tavern, the starter, an immediate save.
  newGame();
  // Phase 9 woke you in the tavern holding a Slagling. PHASE10 took the auto-grant away
  // — the three staked cores carry the choice now, so a fresh game wakes CORELESS and
  // the party fills when the player binds one (systems/starterSelect.js).
  // STALE-FIXTURE REPAIR (P12): red since P10.
  check(`New Game wakes in the Emberfall Tavern (${GameState.position.mapId} ${GameState.position.x},${GameState.position.y}) with an EMPTY party — the pick hasn't happened yet`,
    GameState.position.mapId === 'tavern' && GameState.position.x === 8 && GameState.position.y === 6 &&
    GameState.party.length === 0 && !GameState.flags.starterChoice);
  check('the default safe point is the tavern hearth', GameState.flags.respawn.mapId === 'tavern');
  check('New Game wrote its initial save; reload lands back in the tavern',
    loadGame() === true && GameState.position.mapId === 'tavern');

  // New-species round-trip: a bound Murkmaw survives the save layer.
  const { addCreature } = await import('../src/systems/party.js');
  addCreature(makeCreature('Murkmaw', 9));
  saveGame();
  loadGame();
  const mm = GameState.party.find((c) => c.species === 'Murkmaw');
  check('a bound Murkmaw round-trips (species + Drag Under rehydrate by name)',
    mm && mm.level === 9 && mm.moves.some((m) => m.name === 'Drag Under' && m.kind === 'magic'));
  clearSave();
  check('clearSave clears (reset correct)', !hasSave());
}

// ---- Barrow-King suite (identical harness to sim-phase7/8 + the §5 hook) -----------
function bestMove(attacker, defender) {
  let best = attacker.moves[0], bestDmg = -1;
  for (const m of attacker.moves) {
    const d = computeDamage(attacker, m, defender);
    if (d > bestDmg) { best = m; bestDmg = d; }
  }
  return best;
}
const CANONICAL = (active, enemy) => bestMove(active, enemy);
// SEEKER fishes for statuses its foe (or itself, for self-buffs) doesn't carry yet —
// which makes a seeker Borck exactly the Calcify-wall the plan asks about.
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
    const d = computeDamage(active, move, enemy); // 0 for a status move — turn still spent
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
  // PHASE9 rows — the plan's questions:
  'Borck solo Lv10 (the wall)': () => [makeCreature('Borck', 10)],
  'Snarebriar+Mireling Lv10': () => [makeCreature('Snarebriar', 10), raisedMireling(10)],
  'Snarebriar+Fenmoth Lv10': () => [makeCreature('Snarebriar', 10), makeCreature('Fenmoth', 10)],
  'Fenlight+Mireling Lv10': () => [makeCreature('Fenlight', 10), raisedMireling(10)],
};

// Phase-8 published results (this session's baseline run), for the drift columns.
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
    let wins = 0, sumTeam = 0, sumTurns = 0, sumAlive = 0, teamSize = 0, stalls = 0;
    for (let i = 0; i < TRIALS; i++) {
      const t = TEAMS[name]();
      teamSize = t.length;
      const r = simBattle(t, boss, policy);
      if (r.stall) stalls++;
      if (r.win) { wins++; sumTeam += r.teamHpLeft; sumTurns += r.turns; sumAlive += r.aliveLeft; }
    }
    const wr = (wins / TRIALS) * 100;
    const avgTeam = wins ? +(sumTeam / wins).toFixed(1) : '-';
    const avgTurns = wins ? +(sumTurns / wins).toFixed(1) : '-';
    results[name] = { wr, avgTeam, avgTurns, stalls };
    const p8 = PHASE8[policyName.startsWith('CANONICAL') ? 'CANONICAL' : 'SEEKER'][name];
    console.log(
      `  ${name.padEnd(31)} win ${String(wr.toFixed(1)).padStart(5)}%  teamHPleft ${String(avgTeam).padStart(5)}  ` +
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
  check('boss numbers untouched: HP105 Atk15 Def12 Spd4, drain .33/.43 @ .5',
    b.maxHp === 105 && b.atk === 15 && b.def === 12 && b.spd === 4 &&
    b.drain.above === 0.33 && b.drain.below === 0.43 && b.drain.threshold === 0.5);
  check('Ember-only still LOSES (all three rows, both policies)',
    ['Ember-only: Slagling Lv8', 'Ember-only: Forgewrought Lv9', 'Ember-only: Forgewrought Lv10']
      .every((n) => canon[n].wr === 0 && seeker[n].wr === 0));
  check(`the Bloom/Gale duo still wins TENSE (canonical: 100% at ${canon['Bloom/Gale lead Mireling Lv10'].avgTeam} / ${canon['Bloom/Gale lead Fenmoth Lv10'].avgTeam} team HP)`,
    canon['Bloom/Gale lead Mireling Lv10'].wr === 100 && canon['Bloom/Gale lead Fenmoth Lv10'].wr === 100 &&
    canon['Bloom/Gale lead Mireling Lv10'].avgTeam <= 25 && canon['Bloom/Gale lead Fenmoth Lv10'].avgTeam <= 25);
  check('the raised-Ossclad counter is intact (solo 100%, both policies)',
    canon['Ossclad solo Lv10'].wr === 100 && seeker['Ossclad solo Lv10'].wr === 100);
  check('Diverse 4 at the cap still wins big', canon['Diverse 4 Lv10'].wr === 100);
  const borckC = canon['Borck solo Lv10 (the wall)'];
  const borckS = seeker['Borck solo Lv10 (the wall)'];
  check(`BORCK-SOLO IS A STALL-LOSS both ways (canonical ${borckC.wr}% · Calcify-wall ${borckS.wr}%) — Calcify does NOT out-sustain Lifedrain`,
    borckC.wr === 0 && borckS.wr === 0);
  if (borckS.wr > 0) console.log('        *** CALCIFY FLIPPED THE WALL — report to Shane before touching ANYTHING ***');
}

// ---- run -----------------------------------------------------------------------
selfTargetTest();
statusWaveTest();
moveRoutingTest();
speciesTest();
encounterTest();
gatingTest();
await saveTest();
console.log(failures ? `\n  *** ${failures} FAILURE(S) so far ***` : '\n  all engine/data/world checks pass');
const canon = suite('CANONICAL max-damage play', CANONICAL);
const seeker = suite('SEEKER status-fishing play', SEEKER);
bossAssertions(canon, seeker);
console.log(failures ? `\n*** ${failures} TOTAL FAILURE(S) ***` : '\nALL CHECKS PASS');
