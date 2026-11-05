// The choice at the table — PHASE10 §2/§5/§7 contract layer. Pure state operations,
// NO Phaser: the WorldScene carries the staging (inspect cards, confirm, the claim
// beat) and calls bindStarter; the Node sim calls the same functions to unit-check
// the flags P12 will build on. flags.starterChoice + flags.rivals are that contract —
// record them wrong and P12 builds on sand.

import { makeCreature, STARTER, STARTER_CORES } from '../data/creatures.js';
import { GameState, markCaught } from './state.js';
import { addCreature } from './party.js';

// Deterministic rival claims (§5): the eager one grabs first by list order of what
// remains in the CANONICAL trio order (ROSTER §7: Slagling · Staticur · Marrowling).
export function rivalClaims(pickedKey) {
  const rest = STARTER_CORES.filter((k) => k !== pickedKey);
  return { a: rest[0], b: rest[1] };
}

// The bind (§2.4): the player receives the picked numen at Lv5, full HP; the Numinary
// marks it seen+caught (the unpicked two stay UNSEEN — they enter the Numinary when
// the rivals field them, P12); the contract flags are written. Confirm-final lives in
// the scene — by the time this runs, the choice is made.
export function bindStarter(speciesKey) {
  if (!STARTER_CORES.includes(speciesKey)) throw new Error(`Not a staked core: ${speciesKey}`);
  const starter = makeCreature(speciesKey, 5);
  addCreature(starter);
  markCaught(speciesKey);
  const rivals = rivalClaims(speciesKey);
  GameState.flags.starterChoice = speciesKey;
  GameState.flags.rivals = rivals;
  return { starter, rivals };
}

// Legacy saves (§7, pre-P10 / save version < 4): starterChoice absent reads as
// Slagling, and the rivals backfill to { a: Staticur, b: Marrowling } — which is
// exactly rivalClaims('Slagling'), so P12 behaves identically for old and new saves.
// Mutates and returns the flags object. NEVER run this on a v4+ blob: a fresh New
// Game legitimately has no starterChoice yet, and backfilling would kill the choice.
export function backfillLegacyFlags(flags) {
  if (!flags.starterChoice) flags.starterChoice = STARTER;
  if (!flags.rivals) flags.rivals = rivalClaims(flags.starterChoice);
  return flags;
}
