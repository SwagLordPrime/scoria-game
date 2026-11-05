// Save / load — PHASE3_BUILD_PLAN §6. Persists a single JSON blob to localStorage.
// Creature instances are stored slim (species/level/xp/hp + move NAMES) and rehydrated
// from the SPECIES/MOVES tables on load, so saves stay small and forward-compatible.
// PHASE6: the species key IS the evolution state (an evolved creature saves as its
// evolved species and rehydrates from that species' base stats), and the moveset is
// persisted by name because replace-or-skip choices make it diverge from the default.

import { GameState, resetState } from './state.js';
import { makeCreature, speciesSlots } from '../data/creatures.js';
import { MOVES, mv } from '../data/moves.js';
import { levelCapFromFlags } from './progression.js';
import { backfillLegacyFlags } from './starterSelect.js';
import { serializeTemper, deserializeTemper, freshTemper } from './temper.js';
import { grantStartingKit } from './inventory.js';
import { payRetroPurses } from './economy.js';

const KEY = 'creature-collector.save';
const SAVE_VERSION = 5; // v5: PHASE13 — gilt, the bag, per-creature Temper, flags.lootSeen

function serializeCreature(c) {
  // level fully determines scaled stats, so we persist only level + progress + current
  // hp + the moveset (names only — powers/types rehydrate from the MOVES table).
  // PHASE13 §6: Temper rides along. The meters must be REAL histories by the time Arc D
  // arms them, which means they persist from the phase they start turning.
  return {
    species: c.species, level: c.level, xp: c.xp ?? 0, hp: c.hp,
    moves: c.moves.map((m) => m.name),
    temper: serializeTemper(c),
  };
}

function deserializeCreature(d) {
  // Rebuild scaled stats from {species, level}; then restore XP-toward-next and current hp.
  // maxHp is derived (not trusted from disk) so leveled creatures rehydrate identically.
  const c = makeCreature(d.species, d.level ?? 5);
  c.xp = Math.max(0, d.xp ?? 0);
  c.hp = Math.max(0, Math.min(c.maxHp, d.hp ?? c.maxHp));
  // Restore the saved moveset (v3+), dropping unknown names and clamping to the stage's
  // slot cap. Pre-v3 saves (no moves field) keep the species default from makeCreature.
  if (Array.isArray(d.moves)) {
    const restored = d.moves.filter((n) => MOVES[n]).slice(0, speciesSlots(d.species)).map(mv);
    if (restored.length) c.moves = restored;
  }
  // PHASE13: a pre-v5 creature has no meters — it starts at zero, which is honest. It
  // has not been neglected; it has simply not been measured yet.
  c.temper = d.temper ? deserializeTemper(d.temper) : freshTemper();
  return c;
}

export function hasSave() {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function saveGame() {
  const blob = {
    version: SAVE_VERSION,
    party: GameState.party.map(serializeCreature),
    box: GameState.box.map(serializeCreature),
    position: { ...GameState.position },
    facing: GameState.facing,
    flags: GameState.flags,
    seen: GameState.seen,
    caught: GameState.caught,
    gilt: GameState.gilt, // PHASE13 §2
    inventory: GameState.inventory,
    levelCap: GameState.levelCap, // informational; recomputed from flags on load
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(blob));
    return true;
  } catch (e) {
    console.warn('Save failed:', e);
    return false;
  }
}

export function loadGame() {
  let raw;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return false;
  }
  if (!raw) return false;

  let blob;
  try {
    blob = JSON.parse(raw);
  } catch {
    console.warn('Save was corrupt; ignoring.');
    return false;
  }

  const version = blob.version ?? 1;
  GameState.version = version;
  GameState.party = (blob.party || []).map(deserializeCreature);
  GameState.box = (blob.box || []).map(deserializeCreature);
  // PHASE9: Continue restores wherever the save stood (old saves land in town/route/
  // cave untouched); only a blob missing the field entirely falls back to the tavern.
  GameState.position = blob.position || { mapId: 'tavern', x: 8, y: 6 };
  GameState.facing = blob.facing || 'down';
  GameState.flags = blob.flags || { respawn: { mapId: 'tavern', x: 2, y: 5 } };
  GameState.seen = blob.seen || [];
  GameState.caught = blob.caught || [];
  // PHASE10 §7: legacy saves (pre-v4) predate the choice at the table — backfill the
  // contract flags (starterChoice absent → Slagling; rivals → { a: Staticur,
  // b: Marrowling }). Additive: party/position/everything else load untouched, so
  // Continue behaves exactly as before. The check is a LITERAL `< 4`, never
  // `< SAVE_VERSION`: a v4 blob with no starterChoice is a fresh New Game whose pick
  // hasn't happened yet, and backfilling it would silently erase the choice.
  if (version < 4) backfillLegacyFlags(GameState.flags);
  // PHASE13 §2 — the v5 migration, additive and one-way. A pre-v5 blob predates the
  // economy entirely: it loads with an empty purse and an empty bag, is handed the same
  // starting kit a New Game gets (cores only became finite this phase — the game would
  // be unplayable without them), and settles P12's debt by paying out every duel purse
  // it already won. The literal `< 5` matters for the same reason `< 4` did: a v5 blob
  // with an empty bag is a player who spent everything, not a save needing a handout.
  GameState.gilt = blob.gilt ?? 0;
  GameState.inventory = blob.inventory ?? {};
  if (version < 5) grantStartingKit(GameState);
  // The retro payout latches on its own flag, so it is safe on every path — a v5 blob
  // saved before the flag existed still pays exactly once, and never again.
  const retro = payRetroPurses(GameState);
  // Cap is derived from milestone flags (not trusted from disk) — survives reload for free.
  GameState.levelCap = levelCapFromFlags(GameState.flags);
  GameState.pendingRetroPurses = retro.count ? retro : null; // the scene says one quiet line
  return true;
}

// Fresh start: waking in the Emberfall Tavern with an EMPTY party (PHASE10 — the
// auto-grant of Slagling is gone from this path; it survives only as the legacy-save
// default above). The three staked cores in the tavern carry the choice, and
// systems/starterSelect.js grants the pick. Writes an initial save immediately.
export function newGame() {
  resetState();
  grantStartingKit(GameState); // PHASE13 §3: five roughs and two salves. You start poor, not stranded.
  GameState.flags.retroPursesPaid = true; // a fresh world has no P12 debts to settle
  saveGame();
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
