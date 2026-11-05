// Gilt — PHASE13 §2. The merc economy's one number, plus the two ways it bleeds and the
// one-time debt P12 left behind. Pure state ops, no Phaser.
//
// Gilt is a homophone of guilt and that is the whole joke: the economy runs on it,
// forever, unacknowledged (NAMES.md). Nothing in here says so.

import { GameState } from './state.js';
import { CORELOCK_BY_ID } from '../data/corelocks.js';

export const WILD_WIPE_FRACTION = 0.10; // ledger #10
export const DUEL_STAKE_MIN = 10; // ledger #26

export function gilt(state = GameState) {
  return state.gilt || 0;
}

export function addGilt(n, state = GameState) {
  state.gilt = Math.max(0, gilt(state) + Math.max(0, Math.floor(n)));
  return state.gilt;
}

// Spend. Returns false and changes nothing if the purse is short.
export function spendGilt(n, state = GameState) {
  const cost = Math.max(0, Math.floor(n));
  if (gilt(state) < cost) return false;
  state.gilt = gilt(state) - cost;
  return true;
}

// Take up to n, whatever is there. Returns what was actually taken — the wipe laws never
// push you negative and never touch items or numens.
export function takeGilt(n, state = GameState) {
  const taken = Math.min(gilt(state), Math.max(0, Math.floor(n)));
  state.gilt = gilt(state) - taken;
  return taken;
}

// Ledger #10 — a wild-battle party wipe costs 10% of CARRIED gilt, floored at 0. One dry
// log line, never items, never numens.
export function wildWipeLoss(state = GameState) {
  return takeGilt(Math.floor(gilt(state) * WILD_WIPE_FRACTION), state);
}

// Ledger #26 — a lost duel costs the STAKE instead: half the purse that was riding on it,
// minimum 10, capped by what you are carrying. The purse rides both ways, which is the
// point: a duel is worth taking and worth being ready for.
export function duelStakeFor(purse) {
  return Math.max(DUEL_STAKE_MIN, Math.floor(purse / 2));
}

export function duelWipeLoss(purse, state = GameState) {
  return takeGilt(duelStakeFor(purse), state);
}

// P12 recorded its purses as flags because gilt did not exist yet. This is the debt being
// settled: on the FIRST v5 load, every duel already won pays out, exactly once, and the
// latch is a flag so it can never pay twice — not on reload, not on re-migration.
// Returns { paid, count, ids } so the scene can say one quiet line about it.
export function payRetroPurses(state = GameState) {
  const flags = state.flags || {};
  if (flags.retroPursesPaid) return { paid: 0, count: 0, ids: [] };
  flags.retroPursesPaid = true;
  const ids = Object.entries(flags.duels || {})
    .filter(([id, result]) => result === 'won' && CORELOCK_BY_ID[id])
    .map(([id]) => id);
  let paid = 0;
  for (const id of ids) {
    paid += CORELOCK_BY_ID[id].purse;
    addGilt(CORELOCK_BY_ID[id].purse, state);
  }
  return { paid, count: ids.length, ids };
}
