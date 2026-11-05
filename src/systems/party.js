// Party / box operations over the live GameState.

import { GameState } from './state.js';

export const PARTY_MAX = 6;

// Add a creature to the party; overflow past 6 goes to the box.
// Returns 'party' or 'box' so the UI can tell the player where it went.
export function addCreature(creature) {
  if (GameState.party.length < PARTY_MAX) {
    GameState.party.push(creature);
    return 'party';
  }
  GameState.box.push(creature);
  return 'box';
}

export function healParty() {
  for (const c of GameState.party) c.hp = c.maxHp;
}

export function firstAlive(party = GameState.party) {
  return party.find((c) => c.hp > 0) || null;
}

export function aliveCount(party = GameState.party) {
  return party.filter((c) => c.hp > 0).length;
}

export function partyWiped() {
  return GameState.party.length > 0 && GameState.party.every((c) => c.hp <= 0);
}
