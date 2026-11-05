// The field kit — PHASE13 §3. Lean by decision (the F2 economy session): six carried
// items, four salvage materials, one treat. Everything a merc puts in a bag is DATA,
// keyed by id; systems/inventory.js counts them and the scenes spend them.
//
// Fields:
//   kind      — 'heal' | 'cleanse' | 'core' | 'treat' | 'material'
//   where     — 'both' | 'field' | 'battle' | null (a material is never "used")
//   buy/sell  — locker prices. buy: null = never sold, drop-only (ledger #9's
//               forge-sealed core is the whole point of that column existing).
//   healFrac  — fraction of maxHp restored.
//   bindMult  — multiplier on the catch formula, applied BEFORE the 0.9 cap and
//               stacking with Sleep's ×1.5 (ledger #16 — the cap still rules).
//   bond      — Temper Bond fed on use (§6; the hearth-berry is canon §11.1's first
//               active Bond source, arriving with the meters that read it).
//
// ⚠ WORKING NAME: hearth-berry (Shane vetoes). Names are one-line changes here.

export const ITEMS = {
  salve: {
    id: 'salve', name: 'Salve', kind: 'heal', where: 'both',
    buy: 25, sell: 8, healFrac: 0.35,
    blurb: 'Rendered fat and something bitter. It closes what it can.',
  },
  deepSalve: {
    id: 'deepSalve', name: 'Deep salve', kind: 'heal', where: 'both',
    buy: 60, sell: 20, healFrac: 0.70,
    blurb: 'The good stuff, from before. Nobody in Emberfall knows how to make more.',
  },
  cleanRag: {
    id: 'cleanRag', name: 'Clean rag', kind: 'cleanse', where: 'both',
    buy: 40, sell: 12,
    blurb: 'Boiled, folded, kept dry. Half of surviving out here is being clean.',
  },
  roughCore: {
    id: 'roughCore', name: 'Rough core', kind: 'core', where: 'battle',
    buy: 20, sell: 6, bindMult: 1.0,
    blurb: 'Salvage-grade. It holds if the thing inside has stopped arguing.',
  },
  truedCore: {
    id: 'truedCore', name: 'Trued core', kind: 'core', where: 'battle',
    buy: 60, sell: 20, bindMult: 1.25,
    blurb: 'Filed true by somebody patient. The seam sits flush.',
  },
  forgeSealedCore: {
    id: 'forgeSealedCore', name: 'Forge-sealed core', kind: 'core', where: 'battle',
    buy: null, sell: 90, bindMult: 1.6, // drop-only — the locker never carries one
    blurb: 'Sealed hot and stamped. The Forge does not sell these; you find them.',
  },
  hearthBerry: {
    id: 'hearthBerry', name: 'Hearth-berry', kind: 'treat', where: 'both',
    buy: null, sell: 8, healFrac: 0.25, bond: 3,
    blurb: 'Grows where a fire burned long enough. They like it. That is the whole of it.',
  },

  // ---- salvage materials (§5) — sell-only; the grind faucet's actual currency -------
  boneShard: {
    id: 'boneShard', name: 'Bone-shard', kind: 'material', where: null,
    buy: null, sell: 4,
    blurb: 'Barrow-field leavings. The Forge kilns want it and asks no questions.',
  },
  wireSpool: {
    id: 'wireSpool', name: 'Wire-spool', kind: 'material', where: null,
    buy: null, sell: 7,
    blurb: 'Pulled out of something that used to tick. Still bright under the grime.',
  },
  sporeLeather: {
    id: 'sporeLeather', name: 'Spore-leather', kind: 'material', where: null,
    buy: null, sell: 9,
    blurb: 'Cured fungal hide. Waterproof, and it never quite stops smelling of the bog.',
  },
  ashGlass: {
    id: 'ashGlass', name: 'Ash-glass', kind: 'material', where: null,
    buy: null, sell: 12,
    blurb: 'Sand the war fused where it stood. Holds a green light at the edges.',
  },
};

export const ITEM_IDS = Object.keys(ITEMS);

export function item(id) {
  const it = ITEMS[id];
  if (!it) throw new Error(`Unknown item: ${id}`); // loud: a typo in a loot table is a data bug
  return it;
}

// The locker's stock (§4) — static in V1, and ORDERED for the menu. The forge-sealed
// core is absent by design: buy === null means it is not for sale anywhere.
export const LOCKER_STOCK = ['salve', 'deepSalve', 'cleanRag', 'roughCore', 'truedCore'];

// Ledger #9, the never-zero law: the locker never runs dry of THIS, and a hearth rest
// tops you back up to HEARTH_CORE_FLOOR of them. You can be broke; you cannot be
// stranded with no way to bind.
export const BASELINE_CORE = 'roughCore';
export const HEARTH_CORE_FLOOR = 3;

// What a New Game (and a legacy save crossing into v5) is handed. Not generosity —
// the game is unplayable without a core, and P13 is the phase that made cores finite.
export const STARTING_KIT = { roughCore: 5, salve: 2 };

export const CORE_IDS = ITEM_IDS.filter((id) => ITEMS[id].kind === 'core');
export const MATERIAL_IDS = ITEM_IDS.filter((id) => ITEMS[id].kind === 'material');

// Cheapest core first — the tier the player spends when they do not choose.
export function coresByTier() {
  return CORE_IDS.slice().sort((a, b) => ITEMS[a].bindMult - ITEMS[b].bindMult);
}
