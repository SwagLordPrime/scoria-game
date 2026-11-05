// Type chart — PHASE3_BUILD_PLAN §4.2 pentagon (numbers unchanged) + PHASE8 Arcane
// Expansion: the exotic pair (DESIGN_OVERVIEW §7b). SEVEN types total.
//
// Rules (canon §7):
//   - The elemental five keep the pentagon exactly: each beats the two after it
//     (super ×1.5), loses to the two before it (resisted ×0.66).
//   - Five attacking Umbra/Aether → SHRUGGED ×0.85 (barely of this world; ordinary
//     elements only graze them).
//   - Umbra ↔ Aether → ×1.5 BOTH directions (mutual annihilation — encoded in BEATS,
//     so the super check catches it before the resist check ever runs).
//   - Umbra/Aether attacking the five → ×1. Same-vs-same → ×1.
//   - Typeless (Neutral) moves → ×1 vs everything, as always.
//
// NO Umbra/Aether creatures or moves ship yet (region content, rare-tier only — the
// universal shrug is safe only while exotics stay scarce). The chart is complete and
// sim-tested now (scripts/sim-phase8.mjs) so content can land on a verified substrate.

export const ELEMENTAL = ['Ember', 'Bloom', 'Gale', 'Cinder', 'Tide'];
export const EXOTIC = ['Umbra', 'Aether'];
export const TYPES = [...ELEMENTAL, ...EXOTIC];

export const BEATS = {
  Ember: ['Bloom', 'Gale'],
  Bloom: ['Gale', 'Cinder'],
  Gale: ['Cinder', 'Tide'],
  Cinder: ['Tide', 'Ember'],
  Tide: ['Ember', 'Bloom'],
  // the war at the bottom of the world — each is the other's counter
  Umbra: ['Aether'],
  Aether: ['Umbra'],
};

// Muted palette entries for the exotic pair (grounded, like the five). No creature
// wears them yet; chips/sprites pick these up the day exotic content lands.
export const TYPE_COLORS = {
  Ember: '#a55a3a',
  Tide: '#4f6b82',
  Bloom: '#6f7d45',
  Gale: '#8f8aa6',
  Cinder: '#9a9186',
  Umbra: '#5c4f6e',
  Aether: '#a89a6b',
  Neutral: '#8f8a80',
};

// Multiplier tiers (canon §7b): super ×1.5 · neutral ×1 · shrugged ×0.85 · resisted ×0.66.
export const MULT = { super: 1.5, neutral: 1.0, shrug: 0.85, resist: 0.66 };

// Multiplier for a move of `moveType` striking a creature of `defType`.
// Check order matters: super BEFORE resist (the mutual Umbra↔Aether pair matches both
// tables — super must win), and the shrug only applies to elemental-vs-exotic.
export function typeMultiplier(moveType, defType) {
  if (moveType === 'Neutral') return MULT.neutral;
  if (BEATS[moveType] && BEATS[moveType].includes(defType)) return MULT.super;
  if (ELEMENTAL.includes(moveType) && EXOTIC.includes(defType)) return MULT.shrug;
  if (BEATS[defType] && BEATS[defType].includes(moveType)) return MULT.resist;
  return MULT.neutral;
}
