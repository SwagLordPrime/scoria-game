// The single in-memory game state. save.js serializes this; scenes read/mutate it.
// Kept as a plain singleton object so any module can import the live state.

import { BASE_LEVEL_CAP } from './progression.js';

// PHASE9: a fresh game wakes in the Emberfall Tavern (STORY_AND_WORLD §9 — the merc's
// origin); the default safe point is the tavern hearth. Loaded saves overwrite both,
// so an old save Continues exactly where it stood.
const NEW_GAME_POSITION = { mapId: 'tavern', x: 8, y: 6 };
const NEW_GAME_RESPAWN = { mapId: 'tavern', x: 2, y: 5 };

export const GameState = {
  version: 1,
  party: [], // creature instances (max 6)
  box: [], // overflow storage
  position: { ...NEW_GAME_POSITION },
  facing: 'up',
  // world progress + safe point. respawn is stored as {mapId,x,y} (matching what
  // useHeal writes) so black-out works even before the player ever uses a hearth.
  flags: { respawn: { ...NEW_GAME_RESPAWN } },
  seen: [], // compendium: species encountered
  caught: [], // compendium: species bound
  // PHASE13 §2: the merc economy. `gilt` is one int; `inventory` is a flat
  // { [itemId]: count } bag (systems/inventory.js owns every mutation of it). Both are
  // additive save-v5 fields — a v4 blob loads with gilt 0 and the starting kit granted.
  gilt: 0,
  inventory: {},
  // PHASE5 leveling: current cap, derived from milestone flags (see progression.js).
  // Kept as a live field so scenes/UI can read it cheaply; save.js recomputes it on load
  // so it survives reload and resets on New Game with the flags it derives from.
  levelCap: BASE_LEVEL_CAP,
};

export function resetState() {
  GameState.version = 1;
  GameState.party = [];
  GameState.box = [];
  GameState.position = { ...NEW_GAME_POSITION };
  GameState.facing = 'up';
  GameState.flags = { respawn: { ...NEW_GAME_RESPAWN } };
  GameState.seen = [];
  GameState.caught = [];
  GameState.gilt = 0;
  GameState.inventory = {};
  GameState.levelCap = BASE_LEVEL_CAP;
}

export function markSeen(species) {
  if (!GameState.seen.includes(species)) GameState.seen.push(species);
}

export function markCaught(species) {
  markSeen(species);
  if (!GameState.caught.includes(species)) GameState.caught.push(species);
}
