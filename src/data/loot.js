// The five-tier loot table — PHASE13 §5 (ledger #24). DATA ONLY; systems/loot.js rolls it.
//
// Keyed by the ENCOUNTER rarity tier (common / uncommon / rare / epic / mythic), because
// rarity has always lived on the encounter table rather than the species (a numen knows
// what it is; the world decides how often you meet it — data/creatures.js §7). The map
// decides only WHICH salvage falls out: you strip bone in the barrow-fields and fused
// glass in the wastes.
//
// Weights are per-tier and sum to 100, so a row's weight reads as its percentage. These
// are TUNABLE this phase (the loot-weight grant); species stats and boss numbers are not.
//
// Entry kinds:
//   material  — n pieces of this map's salvage
//   gilt      — a pinch, min..max inclusive
//   item      — n of a specific item id
//   reserved  — a RESERVED PAYLOAD CLASS ('gear' | 'technique' | 'cosmetic'). The schema
//               exists NOW so the tables are shaped correctly and the drop rates are
//               already tuned; the payloads do not, because their host systems have not
//               shipped (gear → the hero pillar, technique → the forge, cosmetic → the
//               ranch). Until then every reserved roll resolves to RESERVED_FALLBACK —
//               a rich salvage bundle and a line that says, without explaining, that you
//               found something you cannot use yet. Structure now, payloads later.
//               DO NOT build those systems here.

export const LOOT_TABLES = {
  // The grind faucet. Small, frequent, unexciting on purpose — this is what pays for
  // salves, and the band it has to hit is "a route lap ≈ 1.5-3 salves" (§7).
  common: [
    { w: 36, kind: 'material', n: 1 },
    { w: 30, kind: 'gilt', min: 3, max: 10 },
    { w: 18, kind: 'item', id: 'roughCore', n: 1 },
    { w: 16, kind: 'item', id: 'hearthBerry', n: 1 },
  ],
  uncommon: [
    { w: 34, kind: 'material', n: 1 },
    { w: 26, kind: 'gilt', min: 5, max: 12 },
    { w: 20, kind: 'item', id: 'roughCore', n: 1 },
    { w: 20, kind: 'item', id: 'hearthBerry', n: 1 },
  ],
  // Rare is where the kit starts improving rather than just topping up.
  rare: [
    { w: 30, kind: 'material', n: 2 },
    { w: 26, kind: 'gilt', min: 15, max: 30 },
    { w: 22, kind: 'item', id: 'truedCore', n: 1 },
    { w: 14, kind: 'item', id: 'hearthBerry', n: 2 },
    { w: 8, kind: 'reserved', cls: 'technique' },
  ],
  // Epic/mythic: every roll is a good roll, forge-sealed cores are genuinely on the
  // table, and the reserved classes are prominent — so the day they pay out, they pay
  // out here first.
  epic: [
    { w: 26, kind: 'gilt', min: 30, max: 60 },
    { w: 24, kind: 'material', n: 3 },
    { w: 18, kind: 'item', id: 'truedCore', n: 2 },
    { w: 16, kind: 'item', id: 'forgeSealedCore', n: 1 },
    { w: 16, kind: 'reserved', cls: 'gear' },
  ],
  // No mythic numen ships yet (the hidden hunts are P28). The table exists so the tier
  // is not a hole the day one does.
  mythic: [
    { w: 30, kind: 'item', id: 'forgeSealedCore', n: 2 },
    { w: 24, kind: 'gilt', min: 60, max: 120 },
    { w: 24, kind: 'reserved', cls: 'gear' },
    { w: 12, kind: 'reserved', cls: 'technique' },
    { w: 10, kind: 'reserved', cls: 'cosmetic' },
  ],
};

export const RESERVED_CLASSES = ['gear', 'technique', 'cosmetic'];

// What a reserved roll actually pays until its host system ships. Rich enough that the
// player is not punished for rolling it, vague enough that it promises something.
export const RESERVED_FALLBACK = {
  materials: 2,
  gilt: { min: 10, max: 20 },
  line: 'Something in the wreck is beyond you — you strip what you can.',
};

// Which salvage a place leaves behind.
export const MAP_MATERIALS = {
  route: ['sporeLeather', 'wireSpool'],
  cave: ['boneShard', 'wireSpool'],
  deephollow: ['boneShard', 'ashGlass'],
  wastes: ['ashGlass', 'wireSpool'],
};
export const DEFAULT_MATERIALS = ['boneShard', 'wireSpool'];
