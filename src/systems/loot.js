// The loot engine — PHASE13 §5 (ledger #24). Rolls data/loot.js and hands back AWARDS
// plus the lines that narrate them. Pure; `rand` is injectable so the sim can drive the
// distribution and the scene just uses Math.random.
//
// Rolled on every WILD win. Not on duels — a corelock's purse is the reward and doubling
// it would make the grind pointless. Not on the boss — the opened threshold IS his drop.

import { LOOT_TABLES, MAP_MATERIALS, DEFAULT_MATERIALS, RESERVED_FALLBACK, RESERVED_CLASSES } from '../data/loot.js';
import { ITEMS, item } from '../data/items.js';
import { addItem } from './inventory.js';
import { addGilt } from './economy.js';

function pickWeighted(rows, rand) {
  const total = rows.reduce((s, r) => s + r.w, 0);
  let x = rand() * total;
  for (const r of rows) {
    x -= r.w;
    if (x <= 0) return r;
  }
  return rows[rows.length - 1];
}

const between = (min, max, rand) => min + Math.floor(rand() * (max - min + 1));

export function materialsFor(mapId) {
  return MAP_MATERIALS[mapId] || DEFAULT_MATERIALS;
}

function rollMaterial(mapId, rand) {
  const pool = materialsFor(mapId);
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}

// Merge n of an item into an award list (so "2 bone-shard" reads as one line, not two).
function award(list, id, n) {
  const hit = list.find((a) => a.kind === 'item' && a.id === id);
  if (hit) hit.n += n;
  else list.push({ kind: 'item', id, n });
}
function awardGilt(list, amount) {
  const hit = list.find((a) => a.kind === 'gilt');
  if (hit) hit.amount += amount;
  else list.push({ kind: 'gilt', amount });
}

// Roll one wild win. Returns { awards, lines, reserved, row } where `reserved` is the
// payload class that WOULD have dropped had its host system existed — recorded so the
// sim can prove the classes are reachable and so a future phase can find them — and
// `row` is the table entry that won, so the distribution can be checked end to end
// rather than by re-testing the picker in isolation.
export function rollLoot({ rarity, mapId }, rand = Math.random) {
  const table = LOOT_TABLES[rarity];
  if (!table) throw new Error(`No loot table for rarity: ${rarity}`); // loud data bug
  const row = pickWeighted(table, rand);
  const awards = [];
  const lines = [];
  let reserved = null;

  if (row.kind === 'material') {
    for (let i = 0; i < row.n; i++) award(awards, rollMaterial(mapId, rand), 1);
  } else if (row.kind === 'gilt') {
    awardGilt(awards, between(row.min, row.max, rand));
  } else if (row.kind === 'item') {
    award(awards, row.id, row.n);
  } else if (row.kind === 'reserved') {
    // The class is real, the payload is not — yet. Fall back to a rich salvage bundle
    // and say so in the world's voice, without explaining what it was (§8, mystery).
    reserved = row.cls;
    for (let i = 0; i < RESERVED_FALLBACK.materials; i++) award(awards, rollMaterial(mapId, rand), 1);
    awardGilt(awards, between(RESERVED_FALLBACK.gilt.min, RESERVED_FALLBACK.gilt.max, rand));
    lines.push(RESERVED_FALLBACK.line);
  }

  // §7: never a dead drop. Every table row pays something; this is the backstop that
  // makes that a guarantee rather than a property of the current weights.
  if (!awards.length) award(awards, rollMaterial(mapId, rand), 1);
  lines.push(lootLine(awards));
  return { awards, lines, reserved, row };
}

// One log line for the whole drop — "You strip the wreck: 2 bone-shard, 7 gilt."
export function lootLine(awards) {
  const parts = awards.map((a) =>
    a.kind === 'gilt' ? `${a.amount} gilt` : `${a.n}× ${item(a.id).name.toLowerCase()}`
  );
  return `You strip the wreck: ${parts.join(', ')}.`;
}

export function applyLoot(awards, state) {
  for (const a of awards) {
    if (a.kind === 'gilt') addGilt(a.amount, state);
    else addItem(a.id, a.n, state);
  }
  return awards;
}

// Gilt-equivalent worth of a drop at the sell column — the unit §7's economy band is
// measured in ("sell-value + gilt ≈ 1.5-3 salves per route lap").
export function awardsWorth(awards) {
  return awards.reduce(
    (s, a) => s + (a.kind === 'gilt' ? a.amount : (ITEMS[a.id].sell ?? 0) * a.n),
    0
  );
}

export { RESERVED_CLASSES };
