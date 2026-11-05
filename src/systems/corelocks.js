// The duel rule set — PHASE12 §2. Pure state operations over the corelock DATA
// (data/corelocks.js), NO Phaser: the WorldScene stages the challenge, the BattleScene
// fights it, and scripts/sim-phase12.mjs unit-checks the same functions headlessly.
// A duel is the ordinary battle with three laws bolted on — no binding, no fleeing,
// and a TEAM on the other side — so nothing in combat.js or status.js changes here.

import { makeCreature, speciesSlots, armLearnset } from '../data/creatures.js';
import { mv } from '../data/moves.js';
import { CORELOCKS, getCorelock } from '../data/corelocks.js';
import { GameState } from './state.js';

// The two refusals, verbatim. Data, not scene strings, so the sim asserts the exact
// register the player reads (§6). Mystery over hand-holding: neither line explains
// the rule, and neither costs the player a turn.
export const DUEL_NO_BIND = 'Its core answers to another.';
export const DUEL_NO_FLEE = 'You signed the duel.';

// The purse line. Gilt does not exist yet (P13) — the number is spoken and the flag is
// recorded, and P13's first v5 load pays every recorded win exactly once.
export function purseLine(purse) {
  return `The purse is yours — ${purse} gilt.`;
}

// ---- presence -------------------------------------------------------------------
// A corelock exists in the world only once its gate flag is set: the rivals need the
// table resolved (flags.rivals is where their numens come from), and the collector is
// post-boss ONLY — he is standing in a room that does not open until the King falls.
export function corelockPresent(def, flags = GameState.flags) {
  return !def.requires || !!flags[def.requires];
}

export function corelocksOn(mapId, flags = GameState.flags) {
  return CORELOCKS.filter((c) => c.mapId === mapId && corelockPresent(c, flags));
}

export function corelockAt(mapId, x, y, flags = GameState.flags) {
  return corelocksOn(mapId, flags).find((c) => c.x === x && c.y === y) || null;
}

// ---- the record (the P15 rep seam, ledger #26) ------------------------------------
// `duels[id]` is the headline result P13 (retro purses) and P14 (DUEL contracts) read.
// `duelRecord[id]` keeps the TIMES — who, how often, which way — because the ledger
// remembers everything and P15 will want the history, not just the latest word.
function ensureDuelFlags(flags) {
  if (!flags.duels) flags.duels = {};
  if (!flags.duelRecord) flags.duelRecord = {};
  if (!flags.duelsMet) flags.duelsMet = {};
  if (typeof flags.duelLossCount !== 'number') flags.duelLossCount = 0;
  return flags;
}

function bump(flags, id, key) {
  const r = (flags.duelRecord[id] ??= { won: 0, lost: 0 });
  r[key] += 1;
  return r;
}

export function duelResult(id, flags = GameState.flags) {
  return flags.duels?.[id];
}
export function duelWon(id, flags = GameState.flags) {
  return duelResult(id, flags) === 'won';
}
// A won corelock stands down (rematch: false in V1). A LOSS leaves them standing, so a
// beaten party can heal and come back — the duel is a wall, never a dead end.
export function duelAvailable(def, flags = GameState.flags) {
  return corelockPresent(def, flags) && !(duelWon(def.id, flags) && !def.rematch);
}

export function recordDuelWin(def, flags = GameState.flags) {
  ensureDuelFlags(flags);
  flags.duels[def.id] = 'won';
  bump(flags, def.id, 'won');
  return flags.duels[def.id];
}

export function recordDuelLoss(def, flags = GameState.flags) {
  ensureDuelFlags(flags);
  flags.duels[def.id] = 'lost';
  bump(flags, def.id, 'lost');
  flags.duelLossCount += 1;
  return flags.duels[def.id];
}

// The eager rival jumps you ONCE (data/corelocks.js `challengeOnEnter`); after that he
// waits at his bend like everyone else.
export function duelMet(def, flags = GameState.flags) {
  return !!flags.duelsMet?.[def.id];
}
export function markDuelMet(def, flags = GameState.flags) {
  ensureDuelFlags(flags);
  flags.duelsMet[def.id] = true;
}

// The corelock that ambushes on entering `mapId`, or null. Fires only while it has
// never fired and the duel is still standing.
export function ambushOn(mapId, flags = GameState.flags) {
  return (
    corelocksOn(mapId, flags).find(
      (c) => c.challengeOnEnter && !duelMet(c, flags) && duelAvailable(c, flags)
    ) || null
  );
}

// ---- the team ---------------------------------------------------------------------
export function corelockTeamSpec(def, flags = GameState.flags) {
  return typeof def.team === 'function' ? def.team(flags) : def.team;
}

// One numen on a corelock's bench. `moves` overrides the species kit outright (the
// collector's Murkmaw); absent, it fields the §4 learnset-armed kit — the same rule the
// wilds now follow, so a corelock's Lv8 Sistern tolls exactly like the Hollow's does.
// Every corelock numen carries the SEEKER policy (§2): P11's cunning logic promoted out
// of the sim and into the game — it fishes a status the target lacks and never fishes
// past a kill.
export function makeCorelockNumen(spec, ai = 'seeker') {
  if (!spec || !spec.species) throw new Error('Corelock team entry has no species');
  const c = makeCreature(spec.species, spec.level);
  if (spec.moves) c.moves = spec.moves.slice(0, speciesSlots(spec.species)).map(mv);
  else armLearnset(c);
  c.ai = ai;
  return c;
}

export function buildCorelockTeam(def, flags = GameState.flags) {
  const spec = corelockTeamSpec(def, flags);
  if (!spec || !spec.length) throw new Error(`Corelock ${def.id} fields no team`);
  return spec.map((s) => makeCorelockNumen(s, def.ai ?? 'seeker'));
}

export { getCorelock, CORELOCKS };
