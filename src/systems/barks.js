// The bark engine — PHASE14 §4. Two rules and nothing else: priority order, and never
// the same bark twice in a row. Pure; the scene decides when a "visit" begins.

import { GameState } from './state.js';
import { BARKS } from '../data/barks.js';

export function barkContext(state = GameState) {
  return { flags: state.flags || {}, party: state.party || [], caught: state.caught || [] };
}

// Every bark whose condition currently holds, most important first.
export function eligibleBarks(ctx = barkContext()) {
  return BARKS.filter((b) => {
    try {
      return !!b.when(ctx);
    } catch {
      return false; // a bark that cannot read the world simply does not fire
    }
  }).sort((a, b) => a.priority - b.priority);
}

// The one to say now. Highest priority that is not the one said last time — and if that
// is the ONLY thing true about the player, it waits rather than repeating, which is what
// "never back-to-back" has to mean when there is only one thing to say.
export function pickBark(state = GameState) {
  const ctx = barkContext(state);
  const eligible = eligibleBarks(ctx);
  if (!eligible.length) return null;
  const last = state.flags?.lastBark;
  return eligible.find((b) => b.id !== last) || null;
}

export function recordBark(bark, state = GameState) {
  if (!state.flags) state.flags = {};
  state.flags.lastBark = bark.id;
  return bark;
}
