// Species table — PHASE3_BUILD_PLAN §4.1 base forms (numbers unchanged) + PHASE6
// evolution lines + PHASE8 Magic stat (canon §6: HP, Atk, Mag, Def, Spd).
//
// Stats are FLAT LEVEL-1 values (HP / Atk / Mag / Def / Spd); a live creature's real
// stats are its base scaled by its level via `statAtLevel` (systems/progression.js).
// Mag is the special-attack analog: magic-kind moves scale off it (combat.js). Bases
// assigned to preserve identity — Sistern 10 is the demo's proto-caster (Warden with a
// resonant bell); everything else sits low-to-mid until Sorcerers arrive with regions.
// PHASE6 fields:
//   moves          — starting moveset, as NAMES into the shared MOVES table (data/moves.js)
//   slots          — move-slot cap for THIS stage. LOCKED rule (design §11.4): 3-stage
//                    line 2 → 3 → 4; single-evolution 3 → 4; non-evolving 4; ultra-rare 5.
//   learnset       — [{ level, move }] innate moves learned on REACHING that level
//                    (starting moves are not repeated here). Full set → replace-prompt.
//   evolvesTo/evolvesAtLevel — level-triggered evolution: on reaching the level the
//                    creature swaps to the new species' base stats at its CURRENT level
//                    (a real jump), keeps its moves, gains the new stage's slot, and
//                    learns the new form's learnset entries it qualifies for.

import { statAtLevel, xpToNext } from '../systems/progression.js';
import { freshTemper } from '../systems/temper.js';
import { mv } from './moves.js';
import { ROLES } from './roles.js';

export const SPECIES = {
  // ---- Slagling line — Ember / Bruiser (player starter), 2 → 3 → 4 slots ----
  Slagling: {
    name: 'Slagling',
    type: 'Ember',
    role: 'Bruiser',
    hp: 32, atk: 12, mag: 4, def: 9, spd: 6,
    slots: 2,
    moves: ['Emberlash', 'Ram'],
    learnset: [],
    evolvesTo: 'Forgewrought',
    evolvesAtLevel: 9,
    blurb: 'A molten scrap-frame on a burning core. Scavenged, scorched, never shiny.',
  },
  Forgewrought: {
    name: 'Forgewrought',
    type: 'Ember',
    role: 'Bruiser',
    hp: 46, atk: 16, mag: 5, def: 13, spd: 7,
    slots: 3,
    moves: ['Emberlash', 'Ram', 'Cinderclad'],
    learnset: [{ level: 9, move: 'Cinderclad' }],
    evolvesTo: 'Warkiln',
    evolvesAtLevel: 15,
    blurb: 'The scrap has been rebuilt into armor. It walks like something forged on purpose.',
  },
  Warkiln: {
    name: 'Warkiln',
    type: 'Ember',
    role: 'Bruiser',
    hp: 66, atk: 21, mag: 6, def: 17, spd: 7,
    slots: 4,
    moves: ['Emberlash', 'Ram', 'Cinderclad', 'Kiln Burst'],
    learnset: [
      { level: 15, move: 'Kiln Burst' },
      { level: 15, move: 'Overheat Slam' },
    ],
    blurb: 'A walking kiln, chimney-crowned. The heat off it warps the air a stride away.',
  },

  // ---- Non-evolving V1 species (no lines designed) — slot cap 4 ------------
  Mireling: {
    name: 'Mireling',
    type: 'Bloom',
    role: 'Bruiser',
    hp: 30, atk: 10, mag: 5, def: 10, spd: 5,
    slots: 4,
    moves: ['Spore Bash', 'Gnash'],
    // PHASE7: a non-evolver's growth beat — the poison utility move arrives at Lv7
    // (also exercises innate learning outside the evolution lines).
    learnset: [{ level: 7, move: 'Blightspore' }],
    blurb: 'Fungal muscle knotted around old bog-iron. It breathes wet.',
  },
  Fenmoth: {
    name: 'Fenmoth',
    type: 'Gale',
    role: 'Striker',
    hp: 20, atk: 12, mag: 6, def: 6, spd: 13,
    slots: 4,
    moves: ['Gust', 'Flit'],
    learnset: [],
    blurb: 'Ash-winged and jittery, gone before the eye can settle on it.',
  },
  Sistern: {
    name: 'Sistern',
    type: 'Tide',
    role: 'Warden',
    hp: 34, atk: 8, mag: 10, def: 12, spd: 5,
    slots: 4,
    moves: ['Douse', 'Toll'],
    // PHASE11 §4: the bell tolls you under — the demo's first Sleep carrier.
    learnset: [{ level: 8, move: 'Undertoll' }],
    blurb: 'A drowned bell-shape that tolls, slow, under still black water.',
  },

  // ---- Marrowling line — Cinder / Bruiser (catchable wild), 2 → 3 → 4 slots -
  Marrowling: {
    name: 'Marrowling',
    type: 'Cinder',
    role: 'Bruiser',
    hp: 28, atk: 11, mag: 3, def: 9, spd: 6,
    slots: 2,
    moves: ['Bone Rake', 'Clatter'],
    learnset: [],
    evolvesTo: 'Ossclad',
    evolvesAtLevel: 9,
    blurb: 'A small clatter of bone, patiently reassembling itself into something worse.',
  },
  Ossclad: {
    name: 'Ossclad',
    type: 'Cinder',
    role: 'Bruiser',
    hp: 42, atk: 15, mag: 4, def: 13, spd: 7,
    slots: 3,
    moves: ['Bone Rake', 'Clatter', 'Marrow Spikes'],
    learnset: [{ level: 9, move: 'Marrow Spikes' }],
    evolvesTo: 'Bonemarch',
    evolvesAtLevel: 15,
    blurb: 'The clatter found its shape: bone lapped over bone like armor grown, not worn.',
  },
  Bonemarch: {
    name: 'Bonemarch',
    type: 'Cinder',
    role: 'Bruiser',
    hp: 60, atk: 19, mag: 5, def: 16, spd: 6,
    slots: 4,
    moves: ['Bone Rake', 'Clatter', 'Marrow Spikes', 'Grave Toll'],
    learnset: [
      { level: 15, move: 'Grave Toll' },
      { level: 15, move: 'Ossuary Crash' },
    ],
    blurb: 'It does not walk so much as process, tolling. Old graves fall in step behind it.',
  },

  // ---- Staticur line — Gale / Striker (PHASE10 starter), single-evo 3 → 4 ----
  // The Remnant castoff: a dire wolf grafted with dead, parasitic, broken tech.
  // Frail, fast, hits hard (striker envelope). Evolves at 12 — ABOVE the pre-boss
  // cap of 10 on purpose: the Staticur picker fights the first gate pre-evolution.
  //
  // TUNED by scripts/sim-phase10.mjs (boss numbers untouched): the §3 opening bid
  // (atk 13 / def 7) LOST the gate solo outright — the fight is deterministic
  // (status-free kits both sides), so it was a hard 0%, not a band miss. Atk 13→15,
  // Def 7→8 lands the intended easy-gate: a 100% win that limps out at 3/39 HP —
  // the deterministic reading of the §8 "60–90, not flawless" band. Still the
  // frailest starter (HP 24 vs 32/28; Def 8 vs 9/9), still the hardest hitter.
  Staticur: {
    name: 'Staticur',
    type: 'Gale',
    role: 'Striker',
    hp: 24, atk: 15, mag: 6, def: 8, spd: 12,
    slots: 3,
    moves: ['Static Lash', 'Nip'],
    learnset: [{ level: 7, move: 'Gust' }],
    evolvesTo: 'Voltwraith',
    evolvesAtLevel: 12,
    blurb: 'A dire wolf grafted with dead tech that never stopped transmitting. It twitches on a signal only it hears.',
  },
  Voltwraith: {
    name: 'Voltwraith',
    type: 'Gale',
    role: 'Striker',
    hp: 38, atk: 20, mag: 8, def: 10, spd: 16,
    slots: 4,
    moves: ['Static Lash', 'Nip', 'Gust', 'Deadband Howl'],
    learnset: [{ level: 12, move: 'Deadband Howl' }],
    blurb: 'It walks upright because the graft prefers it. The wolf inside has stopped arguing.',
  },

  // ==== PHASE9 — the demo region roster (ROSTER.md §5/§6; stats verbatim) =====
  // Rarity is ENCOUNTER data (maps' tables), not species data — a species knows what
  // it is, the world decides how often you meet it.

  // ---- the Ashen Wastes ------------------------------------------------------
  Ashwhelp: {
    name: 'Ashwhelp',
    type: 'Ember',
    role: 'Striker',
    hp: 22, atk: 11, mag: 4, def: 6, spd: 12,
    slots: 4,
    moves: ['Emberlash', 'Nip'],
    learnset: [],
    blurb: "A whelp-shaped knot of char and wire that trails anything warm. Nobody's sure it was ever born — the wastes may have just kindled it.",
  },
  Sporemote: {
    name: 'Sporemote',
    type: 'Bloom',
    role: 'Battle Mage',
    hp: 24, atk: 9, mag: 10, def: 6, spd: 9,
    slots: 3,
    moves: ['Spore Burst', 'Swarm'],
    learnset: [],
    // Lv17 is ABOVE the demo cap of 15 ON PURPOSE (roster §6): it ships in data and
    // gates itself — players max a Sporemote, see it is not done growing, and carry
    // the itch to the next region.
    evolvesTo: 'Mycelegion',
    evolvesAtLevel: 17,
    blurb: 'Not one creature. A drift of spores that votes.',
  },
  Mycelegion: {
    name: 'Mycelegion',
    type: 'Bloom',
    role: 'Battle Mage',
    hp: 40, atk: 13, mag: 15, def: 9, spd: 8,
    slots: 4,
    moves: ['Spore Burst', 'Swarm', 'Sporestorm'],
    learnset: [{ level: 17, move: 'Sporestorm' }],
    blurb: 'Enough of them, for long enough, and the drift agrees on a shape. It is very large, and it is still deciding.',
  },
  Ashcap: {
    name: 'Ashcap',
    type: 'Bloom',
    role: 'Warden',
    hp: 34, atk: 7, mag: 8, def: 12, spd: 4,
    slots: 3,
    moves: ['Spore Bash', 'Spore Burst'],
    learnset: [],
    // The neutral branch of the roster's Lv13 fork; the Wrath branch (Pyrecap) waits
    // on Temper — post-V1, deliberately NOT built.
    evolvesTo: 'Mycolith',
    evolvesAtLevel: 13,
    blurb: 'A squat cap of gray flesh that grew where the burning stopped. It does not move out of the way, because nothing has ever made it.',
  },
  Mycolith: {
    name: 'Mycolith',
    type: 'Bloom',
    role: 'Warden',
    hp: 46, atk: 8, mag: 13, def: 16, spd: 4,
    slots: 4,
    moves: ['Spore Bash', 'Spore Burst', 'Sporestorm'],
    learnset: [{ level: 13, move: 'Sporestorm' }],
    blurb: 'A standing stone that breathes. Travelers stack offerings at its base without knowing why.',
  },

  // ---- the Fell-Grass Route --------------------------------------------------
  Snarebriar: {
    name: 'Snarebriar',
    type: 'Bloom',
    role: 'Trickster',
    hp: 24, atk: 9, mag: 6, def: 8, spd: 11,
    slots: 4,
    moves: ['Spore Bash', 'Barbed Kick'],
    learnset: [],
    blurb: "A briar-tangle that learned a hare's shape and kept none of its innocence. It snares ankles, and is elsewhere by the time you look down.",
  },
  Fenlight: {
    name: 'Fenlight',
    type: 'Tide',
    role: 'Sorcerer', // the game's first Sorcerer
    hp: 24, atk: 5, mag: 13, def: 7, spd: 10,
    slots: 4,
    moves: ['Coldlight', 'Beckon'],
    // PHASE11 §4: the lantern-lure gets teeth. PHASE12 §4 (ledger #27 — Shane's call
    // on the P11 seam): Lull drops 7 → 6, and wilds now arm their learnsets, so the
    // route's rare Lv6 Fenlight opens with it. Counter-intuitively this GENTLES the
    // Slagling trap (control trades away damage tempo — P11 finding, re-simmed in §6).
    learnset: [{ level: 6, move: 'Lull' }],
    // PHASE11 §5 (ledger #20): the route's rare hunts cunning — it fishes the status
    // its target lacks (Slowed via Coldlight at wild levels), then strikes. Commons
    // stay dumb animals; Murkmaw stays greedy until Charmed wires (P12+).
    ai: 'cunning',
    blurb: 'A small cold lantern-glow that walks the ditch-water at dusk. Follow it and the water gets deeper. It knows.',
  },

  // ---- The Hollow / the Deep Hollow -------------------------------------------
  Borck: {
    name: 'Borck',
    type: 'Cinder',
    role: 'Warden',
    hp: 36, atk: 9, mag: 3, def: 13, spd: 4,
    // Ships as a plain strong catchable at 3 slots: the Cairn Path to Dolmen is
    // post-V1 and deliberately NOT built — players will sense there's more to him.
    slots: 3,
    moves: ['Petrified Maul', 'Calcify'],
    // PHASE11 §4: a stone limb, swung flat — the demo's Stun carrier.
    learnset: [{ level: 8, move: 'Concuss' }],
    blurb: "A skeleton that stopped being only bone. Stone grew into the gaps, and now it stands where it's told like something quarried, not born.",
  },
  Murkmaw: {
    name: 'Murkmaw',
    type: 'Umbra', // the game's first Umbra — the Maw's first whisper
    role: 'Trickster',
    hp: 30, atk: 7, mag: 11, def: 9, spd: 12,
    slots: 4,
    moves: ['Drag Under', 'Snatch'],
    learnset: [],
    blurb: "A patch of dark down where no lantern reaches, cast by nothing. It feeds from beneath — even the barrow's dead give it room.",
  },
};

// PHASE10: the legacy-save default starter (§7) — pre-P10 saves backfill as Slagling.
export const STARTER = 'Slagling';

// PHASE10: the offered trio in CANONICAL ORDER (ROSTER §7: Slagling · Staticur ·
// Marrowling). This order is the P12 contract: rival claims resolve "first remaining
// by list order" against THIS list, which is exactly what makes the §7 legacy backfill
// ({ a: Staticur, b: Marrowling }) identical to a new save that picked Slagling.
export const STARTER_CORES = ['Slagling', 'Staticur', 'Marrowling'];

// Move-slot cap for a species (LOCKED rule above; default 4 = non-evolving).
export function speciesSlots(speciesKey) {
  return SPECIES[speciesKey]?.slots ?? 4;
}

// Build a live creature instance from a species key + level. Stats are the species base
// SCALED to `level` (PHASE5). Because scaling is a pure function of {base, level}, a Lv-L
// creature built here is identical whether it was caught at L or raised to L — which is how
// leveled creatures rehydrate exactly from just {species, level} on load. `xp` is progress
// toward the NEXT level; a fresh instance starts at 0. The starting moveset comes from the
// species' move names (clamped to its slot cap); a save with a customized moveset restores
// it over this default (systems/save.js).
export function makeCreature(speciesKey, level = 5) {
  const s = SPECIES[speciesKey];
  if (!s) throw new Error(`Unknown species: ${speciesKey}`);
  if (!ROLES[s.role]) throw new Error(`Unknown role on ${speciesKey}: ${s.role}`); // loud data bug
  const maxHp = statAtLevel(s.hp, level);
  const c = {
    species: speciesKey,
    name: s.name,
    type: s.type,
    role: s.role,
    level,
    xp: 0,
    maxHp,
    hp: maxHp,
    atk: statAtLevel(s.atk, level),
    mag: statAtLevel(s.mag, level),
    def: statAtLevel(s.def, level),
    spd: statAtLevel(s.spd, level),
    moves: s.moves.slice(0, s.slots ?? 4).map(mv),
  };
  // PHASE11 §5 (ledger #20): a species may declare a wild-AI policy; the instance
  // carries it so combat.chooseEnemyMove needs no species lookup. Default (absent)
  // stays greedy — commons are dumb animals on purpose.
  if (s.ai) c.ai = s.ai;
  // PHASE13 §6 (ledger #25): every instance carries Temper meters from birth. Wild and
  // corelock numens get one too and simply never live long enough to use it — cheaper
  // than asking "is this one the player's?" at every accrual site.
  c.temper = freshTemper();
  return c;
}

// PHASE12 §4 (ledger #27) — THE LEARNSET-ARMED KIT. A creature the WORLD fields (a wild
// roll, a corelock's team) knows its base kit PLUS every learnset entry at or below its
// level, clamped to the stage's slot cap. Before P12 the world only ever fielded base
// kits, which is why a Deep-Hollow Lv9 Sistern had never once tolled anyone under.
//
// Contention rule when the candidates overflow the cap: HIGHEST LEVEL WINS — a base-kit
// move counts as level 0, a learnset move as the level it comes due — and among equals
// the earlier seat holds. Survivors are returned in their NATURAL order (base kit in
// authored order, then learnset ascending) so battle logs read the way the kit grew.
// Today only the Lv15 four-slot finishers (Warkiln, Bonemarch) actually overflow; the
// rule is written down anyway because the next roster batch will lean on it.
//
// This is the world's rule, NOT the player's: makeCreature still hands back the species
// base kit, and a raised numen learns on REACHING a level (gainCreatureXp). The one
// place it crosses over is the BIND — a numen you take off the field keeps the kit it
// just fought you with, rather than forgetting moves mid-capture. See the P12 report.
export function learnsetKit(speciesKey, level) {
  const s = SPECIES[speciesKey];
  if (!s) throw new Error(`Unknown species: ${speciesKey}`);
  const slots = s.slots ?? 4;
  const entries = s.moves.slice(0, slots).map((name) => ({ name, level: 0 }));
  for (const e of s.learnset || []) {
    if (e.level > level) continue;
    const known = entries.find((x) => x.name === e.move);
    if (known) known.level = Math.max(known.level, e.level); // it keeps its seat, gains its rank
    else entries.push({ name: e.move, level: e.level });
  }
  if (entries.length <= slots) return entries.map((x) => x.name);
  const kept = new Set(
    entries
      .map((x, i) => ({ level: x.level, i }))
      .sort((a, b) => b.level - a.level || a.i - b.i)
      .slice(0, slots)
      .map((x) => x.i)
  );
  return entries.filter((_, i) => kept.has(i)).map((x) => x.name);
}

// Re-cut a live instance's moveset to its learnset-armed kit. Mutates and returns it.
export function armLearnset(creature) {
  creature.moves = learnsetKit(creature.species, creature.level).map(mv);
  return creature;
}

// Learn a move by name (PHASE6 §2.2). Free slot -> learned in place; full set -> a
// 'pending' event so the UI can run the replace-or-skip prompt (the sim and any other
// headless consumer simply never applies pendings — i.e. "skip"). Already-known moves
// are ignored silently.
function learnMove(creature, moveName, events) {
  if (creature.moves.some((m) => m.name === moveName)) return;
  const move = mv(moveName);
  if (creature.moves.length < speciesSlots(creature.species)) {
    creature.moves.push(move);
    events.push({ kind: 'learned', move });
  } else {
    events.push({ kind: 'pending', move });
  }
}

// Innate learning on REACHING a level (current species' learnset only).
function learnAtLevel(creature, level, events) {
  for (const e of SPECIES[creature.species].learnset || []) {
    if (e.level === level) learnMove(creature, e.move, events);
  }
}

// Level-triggered evolution (PHASE6 §2.1). Swaps to the new species' base stats at the
// creature's CURRENT level (the stat jump comes from the higher bases; the HP POOL grows
// by the maxHp delta — damage taken is kept, same rule as leveling). Keeps its moves,
// then learns everything on the NEW form's learnset it already qualifies for (<= its
// level) — which both fills the newly-opened slot at the evo level and catches up a
// creature that crossed the evo level in one big XP award. Loops so a large award can
// chain stages. NOT gated by the level cap: a creature already at/past its evolution
// level (e.g. a pre-PHASE6 save) evolves on its next XP award even if it can't level.
function maybeEvolve(creature, events) {
  let s = SPECIES[creature.species];
  while (s.evolvesTo && creature.level >= s.evolvesAtLevel) {
    const from = creature.species;
    const next = SPECIES[s.evolvesTo];
    const before = { hp: creature.maxHp, atk: creature.atk, mag: creature.mag, def: creature.def, spd: creature.spd };
    creature.species = s.evolvesTo;
    creature.name = next.name;
    creature.type = next.type;
    creature.role = next.role;
    // PHASE11: the wild-AI policy follows the species (a future cunning line keeps
    // or sheds the flag with its form; rehydrated saves re-stamp via makeCreature).
    if (next.ai) creature.ai = next.ai;
    else delete creature.ai;
    const newMax = statAtLevel(next.hp, creature.level);
    creature.hp += newMax - creature.maxHp;
    creature.maxHp = newMax;
    creature.atk = statAtLevel(next.atk, creature.level);
    creature.mag = statAtLevel(next.mag, creature.level);
    creature.def = statAtLevel(next.def, creature.level);
    creature.spd = statAtLevel(next.spd, creature.level);
    events.push({
      kind: 'evolved',
      from,
      to: creature.species,
      atLevel: creature.level,
      gains: {
        hp: creature.maxHp - before.hp,
        atk: creature.atk - before.atk,
        mag: creature.mag - before.mag,
        def: creature.def - before.def,
        spd: creature.spd - before.spd,
      },
    });
    for (const e of next.learnset || []) {
      if (e.level <= creature.level) learnMove(creature, e.move, events);
    }
    s = SPECIES[creature.species];
  }
}

// Award XP to a single (non-fainted) creature and resolve any level-ups (PHASE5 §2.2),
// plus PHASE6 evolutions and innate move-learning. Level-up rules unchanged: level while
// xp crosses xpToNext(level) AND level < cap; recompute stats off the base at the new
// level; grow the HP POOL by the maxHp delta (do NOT full-heal); a capped creature holds
// no overflow. Each level gained then triggers, in order: innate learns at that level,
// then evolution (which brings the new form's own learns).
//
// Returns the aggregate the battle log renders — `gains` is the LEVELING delta only
// (evolution jumps are excluded; each 'evolved' event carries its own gains) — plus
// `events`: ordered [{kind:'evolved'|'learned'|'pending', ...}] for the UI to narrate
// (evolution beat, "learned X" lines, replace-or-skip prompts).
export function gainCreatureXp(creature, amount, cap) {
  const startLevel = creature.level;
  const start = { hp: creature.maxHp, atk: creature.atk, mag: creature.mag, def: creature.def, spd: creature.spd };
  const events = [];

  // Catch up a creature already at/past its evolution level before the cap gate.
  maybeEvolve(creature, events);

  if (creature.level >= cap) {
    // Already at the cap: excess XP is clamped, not banked. No level, no message.
    creature.xp = 0;
    return { levels: 0, from: startLevel, to: startLevel, gains: null, hitCap: false, atCap: true, events };
  }

  creature.xp += amount;
  let hitCap = false;
  while (creature.level < cap && creature.xp >= xpToNext(creature.level)) {
    creature.xp -= xpToNext(creature.level);
    creature.level += 1;
    const base = SPECIES[creature.species]; // re-read: evolution may have swapped species
    const newMax = statAtLevel(base.hp, creature.level);
    creature.hp += newMax - creature.maxHp; // grow the pool, keep damage taken
    creature.maxHp = newMax;
    creature.atk = statAtLevel(base.atk, creature.level);
    creature.mag = statAtLevel(base.mag, creature.level);
    creature.def = statAtLevel(base.def, creature.level);
    creature.spd = statAtLevel(base.spd, creature.level);
    learnAtLevel(creature, creature.level, events);
    maybeEvolve(creature, events);
    if (creature.level >= cap) {
      creature.xp = 0; // reached the cap this level: drop overflow
      hitCap = true;
    }
  }

  const levels = creature.level - startLevel;
  // Leveling gains exclude evolution jumps (each evo event reports its own).
  const evo = events
    .filter((e) => e.kind === 'evolved')
    .reduce(
      (a, e) => ({ hp: a.hp + e.gains.hp, atk: a.atk + e.gains.atk, mag: a.mag + e.gains.mag, def: a.def + e.gains.def, spd: a.spd + e.gains.spd }),
      { hp: 0, atk: 0, mag: 0, def: 0, spd: 0 }
    );
  const gains = levels
    ? {
        hp: creature.maxHp - start.hp - evo.hp,
        atk: creature.atk - start.atk - evo.atk,
        mag: creature.mag - start.mag - evo.mag,
        def: creature.def - start.def - evo.def,
        spd: creature.spd - start.spd - evo.spd,
      }
    : null;
  return { levels, from: startLevel, to: creature.level, gains, hitCap, atCap: creature.level >= cap, events };
}

// PHASE9 §7: rarity-weighted encounters. Every table entry declares a RARITY TIER;
// the roll picks a tier first (weighted by RARITY_WEIGHTS among the tiers actually
// present in that table), then uniformly among that tier's species. So a table with
// common+uncommon+epic tiers (the Deep Hollow) lands epic at 10/(60+30+10) = 10%,
// and adding a second common species never dilutes the rare — tiers hold their share.
// Starting weights per the plan — TUNE HERE, every table follows.
export const RARITY_WEIGHTS = { common: 60, uncommon: 30, rare: 9, epic: 10 };

// Pick a species + level from a rarity-tiered encounter table. `rand` is injectable so
// the sim can drive the distribution deterministically; gameplay uses Math.random.
// PHASE13 §5: the roll now also stamps `encounter: { rarity, mapId }` onto the instance —
// the loot engine is keyed by the ENCOUNTER's rarity tier (rarity has always lived on the
// table, not the species) and by where you killed it (you strip bone in the barrow-fields
// and fused glass in the wastes). Transient battle data; never serialized.
export function rollEncounter(table, rand = Math.random, mapId = null) {
  const tiers = [...new Set(table.map((e) => e.rarity))];
  for (const t of tiers) {
    if (!RARITY_WEIGHTS[t]) throw new Error(`Unknown encounter rarity: ${t}`); // loud data bug
  }
  const total = tiers.reduce((sum, t) => sum + RARITY_WEIGHTS[t], 0);
  let r = rand() * total;
  let tier = tiers[tiers.length - 1];
  for (const t of tiers) {
    r -= RARITY_WEIGHTS[t];
    if (r <= 0) {
      tier = t;
      break;
    }
  }
  const pool = table.filter((e) => e.rarity === tier);
  const e = pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
  const level = e.min + Math.floor(rand() * (e.max - e.min + 1));
  // PHASE12 §4: the world fields ARMED numens — the wild carries every learnset move it
  // has lived long enough to know. The Deep Hollow got scarier on purpose.
  const c = armLearnset(makeCreature(e.species, level));
  c.encounter = { rarity: e.rarity, mapId };
  return c;
}
