// The quest-flag framework — PHASE14 §2. Contracts are the first thing built on it; the
// story spine (Arc E) is the second, which is why the state machine is deliberately more
// general than the seven notices need. Pure state ops over `flags`, NO Phaser.
//
// State lives entirely in flags, which the save layer already serializes wholesale — so
// contracts and the rep ledger are v5-additive for free, with no save-version bump.
//
//   flags.contracts        { [id]: 'open' | 'active' | 'done' | 'turned' }
//   flags.contractProgress { [id]: n }   — counters for the tick-driven types
//   flags.repLedger        { [faction]: n } — ledger #26. NUMBERS ONLY. Nothing reads it.
//
// 'done' is kept truthful rather than merely stored: syncContracts() re-derives it, so a
// SALVAGE job that the player spent the materials out of drops back to 'active' instead
// of staying claimable.

import { GameState } from './state.js';
import { CONTRACTS, CONTRACT_BY_ID, getContract, ACTIVE_CAP } from '../data/contracts.js';
import { itemCount, removeItem } from './inventory.js';
import { addGilt } from './economy.js';
import { duelWon } from './corelocks.js';

function ensure(flags) {
  if (!flags.contracts) flags.contracts = {};
  if (!flags.contractProgress) flags.contractProgress = {};
  if (!flags.repLedger) flags.repLedger = {};
  return flags;
}

export function contractState(id, flags = GameState.flags) {
  return flags.contracts?.[id] || 'open';
}
export function progressCount(id, flags = GameState.flags) {
  return flags.contractProgress?.[id] || 0;
}

// Visible on the plank at all: gated notices simply are not up yet.
export function contractVisible(def, flags = GameState.flags) {
  return !def.requires || !!flags[def.requires];
}

// What the board shows right now — visible, and not a finished one-shot.
export function boardContracts(flags = GameState.flags) {
  return CONTRACTS.filter(
    (c) => contractVisible(c, flags) && !(contractState(c.id, flags) === 'turned' && !c.repeatable)
  );
}

// ---- progress ----------------------------------------------------------------------
// Two of the four types keep a counter; the other two read the world. Reading beats
// storing wherever the world already knows the answer — a DUEL contract can never
// disagree with flags.duels, and a SALVAGE job can never claim materials you spent.
// `state` is threaded (not read off the singleton) because SALVAGE progress lives in the
// BAG, not the flags — a function that took flags and then quietly consulted a global
// inventory would be untestable and, worse, correct only by accident.
export function progressOf(def, flags = GameState.flags, state = GameState) {
  if (def.type === 'salvage') return { have: itemCount(def.spec.itemId, state), need: def.spec.count };
  if (def.type === 'duel') return { have: duelWon(def.spec.corelockId, flags) ? 1 : 0, need: 1 };
  if (def.type === 'scout') {
    const retro = def.spec.retroFlag && flags[def.spec.retroFlag] ? 1 : 0;
    return { have: Math.max(retro, progressCount(def.id, flags)), need: 1 };
  }
  return { have: progressCount(def.id, flags), need: def.spec.count };
}

export function isComplete(def, flags = GameState.flags, state = GameState) {
  const p = progressOf(def, flags, state);
  return p.have >= p.need;
}

// Re-derive 'active' ↔ 'done' for everything on the slate. Cheap; call it after any tick,
// and whenever the board or the panel is opened.
export function syncContracts(flags = GameState.flags, state = GameState) {
  ensure(flags);
  for (const def of CONTRACTS) {
    const s = flags.contracts[def.id];
    if (s !== 'active' && s !== 'done') continue;
    flags.contracts[def.id] = isComplete(def, flags, state) ? 'done' : 'active';
  }
  return flags;
}

// Everything accepted and not yet paid out — what the cap counts.
export function carried(flags = GameState.flags) {
  return CONTRACTS.filter((c) => ['active', 'done'].includes(contractState(c.id, flags)));
}
export function canAccept(def, flags = GameState.flags) {
  return (
    contractVisible(def, flags) &&
    ['open', 'turned'].includes(contractState(def.id, flags)) &&
    !(contractState(def.id, flags) === 'turned' && !def.repeatable) &&
    carried(flags).length < ACTIVE_CAP
  );
}

export function acceptContract(def, flags = GameState.flags, state = GameState) {
  ensure(flags);
  if (!canAccept(def, flags)) return false;
  flags.contracts[def.id] = 'active';
  flags.contractProgress[def.id] = 0;
  syncContracts(flags, state); // a DUEL already won, or a retro SCOUT, lands 'done' at once
  return true;
}

// ---- the tick hooks ------------------------------------------------------------------
// Both ride event points that already existed. No new systems, no polling.

// A WILD win on `mapId`. Duels and the boss do not count — a cull is thinning the grass,
// not settling a score.
export function tickWildWin(mapId, creature, flags = GameState.flags) {
  ensure(flags);
  let ticked = 0;
  for (const def of CONTRACTS) {
    if (def.type !== 'cull' || contractState(def.id, flags) !== 'active') continue;
    const s = def.spec;
    if (s.mapId && s.mapId !== mapId) continue;
    if (s.species && s.species !== creature?.species) continue;
    if (s.type && s.type !== creature?.type) continue;
    flags.contractProgress[def.id] = progressCount(def.id, flags) + 1;
    ticked++;
  }
  if (ticked) syncContracts(flags);
  return ticked;
}

// A step onto a tile. SCOUT fires ONCE — the counter latches at 1 and further steps in
// the region do nothing.
export function tickTileStep(mapId, x, y, flags = GameState.flags) {
  ensure(flags);
  let ticked = 0;
  for (const def of CONTRACTS) {
    if (def.type !== 'scout' || contractState(def.id, flags) !== 'active') continue;
    const s = def.spec;
    if (s.mapId !== mapId) continue;
    if (x < s.x0 || x > s.x1 || y < s.y0 || y > s.y1) continue;
    if (progressCount(def.id, flags) >= 1) continue;
    flags.contractProgress[def.id] = 1;
    ticked++;
  }
  if (ticked) syncContracts(flags);
  return ticked;
}

// ---- turn-in ---------------------------------------------------------------------------
export function canTurnIn(def, flags = GameState.flags, state = GameState) {
  syncContracts(flags, state);
  return contractState(def.id, flags) === 'done';
}

// Pay out, consume, record. Returns { paid, faction, consumed } or null if it wasn't due.
// SALVAGE consumes EXACTLY the specified count and not a shard more.
export function turnInContract(def, flags = GameState.flags, state = GameState) {
  if (!canTurnIn(def, flags, state)) return null;
  let consumed = 0;
  if (def.type === 'salvage') {
    if (!removeItem(def.spec.itemId, def.spec.count, state)) return null;
    consumed = def.spec.count;
  }
  addGilt(def.payout, state);
  // Ledger #26 — the faction tag, recorded as a number and read by nothing. P15 turns
  // these into reputation; today they are a tally and a promise.
  if (def.faction) flags.repLedger[def.faction] = (flags.repLedger[def.faction] || 0) + 1;
  flags.contracts[def.id] = 'turned';
  flags.contractProgress[def.id] = 0;
  // A standing job goes straight back on the plank, blank, exactly as it was.
  if (def.repeatable) flags.contracts[def.id] = 'open';
  flags.contractsTurned = (flags.contractsTurned || 0) + 1;
  syncContracts(flags);
  return { paid: def.payout, faction: def.faction || null, consumed };
}

export function turnedCount(flags = GameState.flags) {
  return flags.contractsTurned || 0;
}

export function repLedger(flags = GameState.flags) {
  return flags.repLedger || {};
}

// One line per carried job, for the Contracts panel. Terse by instruction (§2).
export function slateLines(flags = GameState.flags, state = GameState) {
  syncContracts(flags, state);
  const mine = carried(flags);
  if (!mine.length) return ['(no work taken)'];
  return mine.map((def) => {
    const p = progressOf(def, flags, state);
    // NOT `state` — that is the parameter, and shadowing it here threw a TDZ error the
    // moment the slate had anything on it (caught in the browser pass, not by the sim,
    // because the sim only ever asked for an EMPTY slate).
    const status = contractState(def.id, flags);
    const bar = status === 'done' ? 'DONE — turn in at the board' : `${p.have}/${p.need}`;
    return `${def.title.padEnd(34)} ${bar}`;
  });
}

export { CONTRACTS, CONTRACT_BY_ID, getContract, ACTIVE_CAP };
