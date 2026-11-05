// PHASE12 verification sim — CORELOCKS: THE FIRST DUELS. Reuses the REAL game modules.
// Jobs (build plan §6):
//
//   (A) Duel data + the two laws — the cast is placed, gated and in-voice; the refusal
//       lines are the ones the player reads; rival teams derive from flags.rivals and
//       never hardcode a species; the collector is post-boss ONLY and his Murkmaw is
//       the world's only Gloam.
//   (B) The learnset-armed kit (ledger #27) — correct movesets at every level, with the
//       slot-cap edges walked explicitly: exactly-full (Borck Lv8) and overflow
//       (Warkiln / Bonemarch Lv15, where the highest-level moves evict a base move).
//       Plus the seam that matters: the PLAYER's path is untouched.
//   (C) The seeker policy — fishes a status the target lacks, control over statMod,
//       and NEVER past a kill; every corelock numen carries it.
//   (D) The record — flags.duels / duelRecord / duelLossCount written exactly, both
//       ways, repeatably; duelAvailable stands a loser back up and stands a winner down.
//   (E) THE FIVE FIGHTS vs three reference parties × all three starter picks, against
//       the §6 bands.
//   (F) The misery re-run with wild learnsets ON — the full P11 grid plus the Deep
//       Hollow, flagging any cell crueler than its P11 predecessor (the deep may rise).
//   (G) Charm live-fire — the coin, the half-power self-hit, the swap cleanse, and the
//       one that matters: a charmed numen NEVER lands a blow on its charmer.
//   (H) The Barrow-King suite re-run: every locked bar re-asserts to the decimal and no
//       control status has ever touched him. P12 may not move a single one of his rows.
//   (I) Session hygiene — a wild lap on every map, no console noise, and no way to save
//       from inside a battle.
//
// Run:  node scripts/sim-phase12.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  SPECIES, makeCreature, gainCreatureXp, speciesSlots, learnsetKit, armLearnset, rollEncounter,
} from '../src/data/creatures.js';
import { MOVES, mv } from '../src/data/moves.js';
import { STATUSES } from '../src/data/statuses.js';
import { makeBoss } from '../src/data/bosses.js';
import { CORELOCKS, CORELOCK_BY_ID } from '../src/data/corelocks.js';
import { MAPS } from '../src/data/maps/index.js';
import {
  computeDamage, playerActsFirst, chooseEnemyMove, charmSelfDamage,
} from '../src/systems/combat.js';
import {
  applyStatus, tryApplyStatus, resolveApplyTarget, resolveAction, wakeIfDamaged,
  cleanseControl, tickStatuses, clearStatuses, hasStatus, healingReceivedMod,
} from '../src/systems/status.js';
import { xpToNext } from '../src/systems/progression.js';
import { rivalClaims } from '../src/systems/starterSelect.js';
import {
  DUEL_NO_BIND, DUEL_NO_FLEE, purseLine, corelocksOn, corelockAt, corelockPresent,
  buildCorelockTeam, corelockTeamSpec, makeCorelockNumen, duelAvailable, duelWon,
  recordDuelWin, recordDuelLoss, ambushOn, markDuelMet, duelMet,
} from '../src/systems/corelocks.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const src = (p) => readFileSync(join(HERE, '..', 'src', p), 'utf8');

let failures = 0;
function check(label, cond) {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failures++;
}
const seq = (vals) => { let i = 0; return () => vals[Math.min(i++, vals.length - 1)]; };
const pct = (n, d) => (d ? (n / d) * 100 : 0);

// Console hygiene (§6 "console-clean"): anything the shipped modules warn about during
// this run is a finding, not noise. Counted, reported, and asserted at the end.
let noise = 0;
const realWarn = console.warn, realError = console.error;
console.warn = (...a) => { noise++; realWarn('  [console.warn]', ...a); };
console.error = (...a) => { noise++; realError('  [console.error]', ...a); };

// A flags object shaped like a real save at a given point in the story.
function flagsFor(pick, { postBoss = false } = {}) {
  return {
    starterChoice: pick,
    rivals: rivalClaims(pick),
    ...(postBoss ? { barrowKingDefeated: true } : {}),
  };
}
const PICKS = ['Slagling', 'Staticur', 'Marrowling'];

// ---- (A) duel data + the two laws ---------------------------------------------------
function dataTest() {
  console.log('=== (A) THE CAST — placed, gated, in-voice; the two laws verbatim ===');
  check('the refusal lines are the register the player reads',
    DUEL_NO_BIND === 'Its core answers to another.' && DUEL_NO_FLEE === 'You signed the duel.');
  check('purseLine speaks the number ("The purse is yours — 30 gilt.")',
    purseLine(30) === 'The purse is yours — 30 gilt.');

  check('five corelocks, unique ids, every one non-rematchable in V1',
    CORELOCKS.length === 5 &&
    new Set(CORELOCKS.map((c) => c.id)).size === 5 &&
    CORELOCKS.every((c) => c.rematch === false));
  check('purses per §3: rivalA 30 · sellsword 40 · rivalB 45 · outrider 60 · collector 90',
    CORELOCK_BY_ID.rivalA.purse === 30 && CORELOCK_BY_ID.sellsword.purse === 40 &&
    CORELOCK_BY_ID.rivalB.purse === 45 && CORELOCK_BY_ID.outrider.purse === 60 &&
    CORELOCK_BY_ID.collector.purse === 90);
  check('every corelock declares seeker AI and a full line set',
    CORELOCKS.every((c) => c.ai === 'seeker') &&
    CORELOCKS.every((c) => ['challenge', 'win', 'lose', 'after']
      .every((k) => Array.isArray(c.lines[k]) && c.lines[k].length > 0)));

  // Placement: on a real map, on a walkable tile, and standing on nobody.
  const bad = [];
  for (const c of CORELOCKS) {
    const m = MAPS[c.mapId];
    if (!m) { bad.push(`${c.id}: no map ${c.mapId}`); continue; }
    const ch = m.grid[c.y]?.[c.x];
    if (ch === undefined) { bad.push(`${c.id}: (${c.x},${c.y}) off-map`); continue; }
    if ((m.npcs || []).some((n) => n.x === c.x && n.y === c.y)) bad.push(`${c.id}: shares a tile with an NPC`);
    if ((m.warps || []).some((w) => w.x === c.x && w.y === c.y)) bad.push(`${c.id}: stands on a warp`);
    if (Object.values(m.spawns || {}).some((s) => s.x === c.x && s.y === c.y)) bad.push(`${c.id}: stands on a spawn`);
  }
  check(`all five stand on legal, unoccupied tiles${bad.length ? ' — ' + bad.join('; ') : ''}`, bad.length === 0);
  check('placement per §3: rivalA+sellsword on the route, outrider in town, rivalB+collector in the Hollow',
    CORELOCK_BY_ID.rivalA.mapId === 'route' && CORELOCK_BY_ID.sellsword.mapId === 'route' &&
    CORELOCK_BY_ID.outrider.mapId === 'town' && CORELOCK_BY_ID.rivalB.mapId === 'cave' &&
    CORELOCK_BY_ID.collector.mapId === 'cave');

  // Gating — the rivals need the table resolved, the collector needs the King down.
  const fresh = {};
  const mid = flagsFor('Slagling');
  const post = flagsFor('Slagling', { postBoss: true });
  check('pre-pick: neither rival exists (their numens come from flags.rivals)',
    !corelockPresent(CORELOCK_BY_ID.rivalA, fresh) && !corelockPresent(CORELOCK_BY_ID.rivalB, fresh));
  check('pre-boss: the collector is NOT in the room; post-boss he is',
    !corelockPresent(CORELOCK_BY_ID.collector, mid) &&
    corelockPresent(CORELOCK_BY_ID.collector, post));
  check('the collector appears in the cleared threshold room only (cave, post-boss)',
    corelocksOn('cave', mid).map((c) => c.id).join() === 'rivalB' &&
    corelocksOn('cave', post).map((c) => c.id).sort().join() === 'collector,rivalB');
  check('corelockAt finds them by tile',
    corelockAt('route', CORELOCK_BY_ID.rivalA.x, CORELOCK_BY_ID.rivalA.y, mid)?.id === 'rivalA' &&
    corelockAt('route', 0, 0, mid) === null);

  // The ambush fires once, ever.
  const amb = flagsFor('Slagling');
  check('the eager rival ambushes on entering the route, and only him', ambushOn('route', amb)?.id === 'rivalA');
  check('nobody ambushes in town or the Hollow', !ambushOn('town', amb) && !ambushOn('cave', amb));
  markDuelMet(CORELOCK_BY_ID.rivalA, amb);
  check('once met, the ambush never fires again (a loss cannot trap a spent party)',
    duelMet(CORELOCK_BY_ID.rivalA, amb) && ambushOn('route', amb) === null);

  // Rival teams derive from the flags — three picks, three different benches.
  const derived = PICKS.map((p) => {
    const f = flagsFor(p);
    return [
      corelockTeamSpec(CORELOCK_BY_ID.rivalA, f)[0].species,
      corelockTeamSpec(CORELOCK_BY_ID.rivalB, f)[0].species,
    ].join('/');
  });
  check(`rival numens derive from flags.rivals per pick (${derived.join('  ')})`,
    derived.join() === 'Staticur/Marrowling,Slagling/Marrowling,Slagling/Staticur');
  check('no corelock def names a starter species literally (rivals are functions of flags)',
    typeof CORELOCK_BY_ID.rivalA.team === 'function' && typeof CORELOCK_BY_ID.rivalB.team === 'function' &&
    !/['"](Slagling|Staticur|Marrowling)['"]/.test(
      src('data/corelocks.js').split('export const CORELOCKS')[1].split("id: 'sellsword'")[0]));
  check("rival B's route catch answers her pick (Snarebriar if she holds the Bone salvage, else Mireling)",
    corelockTeamSpec(CORELOCK_BY_ID.rivalB, flagsFor('Staticur'))[1].species === 'Snarebriar' &&
    corelockTeamSpec(CORELOCK_BY_ID.rivalB, flagsFor('Marrowling'))[1].species === 'Mireling');

  // Gloam and the whisper (ledger #29).
  check('Gloam is Umbra · magic · 4 · Charmed 30%',
    MOVES.Gloam.type === 'Umbra' && MOVES.Gloam.kind === 'magic' && MOVES.Gloam.power === 4 &&
    MOVES.Gloam.applies.status === 'Charmed' && MOVES.Gloam.applies.chance === 0.3);
  const gloamCarriers = Object.entries(MOVES).filter(([, d]) => d.applies?.status === 'Charmed').map(([n]) => n);
  check(`Charmed has exactly one carrier in the whole game: Gloam (${gloamCarriers.join()})`,
    gloamCarriers.join() === 'Gloam');
  check('wild Murkmaw is UNTOUCHED — base kit only, no Gloam, no learnset',
    JSON.stringify(SPECIES.Murkmaw.moves) === JSON.stringify(['Drag Under', 'Snatch']) &&
    (SPECIES.Murkmaw.learnset || []).length === 0 &&
    JSON.stringify(learnsetKit('Murkmaw', 10)) === JSON.stringify(['Drag Under', 'Snatch']));
  const coll = buildCorelockTeam(CORELOCK_BY_ID.collector, flagsFor('Slagling', { postBoss: true }));
  check("the collector's Murkmaw is the ONLY numen alive carrying Gloam (override kit loads)",
    coll[0].species === 'Murkmaw' && coll[0].moves.map((m) => m.name).join() === 'Drag Under,Gloam');
  check('his second is a learnset-armed Fenlight (Lull included — no override, so §4 applies)',
    coll[1].species === 'Fenlight' && coll[1].moves.map((m) => m.name).join() === 'Coldlight,Beckon,Lull');
  check('an override kit is clamped to the species slot cap',
    makeCorelockNumen({ species: 'Slagling', level: 6, moves: ['Ram', 'Emberlash', 'Gnash'] }).moves.length === 2);
}

// ---- (B) the learnset-armed kit -----------------------------------------------------
function learnsetTest() {
  console.log('\n=== (B) LEARNSET-ARMED KITS (ledger #27) — every level, both slot edges ===');
  const kit = (s, l) => learnsetKit(s, l).join(',');

  check('Fenlight: Lull comes due at 6, not 7 (the P12 drop — the route rare now carries it)',
    kit('Fenlight', 5) === 'Coldlight,Beckon' && kit('Fenlight', 6) === 'Coldlight,Beckon,Lull');
  check('Sistern: Undertoll at 8 — a Deep Hollow Lv9 tolls, a cave Lv6 does not',
    kit('Sistern', 7) === 'Douse,Toll' && kit('Sistern', 9) === 'Douse,Toll,Undertoll');
  check('Mireling: Blightspore at 7', kit('Mireling', 6) === 'Spore Bash,Gnash' &&
    kit('Mireling', 7) === 'Spore Bash,Gnash,Blightspore');
  check('Staticur: Gust at 7', kit('Staticur', 6) === 'Static Lash,Nip' &&
    kit('Staticur', 7) === 'Static Lash,Nip,Gust');
  check('a species with no learnset is exactly its base kit at every level',
    kit('Fenmoth', 1) === 'Gust,Flit' && kit('Fenmoth', 15) === 'Gust,Flit' &&
    kit('Marrowling', 15) === 'Bone Rake,Clatter');

  // EDGE 1 — exactly full. Borck holds 3 slots and Concuss is his third.
  check('SLOT EDGE (exactly full): Borck Lv8 fills all 3 slots, nothing evicted',
    kit('Borck', 8) === 'Petrified Maul,Calcify,Concuss' && speciesSlots('Borck') === 3);

  // EDGE 2 — overflow. Five candidates into four seats: highest level wins, and the
  // earliest seat breaks a tie, so the Lv15 signatures land and a base move gives way.
  check('SLOT EDGE (overflow): Warkiln Lv15 seats both Lv15 moves and drops Cinderclad',
    kit('Warkiln', 14) === 'Emberlash,Ram,Cinderclad,Kiln Burst' &&
    kit('Warkiln', 15) === 'Emberlash,Ram,Kiln Burst,Overheat Slam');
  check('SLOT EDGE (overflow): Bonemarch Lv15 seats both Lv15 moves and drops Marrow Spikes',
    kit('Bonemarch', 14) === 'Bone Rake,Clatter,Marrow Spikes,Grave Toll' &&
    kit('Bonemarch', 15) === 'Bone Rake,Clatter,Grave Toll,Ossuary Crash');
  check('a learnset entry the base kit already holds keeps its seat, never duplicates',
    kit('Forgewrought', 9) === 'Emberlash,Ram,Cinderclad' &&
    kit('Voltwraith', 12) === 'Static Lash,Nip,Gust,Deadband Howl');
  check('no armed kit ever exceeds its slot cap, at any level, for any species',
    Object.keys(SPECIES).every((k) =>
      [1, 5, 6, 7, 8, 9, 10, 12, 13, 15, 17, 20].every((l) => learnsetKit(k, l).length <= speciesSlots(k))));
  check('every armed kit names real moves',
    Object.keys(SPECIES).every((k) => learnsetKit(k, 20).every((n) => !!MOVES[n])));

  // THE SEAM: the world arms, the player does not.
  check('makeCreature (the PLAYER path) still hands back the base kit — untouched',
    makeCreature('Sistern', 9).moves.map((m) => m.name).join() === 'Douse,Toll' &&
    makeCreature('Fenlight', 6).moves.map((m) => m.name).join() === 'Coldlight,Beckon');
  check('armLearnset re-cuts a live instance in place',
    armLearnset(makeCreature('Sistern', 9)).moves.map((m) => m.name).join() === 'Douse,Toll,Undertoll');
  check('armed instances carry FRESH move objects (no shared applies between instances)',
    (() => {
      const a = armLearnset(makeCreature('Fenlight', 6));
      const b = armLearnset(makeCreature('Fenlight', 6));
      const la = a.moves.find((m) => m.name === 'Lull');
      const lb = b.moves.find((m) => m.name === 'Lull');
      la.applies.chance = 0.99;
      return lb.applies.chance === 0.3 && MOVES.Lull.applies.chance === 0.3;
    })());

  // The three wilds that actually changed, and the many that did not.
  const wildKit = (species, lo, hi) => {
    const out = new Set();
    for (let l = lo; l <= hi; l++) out.add(kit(species, l));
    return [...out];
  };
  check('route Fenlight (4-6) now spans both kits — Lull only at the top of its band',
    JSON.stringify(wildKit('Fenlight', 4, 6)) === JSON.stringify(['Coldlight,Beckon', 'Coldlight,Beckon,Lull']));
  check('Deep Hollow Sistern (7-9) and Borck (7-9) arm up; the cave bands (4-6 / 5-6) do NOT',
    wildKit('Sistern', 7, 9).includes('Douse,Toll,Undertoll') &&
    wildKit('Borck', 7, 9).includes('Petrified Maul,Calcify,Concuss') &&
    wildKit('Sistern', 4, 6).join() === 'Douse,Toll' &&
    wildKit('Borck', 5, 6).join() === 'Petrified Maul,Calcify');
}

// ---- (C) the seeker policy ----------------------------------------------------------
function seekerTest() {
  console.log('\n=== (C) SEEKER — the corelock policy: fish, but never past a kill ===');
  const target = () => makeCreature('Slagling', 8);

  const sistern = makeCorelockNumen({ species: 'Sistern', level: 8 });
  check('a corelock numen is stamped seeker', sistern.ai === 'seeker');
  check('seeker opens by fishing the status the target lacks (Undertoll over Douse/Toll)',
    chooseEnemyMove(sistern, target()).name === 'Undertoll');

  // Once the status holds the fishing branch stops firing and the pick is plain greedy.
  // Asserted as DAMAGE, not as a name: Undertoll happens to tie Douse against an Ember
  // target, so "it stopped fishing" and "it stopped picking Undertoll" are not the same
  // claim — only the first one is true.
  const asleep = target();
  applyStatus(asleep, 'Sleep');
  const greedy = chooseEnemyMove(sistern, asleep);
  const maxDmg = Math.max(...sistern.moves.map((m) => computeDamage(sistern, m, asleep)));
  check(`once the status holds, seeker stops fishing and picks by damage (${greedy.name} for ${maxDmg})`,
    computeDamage(sistern, greedy, asleep) === maxDmg);

  // The unambiguous demonstration: Borck's Petrified Maul out-damages Concuss outright,
  // and seeker throws Concuss anyway — a control fish outranks the greedy pick.
  const borckFisher = makeCorelockNumen({ species: 'Borck', level: 8 });
  const clean = target();
  check(`seeker takes a WEAKER move to land control (Concuss ${computeDamage(borckFisher, mv('Concuss'), clean)} ` +
    `over Petrified Maul ${computeDamage(borckFisher, mv('Petrified Maul'), clean)})`,
    chooseEnemyMove(borckFisher, clean).name === 'Concuss' &&
    computeDamage(borckFisher, mv('Concuss'), clean) < computeDamage(borckFisher, mv('Petrified Maul'), clean));

  const dying = target();
  dying.hp = 1;
  check('a kill on the table is ALWAYS taken — never fished past',
    computeDamage(sistern, chooseEnemyMove(sistern, dying), dying) >= dying.hp);

  const borck = makeCorelockNumen({ species: 'Borck', level: 8 });
  const braced = target();
  applyStatus(braced, 'Braced');
  check('seeker never throws Stunned at a braced target (the anti-stunlock law holds)',
    chooseEnemyMove(borck, braced).name !== 'Concuss');
  const king = makeBoss('BarrowKing');
  king.statuses = [];
  check('seeker never fishes control at an immune boss', chooseEnemyMove(borck, king).name !== 'Concuss');

  // Control outranks a statMod fish — the collector's Murkmaw reaches for Gloam.
  const murk = makeCorelockNumen({ species: 'Murkmaw', level: 12, moves: ['Drag Under', 'Gloam'] });
  check('the collector\'s Murkmaw opens with Gloam (control outranks raw damage while it can fish)',
    chooseEnemyMove(murk, makeCreature('Forgewrought', 10)).name === 'Gloam');
  const charmed = makeCreature('Forgewrought', 10);
  applyStatus(charmed, 'Charmed');
  check('...and stops once the charm holds (Drag Under is the damage-max)',
    chooseEnemyMove(murk, charmed).name === 'Drag Under');
  check('seeker and cunning are the SAME policy under two names',
    (() => {
      const a = makeCreature('Fenlight', 6); armLearnset(a); a.ai = 'cunning';
      const b = makeCreature('Fenlight', 6); armLearnset(b); b.ai = 'seeker';
      const t1 = target(), t2 = target();
      return chooseEnemyMove(a, t1).name === chooseEnemyMove(b, t2).name;
    })());
  check('Fenlight is still the only species-level cunning flag (seeker is per-instance)',
    Object.entries(SPECIES).filter(([, s]) => s.ai).map(([k]) => k).join() === 'Fenlight' &&
    makeCreature('Murkmaw', 12).ai === undefined);
}

// ---- (D) the record -----------------------------------------------------------------
function recordTest() {
  console.log('\n=== (D) THE RECORD — the P15 rep seam, written faithfully both ways ===');
  const f = flagsFor('Slagling', { postBoss: true });
  const A = CORELOCK_BY_ID.rivalA, C = CORELOCK_BY_ID.collector;

  check('an unfought corelock has no result and is available',
    duelWon('rivalA', f) === false && duelAvailable(A, f) === true);

  recordDuelLoss(A, f);
  check("a loss records 'lost', counts once, and leaves him STANDING (you may come back)",
    f.duels.rivalA === 'lost' && f.duelRecord.rivalA.lost === 1 && f.duelLossCount === 1 &&
    duelAvailable(A, f) === true);

  recordDuelLoss(A, f);
  check('losing twice counts twice — the ledger remembers the times, not just the last word',
    f.duelRecord.rivalA.lost === 2 && f.duelLossCount === 2);

  recordDuelWin(A, f);
  check("a win overwrites the headline to 'won' and stands him down (rematch: false)",
    f.duels.rivalA === 'won' && f.duelRecord.rivalA.won === 1 && f.duelRecord.rivalA.lost === 2 &&
    duelAvailable(A, f) === false);
  check('a win never touches the global loss count', f.duelLossCount === 2);

  recordDuelWin(C, f);
  check('records are per-corelock, never shared',
    f.duels.collector === 'won' && f.duelRecord.collector.won === 1 &&
    f.duelRecord.collector.lost === 0 && f.duelRecord.rivalA.lost === 2);
  check('every purse a P13 payout will read is present and positive',
    Object.keys(f.duels).every((id) => CORELOCK_BY_ID[id].purse > 0));

  // The seam is INERT this phase: nothing outside the corelock modules reads it.
  const readers = ['scenes/BattleScene.js', 'scenes/WorldScene.js', 'systems/combat.js',
    'systems/status.js', 'systems/progression.js', 'systems/party.js', 'systems/save.js']
    .filter((p) => /flags\.duels\b/.test(src(p)));
  check(`nothing reads flags.duels for gameplay yet — it is a seam, not a system (${readers.length} readers)`,
    readers.length === 0);
}

// ---- the duel harness (scene-faithful: a TEAM on each side) -------------------------
let bossControlLanded = 0;
let bossImmuneFires = 0;

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

// One battle. `foes` is the other side's bench, fought in order — a wild fight and a
// boss fight are one-creature benches, a duel is two. Mirrors BattleScene exactly:
// the onAct gate on both sides, wake-after-damage-before-drain, cleanse on the way out,
// turn-end ticks only while both sides stand.
function simFight(team, foes, policy, probe) {
  for (const c of team) { c.statuses = []; }
  for (const f of foes) { f.statuses = []; }
  let active = team.find((c) => c.hp > 0);
  let fi = 0;
  let enemy = foes[0];
  let turns = 0;
  const teamHpLeft = () => team.reduce((s, c) => s + Math.max(0, c.hp), 0);
  const aliveLeft = () => team.filter((c) => c.hp > 0).length;

  const hitEffects = (user, move, dmg, target) => {
    if (move.recoil && dmg > 0) user.hp = Math.max(0, user.hp - Math.max(1, Math.floor(move.recoil * dmg)));
    const tgt = resolveApplyTarget(user, target, move.applies);
    const ev = tryApplyStatus(tgt, move.applies);
    if (!ev) return;
    if (tgt.isBoss) {
      if (ev.result === 'immune') bossImmuneFires++;
      else if (STATUSES[ev.id].control) bossControlLanded++;
    }
    if (probe && ev.id === 'Charmed' && (ev.result === 'applied' || ev.result === 'refreshed')) probe.applied++;
  };

  const strike = (user, move, target, isBossStrike) => {
    const charmedBefore = probe && hasStatus(user, 'Charmed');
    const foeHpBefore = target.hp;
    const act = resolveAction(user);
    if (act.outcome === 'deny') {
      if (probe && act.id === 'Charmed') probe.hesitated++;
      return;
    }
    if (act.outcome === 'self') {
      const d = charmSelfDamage(user, move);
      if (probe) {
        probe.selfStruck++;
        probe.selfDmg.push([d, Math.max(1, Math.floor((user[move.kind === 'magic' ? 'mag' : 'atk'] * (move.power / 2)) / user.def))]);
      }
      user.hp = Math.max(0, user.hp - d);
      wakeIfDamaged(user, d);
      tickStatuses(user, 'onAction');
      if (probe && target.hp !== foeHpBefore) probe.charmerHit += foeHpBefore - target.hp;
      return;
    }
    const d = computeDamage(user, move, target);
    target.hp = Math.max(0, target.hp - d);
    wakeIfDamaged(target, d);
    if (isBossStrike && d > 0) {
      const belowHalf = user.hp <= user.maxHp * user.drain.threshold;
      user.hp = Math.min(user.maxHp, user.hp + Math.floor((belowHalf ? user.drain.below : user.drain.above) * d * healingReceivedMod(user)));
    }
    hitEffects(user, move, d, target);
    tickStatuses(user, 'onAction');
    // The law that matters: a charmed actor may never have reached the foe at all.
    if (probe && charmedBefore && target !== user && target.hp < foeHpBefore) probe.charmerHit += foeHpBefore - target.hp;
  };

  while (true) {
    if (++turns > 500) return { win: false, turns, aliveLeft: aliveLeft(), teamHpLeft: 0, stall: true };
    const move = policy(active, enemy);
    if (playerActsFirst(active, enemy)) {
      strike(active, move, enemy, false);
      if (enemy.hp > 0 && active.hp > 0) strike(enemy, chooseEnemyMove(enemy, active), active, !!enemy.isBoss);
    } else {
      strike(enemy, chooseEnemyMove(enemy, active), active, !!enemy.isBoss);
      if (active.hp > 0 && enemy.hp > 0) strike(active, move, enemy, false);
    }
    if (active.hp > 0 && enemy.hp > 0) {
      tickStatuses(active, 'turnEnd');
      tickStatuses(enemy, 'turnEnd');
    }
    if (enemy.hp <= 0) {
      cleanseControl(enemy);
      const next = foes.findIndex((f, i) => i > fi && f.hp > 0);
      if (next < 0) return { win: true, turns, aliveLeft: aliveLeft(), teamHpLeft: teamHpLeft() };
      fi = next;
      enemy = foes[fi];
    }
    if (active.hp <= 0) {
      cleanseControl(active);
      const idx = team.findIndex((c) => c.hp > 0);
      if (idx < 0) return { win: false, turns, aliveLeft: 0, teamHpLeft: 0 };
      active = team[idx];
    }
  }
}

// ---- reference parties --------------------------------------------------------------
// A numen the PLAYER grew: built at the Lv5 bind and pushed up through the REAL XP path,
// so evolution, innate learns and the skip-on-full rule all come from shipped code
// rather than being restated here. (This is deliberately NOT learnsetKit — the world
// evicts to make room; the player is asked, and headless, declines.)
function grown(species, level) {
  const c = makeCreature(species, 5);
  let guard = 0;
  while (c.level < level && guard++ < 400) gainCreatureXp(c, xpToNext(c.level), level);
  c.hp = c.maxHp;
  return c;
}
// A numen the player BOUND at this level — it joins with the kit it fought with (§4).
const caught = (species, level) => armLearnset(makeCreature(species, level));

const PARTIES = {
  'fresh Lv6': (pick) => [grown(pick, 6)],
  'duo Lv8': (pick) => [grown(pick, 8), caught('Mireling', 8)],
  'trio Lv10': (pick) => [grown(pick, 10), caught('Mireling', 10), caught('Fenmoth', 10)],
};
const PARTY_KEYS = Object.keys(PARTIES);

// ---- (E) the five fights ------------------------------------------------------------
const BANDS = {
  rivalA: { party: 'fresh Lv6', lo: 55, hi: 85, why: 'rival A, at-level — beatable, not free' },
  rivalB: { party: 'duo Lv8', lo: 55, hi: 85, why: 'rival B, at-level — beatable, not free' },
  sellsword: { party: 'duo Lv8', lo: 55, hi: 85, why: 'the sellsword ≈ the rivals' },
  outrider: { party: 'duo Lv8', lo: 35, hi: 65, why: 'the outrider is a stretch' },
  collector: { party: 'trio Lv10', lo: 30, hi: 55, why: 'the collector is meant to sting' },
};
const TRIALS = 1000;

function duelSuite() {
  console.log(`\n=== (E) THE FIVE FIGHTS — player win %, ${TRIALS} trials per cell ===`);
  console.log(`  ${'corelock'.padEnd(11)}${'pick'.padEnd(12)}${PARTY_KEYS.map((k) => k.padStart(11)).join('')}`);
  const table = {};
  for (const def of CORELOCKS) {
    table[def.id] = {};
    for (const party of PARTY_KEYS) table[def.id][party] = {};
    for (const pick of PICKS) {
      const flags = flagsFor(pick, { postBoss: true });
      const cells = [];
      for (const party of PARTY_KEYS) {
        let wins = 0;
        for (let i = 0; i < TRIALS; i++) {
          if (simFight(PARTIES[party](pick), buildCorelockTeam(def, flags), CANONICAL).win) wins++;
        }
        const wr = pct(wins, TRIALS);
        table[def.id][party][pick] = wr;
        cells.push(wr.toFixed(1).padStart(11));
      }
      console.log(`  ${def.id.padEnd(11)}${pick.padEnd(12)}${cells.join('')}`);
    }
  }

  // Three fights cannot reach their band inside this phase's tuning authority (corelock
  // levels ±1). Measured escapes, from the level sweep: sellsword needs +3 (74.2%),
  // outrider +2 (62.4%), collector +2 (45.9%) — all beyond ±1, so they are Shane's
  // calls and they are FLAGGED, not failed. This is the P11 convention for a number
  // outside its target that the phase has no authority to close (there, the misery
  // rows). The set is asserted EXACTLY, so a NEW band miss still fails the sim.
  const KNOWN_GAPS = ['sellsword', 'outrider', 'collector'];
  console.log('\n  --- bands (§6), on the mean across the three starter picks ---');
  const flagged = [];
  for (const [id, b] of Object.entries(BANDS)) {
    const cells = table[id][b.party];
    const mean = PICKS.reduce((s, p) => s + cells[p], 0) / PICKS.length;
    const spread = `${Math.min(...PICKS.map((p) => cells[p])).toFixed(1)}–${Math.max(...PICKS.map((p) => cells[p])).toFixed(1)}`;
    const ok = mean >= b.lo && mean <= b.hi;
    if (!ok) flagged.push({ id, text: `${id} vs ${b.party}: ${mean.toFixed(1)}% (band ${b.lo}–${b.hi})` });
    const row = `${b.why.padEnd(44)} ${b.party.padEnd(10)} mean ${mean.toFixed(1)}%  [picks ${spread}]  band ${b.lo}–${b.hi}`;
    if (ok) check(row, true);
    else if (KNOWN_GAPS.includes(id)) console.log(`  ⚠FLAG  ${row}  — needs out-of-authority tuning (MEGA_BLOCKERS)`);
    else check(row, false);
  }
  check(`the out-of-band set is exactly the three known gaps [${flagged.map((f) => f.id).join(', ')}] — no NEW fight has drifted`,
    flagged.map((f) => f.id).sort().join() === KNOWN_GAPS.slice().sort().join());
  return { table, flagged: flagged.map((f) => f.text) };
}

// ---- (F) the misery re-run ----------------------------------------------------------
// The P11 report's published grid, verbatim, as the predecessor to compare against.
const P11_MISERY = {
  'wild Fenlight Lv5 vs solo Lv5': { Slagling: 100.0, Staticur: 0.0, Marrowling: 0.0 },
  'wild Fenlight Lv6 vs solo Lv7': { Slagling: 100.0, Staticur: 0.0, Marrowling: 0.0 },
  'wild Fenlight Lv7 vs solo Lv7': { Slagling: 21.3, Staticur: 0.0, Marrowling: 0.0 },
};

function miseryCheck() {
  console.log('\n=== (F) THE MISERY RE-RUN — wild learnsets ON (loss rate for the player) ===');
  const N = 2000;
  const soloLoss = (starterMake, wildMake) => {
    let losses = 0;
    for (let i = 0; i < N; i++) {
      const s = starterMake();
      if (!simFight([s], [wildMake()], CANONICAL).win) losses++;
    }
    return pct(losses, N);
  };

  // The P11 grid, re-run with the world arming its wilds.
  const rows = [
    ['wild Fenlight Lv5 vs solo Lv5', 5, () => armLearnset(makeCreature('Fenlight', 5))],
    ['wild Fenlight Lv6 vs solo Lv7', 7, () => armLearnset(makeCreature('Fenlight', 6))],
    ['wild Fenlight Lv7 vs solo Lv7', 7, () => armLearnset(makeCreature('Fenlight', 7))],
  ];
  const crueller = [];
  for (const [label, lv, wildMake] of rows) {
    const cells = [];
    for (const pick of PICKS) {
      const now = soloLoss(() => grown(pick, lv), wildMake);
      const was = P11_MISERY[label][pick];
      cells.push(`${pick} ${now.toFixed(1)}% (P11 ${was.toFixed(1)}%)`);
      if (now > was + 2) crueller.push(`${label} → ${pick}: ${was.toFixed(1)}% → ${now.toFixed(1)}%`);
    }
    console.log(`  ${label.padEnd(32)} ${cells.join('   ')}`);
  }

  // The Deep Hollow — ALLOWED to rise (§4: it got scarier on purpose). Reported, never
  // flagged: a post-boss party walking into an armed Lv9 room should feel it.
  console.log('  --- the Deep Hollow (armed on purpose — reported, not flagged) ---');
  const deep = [
    ['Sistern Lv9 (Undertoll)', () => armLearnset(makeCreature('Sistern', 9))],
    ['Borck Lv9 (Concuss)', () => armLearnset(makeCreature('Borck', 9))],
    ['Marrowling Lv9', () => armLearnset(makeCreature('Marrowling', 9))],
    ['Murkmaw Lv10 (the chase)', () => armLearnset(makeCreature('Murkmaw', 10))],
  ];
  for (const [label, wildMake] of deep) {
    const cells = PICKS.map((pick) => `${pick} ${soloLoss(() => grown(pick, 10), wildMake).toFixed(1)}%`);
    console.log(`    ${label.padEnd(30)} solo Lv10 loses:  ${cells.join('   ')}`);
  }

  check(`no route/cave misery cell got crueler than its P11 predecessor${crueller.length ? ' — ' + crueller.join('; ') : ''}`,
    crueller.length === 0);
  return crueller;
}

// ---- (G) charm live-fire ------------------------------------------------------------
function charmTest() {
  console.log('\n=== (G) CHARM LIVE-FIRE — the coin, the half-power hit, the cleanse ===');
  // Unit: the swap escape hatch, on a party numen holding the collector's charm.
  const victim = makeCreature('Forgewrought', 10);
  applyStatus(victim, 'Charmed');
  applyStatus(victim, 'Burn');
  const removed = cleanseControl(victim);
  check('swapping out cleanses Charmed and leaves the Burn (ledger #18)',
    removed.join() === 'Charmed' && !hasStatus(victim, 'Charmed') && hasStatus(victim, 'Burn'));
  clearStatuses(victim);

  // Unit: the coin is a coin, and the self-hit is half power off its OWN defence.
  applyStatus(victim, 'Charmed');
  check('the coin reads .49 → self-strike, .50 → hesitation',
    resolveAction(victim, seq([0.49])).outcome === 'self' &&
    resolveAction(victim, seq([0.5])).outcome === 'deny');
  const lash = victim.moves.find((m) => m.name === 'Emberlash'); // Ember phys 6, self = ×1
  const want = Math.max(1, Math.floor((victim.atk * 3) / victim.def));
  check(`half-power self-hit = floor(atk·(6/2)/own def) = ${want} (got ${charmSelfDamage(victim, lash)})`,
    charmSelfDamage(victim, lash) === want);
  clearStatuses(victim);

  // Live fire: 600 full duels against the collector, instrumented.
  const probe = { applied: 0, selfStruck: 0, hesitated: 0, charmerHit: 0, selfDmg: [] };
  const flags = flagsFor('Slagling', { postBoss: true });
  let wins = 0;
  for (let i = 0; i < 600; i++) {
    if (simFight(PARTIES['trio Lv10']('Slagling'), buildCorelockTeam(CORELOCK_BY_ID.collector, flags), CANONICAL, probe).win) wins++;
  }
  const acted = probe.selfStruck + probe.hesitated;
  const selfPct = pct(probe.selfStruck, acted);
  console.log(`  600 collector duels: Gloam landed ${probe.applied}× · charmed actions ${acted} ` +
    `(${probe.selfStruck} self-strikes / ${probe.hesitated} hesitations = ${selfPct.toFixed(1)}% self)`);
  check(`Gloam actually lands in play (${probe.applied} applications over 600 duels)`, probe.applied > 100);
  check(`the coin holds up live: ${selfPct.toFixed(1)}% self-strikes (want ~50%)`,
    acted > 200 && Math.abs(selfPct - 50) < 6);
  check('BOTH faces of the coin are exercised', probe.selfStruck > 0 && probe.hesitated > 0);
  check(`a charmed numen NEVER lands a blow on its charmer (${probe.charmerHit} HP dealt across all trials)`,
    probe.charmerHit === 0);
  check('every observed self-hit matched the half-power formula exactly',
    probe.selfDmg.length > 0 && probe.selfDmg.every(([got, want2]) => got === want2));
}

// ---- (H) the Barrow-King suite ------------------------------------------------------
function raisedMireling(level) {
  const c = makeCreature('Mireling', level);
  if (level >= 7) c.moves.push(mv('Blightspore'));
  return c;
}
function raisedStaticur(level) {
  const c = makeCreature('Staticur', level);
  if (level >= 7) c.moves.push(mv('Gust'));
  return c;
}
// The LOCKED Phase-10/11 teams, verbatim. These are hand-built (makeCreature + explicit
// pushes), NOT armed — which is exactly why P12 cannot have moved a single bar.
const TEAMS = {
  'Ember-only: Slagling Lv8': () => [makeCreature('Slagling', 8)],
  'Ember-only: Forgewrought Lv9': () => [makeCreature('Forgewrought', 9)],
  'Ember-only: Forgewrought Lv10': () => [makeCreature('Forgewrought', 10)],
  'Bloom/Gale lead Mireling Lv10': () => [raisedMireling(10), makeCreature('Fenmoth', 10)],
  'Bloom/Gale lead Fenmoth Lv10': () => [makeCreature('Fenmoth', 10), raisedMireling(10)],
  'Diverse 4 Lv10': () => [raisedMireling(10), makeCreature('Fenmoth', 10), makeCreature('Marrowling', 10), makeCreature('Sistern', 10)],
  'Ossclad solo Lv10': () => [makeCreature('Ossclad', 10)],
  'Borck solo Lv10 (the wall)': () => [makeCreature('Borck', 10)],
  'Marrowling BASE solo Lv10': () => [makeCreature('Marrowling', 10)],
  'Staticur solo Lv10 (the easy gate)': () => [raisedStaticur(10)],
  'Staticur+Mireling Lv10': () => [raisedStaticur(10), raisedMireling(10)],
  'Staticur+Fenmoth Lv10': () => [raisedStaticur(10), makeCreature('Fenmoth', 10)],
  // The P11 twin rows — the ONLY teams in the suite that throw control at him, and so
  // the only ones that exercise the immunity law. Their bars must equal their twins'.
  'Diverse 4 Lv10 + Undertoll Sistern': () => [raisedMireling(10), makeCreature('Fenmoth', 10),
    makeCreature('Marrowling', 10), (() => { const c = makeCreature('Sistern', 10); c.moves.push(mv('Undertoll')); return c; })()],
  'Borck solo Lv10 + Concuss': () => [(() => { const c = makeCreature('Borck', 10); c.moves.push(mv('Concuss')); return c; })()],
};

function bossSuite(policyName, policy) {
  const boss = makeBoss('BarrowKing');
  console.log(`\n=== (H) BARROW-KING (HP${boss.maxHp} Atk${boss.atk} Def${boss.def} — UNCHANGED) — ${policyName} ===`);
  const results = {};
  for (const name of Object.keys(TEAMS)) {
    let wins = 0, sumTeam = 0, sumTurns = 0;
    for (let i = 0; i < 2000; i++) {
      const r = simFight(TEAMS[name](), [{ ...boss, hp: boss.maxHp, moves: boss.moves.map((m) => ({ ...m })) }], policy);
      if (r.win) { wins++; sumTeam += r.teamHpLeft; sumTurns += r.turns; }
    }
    results[name] = {
      wr: pct(wins, 2000),
      avgTeam: wins ? +(sumTeam / wins).toFixed(1) : '-',
      avgTurns: wins ? +(sumTurns / wins).toFixed(1) : '-',
    };
    const r = results[name];
    console.log(`  ${name.padEnd(37)} win ${String(r.wr.toFixed(1)).padStart(5)}%  teamHPleft ${String(r.avgTeam).padStart(5)}  turns ${String(r.avgTurns).padStart(4)}`);
  }
  return results;
}

function bossAssertions(canon, seeker) {
  console.log('\n  --- the locked bars (P12 may not move one of them) ---');
  const b = makeBoss('BarrowKing');
  check('boss numbers untouched: HP105 Atk15 Def12 Spd4, drain .33/.43 @ .5 — LOCKED',
    b.maxHp === 105 && b.atk === 15 && b.def === 12 && b.spd === 4 &&
    b.drain.above === 0.33 && b.drain.below === 0.43 && b.drain.threshold === 0.5);
  check('HARD — the Ember-only path is 0% at every level ≤ cap, both policies',
    ['Ember-only: Slagling Lv8', 'Ember-only: Forgewrought Lv9', 'Ember-only: Forgewrought Lv10']
      .every((n) => canon[n].wr === 0 && seeker[n].wr === 0));
  check(`Bloom/Gale duo bars hold, still knife-edge (${canon['Bloom/Gale lead Mireling Lv10'].avgTeam} / ${canon['Bloom/Gale lead Fenmoth Lv10'].avgTeam} HP left)`,
    canon['Bloom/Gale lead Mireling Lv10'].wr === 100 && canon['Bloom/Gale lead Fenmoth Lv10'].wr === 100 &&
    canon['Bloom/Gale lead Mireling Lv10'].avgTeam <= 25 && canon['Bloom/Gale lead Fenmoth Lv10'].avgTeam <= 25);
  check('Ossclad solo 100% both policies; Diverse 4 Lv10 100%',
    canon['Ossclad solo Lv10'].wr === 100 && seeker['Ossclad solo Lv10'].wr === 100 &&
    canon['Diverse 4 Lv10'].wr === 100);
  check('Borck solo is still a stall-LOSS both ways',
    canon['Borck solo Lv10 (the wall)'].wr === 0 && seeker['Borck solo Lv10 (the wall)'].wr === 0);
  check('MEDIUM — Marrowling BASE solo < 25% both policies',
    canon['Marrowling BASE solo Lv10'].wr < 25 && seeker['Marrowling BASE solo Lv10'].wr < 25);
  check(`EASY — Staticur solo still wins limping (${canon['Staticur solo Lv10 (the easy gate)'].wr}% at ${canon['Staticur solo Lv10 (the easy gate)'].avgTeam} HP)`,
    canon['Staticur solo Lv10 (the easy gate)'].wr === 100 &&
    canon['Staticur solo Lv10 (the easy gate)'].avgTeam <= 14);
  check('Staticur duos still clear the bar',
    canon['Staticur+Mireling Lv10'].wr === 100 && canon['Staticur+Fenmoth Lv10'].wr === 100);
  check('TWIN: the Undertoll Sistern changes NOTHING against him — identical to its twin row',
    canon['Diverse 4 Lv10 + Undertoll Sistern'].wr === canon['Diverse 4 Lv10'].wr &&
    canon['Diverse 4 Lv10 + Undertoll Sistern'].avgTeam === canon['Diverse 4 Lv10'].avgTeam &&
    canon['Diverse 4 Lv10 + Undertoll Sistern'].avgTurns === canon['Diverse 4 Lv10'].avgTurns);
  check('TWIN: the Concuss Borck is still the wall, and fishing an immune King still stalls out',
    canon['Borck solo Lv10 + Concuss'].wr === 0 && seeker['Borck solo Lv10 + Concuss'].wr === 0);
  check(`NO control status has EVER landed on the King (${bossControlLanded} landed / ${bossImmuneFires} immune fizzles exercised)`,
    bossControlLanded === 0 && bossImmuneFires > 0);
  return canon;
}

// ---- (I) session hygiene -------------------------------------------------------------
function sessionTest() {
  console.log('\n=== (I) SESSION — a wild lap on every map, and no door out of a duel ===');
  let rolled = 0;
  const bad = [];
  for (const [id, m] of Object.entries(MAPS)) {
    if (!m.encounters) continue;
    for (let i = 0; i < 4000; i++) {
      const w = rollEncounter(m.encounters.table);
      rolled++;
      const want = learnsetKit(w.species, w.level);
      if (w.moves.map((x) => x.name).join() !== want.join()) bad.push(`${id}: ${w.species} Lv${w.level} kit drift`);
      if (w.moves.length > speciesSlots(w.species)) bad.push(`${id}: ${w.species} over slot cap`);
      if (w.moves.some((x) => !MOVES[x.name])) bad.push(`${id}: ${w.species} unknown move`);
    }
  }
  check(`${rolled} wild rolls across every encounter map build legal armed kits${bad.length ? ' — ' + bad[0] : ''}`,
    rolled > 0 && bad.length === 0);
  check('no wild anywhere rolls with Gloam — it belongs to one man',
    (() => {
      for (const m of Object.values(MAPS)) {
        if (!m.encounters) continue;
        for (const e of m.encounters.table) {
          for (let l = e.min; l <= e.max; l++) if (learnsetKit(e.species, l).includes('Gloam')) return false;
        }
      }
      return true;
    })());

  // Saving inside a battle stays impossible: the battle menu has four options and none
  // of them is Save, and the pause menu lives on WorldScene — which is PAUSED for the
  // whole fight (BattleScene calls scene.pause() on the way in, resume() on the way out),
  // so its update() never runs and Esc is not read.
  const battle = src('scenes/BattleScene.js');
  const mainMenu = battle.split('\n  showMain() {')[1].split('\n  showMoves() {')[0];
  const labels = [...mainMenu.matchAll(/\{ label: '([^']+)', enabled/g)].map((m) => m[1]);
  // Fight/Bind/Swap/Run at P12; PHASE13 §3 added Item. The invariant this row guards is
  // that the set is CLOSED and contains no save door — update it deliberately, never by
  // loosening the match.
  check(`the battle's root menu is exactly Fight/Bind/Item/Swap/Run — no save door (${labels.join('/')})`,
    labels.join('/') === 'Fight/Bind/Item/Swap/Run');
  check('BattleScene never imports the pause menu or opens one',
    !/openMenu|saveGame\s*\(\s*\)\s*;?\s*\/\/\s*menu/.test(battle) &&
    /this\.scene\.pause\(\)/.test(src('scenes/WorldScene.js')));
  check('a duel refuses Bind and Run by LINE, and neither refusal costs the turn',
    /if \(this\.duel\) \{[\s\S]{0,160}DUEL_NO_BIND[\s\S]{0,120}showMain/.test(battle) &&
    /if \(this\.duel\) \{[\s\S]{0,160}DUEL_NO_FLEE[\s\S]{0,120}showMain/.test(battle));
}

// ---- run ------------------------------------------------------------------------------
dataTest();
learnsetTest();
seekerTest();
recordTest();
charmTest();
sessionTest();
console.log(failures ? `\n  *** ${failures} FAILURE(S) in the unit pass ***` : '\n  all unit checks pass');

const duels = duelSuite();
const misery = miseryCheck();
const canon = bossSuite('CANONICAL max-damage play', CANONICAL);
const seeker = bossSuite('SEEKER status-fishing play', SEEKER);
bossAssertions(canon, seeker);

console.log('\n=== SUMMARY ===');
console.log(`  duel bands out of range : ${duels.flagged.length}${duels.flagged.length ? ' — ' + duels.flagged.join('; ') : ''}`);
console.log(`  misery cells crueler    : ${misery.length}`);
check(`console-clean session (${noise} warnings/errors from shipped modules)`, noise === 0);
console.log(failures ? `\n*** ${failures} TOTAL FAILURE(S) ***` : '\nALL CHECKS PASS');
process.exit(failures ? 1 : 0);
