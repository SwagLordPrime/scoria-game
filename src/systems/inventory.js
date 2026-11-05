// The bag — PHASE13 §3. Pure state operations over GameState.inventory, NO Phaser, so
// the battle scene, the locker and the sim all spend items through one implementation.
// The inventory is a flat { [itemId]: count } map; zero counts are deleted rather than
// kept, so "held" is always just the keys.

import { GameState } from './state.js';
import {
  ITEMS, ITEM_IDS, item, CORE_IDS, BASELINE_CORE, HEARTH_CORE_FLOOR, STARTING_KIT,
} from '../data/items.js';

export function inv(state = GameState) {
  if (!state.inventory) state.inventory = {};
  return state.inventory;
}

export function itemCount(id, state = GameState) {
  return inv(state)[id] || 0;
}

export function addItem(id, n = 1, state = GameState) {
  item(id); // loud on a typo in a loot table
  if (n <= 0) return itemCount(id, state);
  const bag = inv(state);
  bag[id] = (bag[id] || 0) + n;
  return bag[id];
}

// Spend n of an item. Returns false and changes NOTHING if the bag is short — every
// caller (throwing a core, drinking a salve, selling) checks the return.
export function removeItem(id, n = 1, state = GameState) {
  const bag = inv(state);
  if ((bag[id] || 0) < n) return false;
  bag[id] -= n;
  if (bag[id] <= 0) delete bag[id];
  return true;
}

// Everything held, in the canonical item order (so menus never reshuffle themselves).
export function heldItems(state = GameState) {
  const bag = inv(state);
  return ITEM_IDS.filter((id) => bag[id] > 0);
}

// What can be USED right now. `where` is 'battle' or 'field'; an item declares 'both',
// one of the two, or null (materials are carried and sold, never used).
export function usableItems(where, state = GameState) {
  return heldItems(state).filter((id) => {
    const w = ITEMS[id].where;
    return w === 'both' || w === where;
  });
}

// Cores held, cheapest tier first — the order the throw menu offers them in, and the
// order an un-chosen throw spends them in (never burn the good one by accident).
export function heldCores(state = GameState) {
  return CORE_IDS.filter((id) => itemCount(id, state) > 0)
    .sort((a, b) => ITEMS[a].bindMult - ITEMS[b].bindMult);
}

export function hasAnyCore(state = GameState) {
  return heldCores(state).length > 0;
}

// Ledger #9, the never-zero law at the hearth: rest tops you back up to three roughs if
// you are under. A gift, not a purchase — you can be broke, you cannot be stranded with
// no way to bind. Returns how many were left by the fire (0 = you were already fine, and
// the scene says nothing).
export function topUpHearthCores(state = GameState) {
  const have = itemCount(BASELINE_CORE, state);
  if (have >= HEARTH_CORE_FLOOR) return 0;
  const granted = HEARTH_CORE_FLOOR - have;
  addItem(BASELINE_CORE, granted, state);
  return granted;
}

// What a New Game is handed, and what a pre-v5 save is handed on migration. P13 is the
// phase that made cores finite; this is the same phase paying for that.
export function grantStartingKit(state = GameState) {
  for (const [id, n] of Object.entries(STARTING_KIT)) addItem(id, n, state);
}

export function sellValue(id, n = 1) {
  return (item(id).sell ?? 0) * n;
}

// The bag's total worth at the sell column — the number §7's economy band is measured in.
export function bagSellValue(state = GameState) {
  return heldItems(state).reduce((sum, id) => sum + sellValue(id, itemCount(id, state)), 0);
}
