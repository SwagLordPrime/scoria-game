// Status-effect engine — PHASE7_BUILD_PLAN §2.1. Pure functions over the STATUSES data
// (data/statuses.js), NO Phaser and no scene knowledge, so the battle scene and the Node
// tuning sim share exactly one implementation. A creature's active statuses live on the
// instance as `statuses: [{ id, turnsLeft }]` (lazily created; battle-only — the battle
// scene clears every combatant when it ends, and save.js never serializes the field).

import { STATUSES } from '../data/statuses.js';

function ensure(creature) {
  if (!creature.statuses) creature.statuses = [];
  return creature.statuses;
}

export function hasStatus(creature, id) {
  return !!creature.statuses && creature.statuses.some((s) => s.id === id);
}

// UI helper: active statuses with their defs, in application order.
export function activeStatuses(creature) {
  return (creature.statuses || []).map((s) => ({ ...s, def: STATUSES[s.id] }));
}

// Apply a status by id. One instance per id: re-applying REFRESHES the duration;
// different statuses stack with each other. Returns 'applied' | 'refreshed'.
export function applyStatus(creature, id) {
  const def = STATUSES[id];
  if (!def) throw new Error(`Unknown status: ${id}`);
  const list = ensure(creature);
  const existing = list.find((s) => s.id === id);
  if (existing) {
    existing.turnsLeft = def.duration;
    return 'refreshed';
  }
  list.push({ id, turnsLeft: def.duration });
  return 'applied';
}

// The on-hit hook (PHASE7 §2.2): roll a move's `applies: { status, chance }` against a
// living target. Returns { id, result } or null (no spec / roll failed / target down).
// This is also the seam a future PASSIVE uses to apply a status on-hit — passives call
// this same function with their own spec; nothing else changes.
//
// PHASE11 refusals (both roll AFTER the chance, so the log only speaks when an apply
// actually fizzled, not on every glancing hit):
//   'immune'  — boss law (ledger #21): isBoss targets refuse `control` statuses
//               outright. DoTs/statMods land as they always have.
//   'blocked' — the Braced window (ledger #15): a status with `braceAfter` cannot land
//               while its brace entry is still on the target. No chains, either side.
export function tryApplyStatus(target, applies, rand = Math.random) {
  if (!applies || target.hp <= 0) return null;
  if (rand() >= applies.chance) return null;
  const def = STATUSES[applies.status];
  if (!def) throw new Error(`Unknown status: ${applies.status}`);
  if (def.control && target.isBoss) return { id: applies.status, result: 'immune' };
  if (def.braceAfter && hasStatus(target, def.braceAfter)) return { id: applies.status, result: 'blocked' };
  return { id: applies.status, result: applyStatus(target, applies.status) };
}

// PHASE11 §2.1 — the onAct hook. Called before a creature's chosen action resolves;
// the first control status in application order that objects decides the outcome:
//   { outcome: 'act' }               — nothing objects; the action proceeds.
//   { outcome: 'deny', id }          — the turn is consumed, nothing happens (Stunned,
//                                      Sleep, a Shock fizzle, a Charmed hesitation).
//   { outcome: 'self', id }          — the ledger-#17 redirect: the creature strikes
//                                      ITSELF at half power (the caller computes the
//                                      damage — combat.charmSelfDamage — because this
//                                      module stays import-free of combat math).
// Stunned spends itself on its deny (consumeOnDeny) and leaves the bearer Braced
// (braceAfter) — the anti-stunlock law. `rand` is injectable for the sim.
export function resolveAction(creature, rand = Math.random) {
  for (const s of creature.statuses || []) {
    const def = STATUSES[s.id];
    if (!def.control) continue;
    if (def.denyAct) {
      if (def.consumeOnDeny) {
        creature.statuses = creature.statuses.filter((x) => x.id !== s.id);
        if (def.braceAfter) {
          applyStatus(creature, def.braceAfter);
          // Ledger #15 exactness: the brace is set MID-turn, and the same turn's
          // end-tick must not burn a window turn no apply attempt could have used
          // (found by the P11 verify pass: a faster stun-carrier got a re-stun in
          // 2 turns instead of 3). The tick it was born under is a grace tick.
          const b = creature.statuses.find((x) => x.id === def.braceAfter);
          if (b) b.graceTick = true;
        }
      }
      return { outcome: 'deny', id: s.id };
    }
    if (def.fizzleChance && rand() < def.fizzleChance) return { outcome: 'deny', id: s.id };
    if (def.charm) return { outcome: rand() < 0.5 ? 'self' : 'deny', id: s.id };
  }
  return { outcome: 'act' };
}

// PHASE11 §2.2 — the onDamaged hook. Any damage clears a wakeOnDamage status (Sleep).
// Call it immediately AFTER damage lands and BEFORE drain/recoil bookkeeping (the
// plan's ordering law). Returns a wake event for the log, or null. Damage-less events
// (a status tick that deals nothing, a pure statMod) never wake a sleeper — and
// neither does the blow that FELLS it (hp 0 never wakes, same law the tick path
// enforces; found by the P11 verify pass: a KO'd sleeper narrated waking before its
// death line).
export function wakeIfDamaged(creature, dmg) {
  if (dmg > 0 && creature.hp > 0 && creature.statuses) {
    const asleep = creature.statuses.find((s) => STATUSES[s.id].wakeOnDamage);
    if (asleep) {
      creature.statuses = creature.statuses.filter((s) => s !== asleep);
      return { id: asleep.id, woke: true };
    }
  }
  return null;
}

// PHASE11 §2.4 — swap cleanse (ledger #18): remove exactly the `control` set from a
// creature swapping out. DoTs/statMods (and Braced) persist as they always have.
// Returns the removed ids (the sim asserts the set; the scene stays quiet about it).
export function cleanseControl(creature) {
  if (!creature.statuses) return [];
  const removed = creature.statuses.filter((s) => STATUSES[s.id].control).map((s) => s.id);
  if (removed.length) creature.statuses = creature.statuses.filter((s) => !STATUSES[s.id].control);
  return removed;
}

// PHASE11 ledger #16 — the catch formula's statusBonus, read by combat.catchChance:
// the product of every active status's bindBonus (today: Sleep ×1.5, nothing else).
export function bindBonusOf(creature) {
  let v = 1;
  for (const s of creature.statuses || []) {
    const b = STATUSES[s.id].bindBonus;
    if (b !== undefined) v *= b;
  }
  return v;
}

// PHASE9 §5: an `applies` spec may target the USER instead of the foe (Calcify's
// self-buff). One resolver shared by the battle scene and the sim, so 'self' means
// exactly one thing everywhere. A missing target reads as 'foe'.
export function resolveApplyTarget(user, foe, applies) {
  return applies?.target === 'self' ? user : foe;
}

// Effective stat while statuses are active: base stat × every active statMod for that
// key, floored, never below 1. Computed on the fly (never baked into the creature) so
// level-ups/evolution mid-status stay correct and expiry needs no "undo".
export function effectiveStat(creature, key) {
  let v = creature[key];
  for (const s of creature.statuses || []) {
    const mod = STATUSES[s.id].statMods?.[key];
    if (mod !== undefined) v *= mod;
  }
  return Math.max(1, Math.floor(v));
}

// Multiplier on healing this creature RECEIVES (Rot). 1 when unafflicted.
export function healingReceivedMod(creature) {
  let v = 1;
  for (const s of creature.statuses || []) {
    const mod = STATUSES[s.id].healingMod;
    if (mod !== undefined) v *= mod;
  }
  return v;
}

// Tick every active status matching `trigger` on a LIVING creature: deal its DoT
// (fraction of maxHp, min 1), decrement duration, drop it at 0. Returns ordered events
// [{ id, dmg, expired }] for the UI to narrate. Fainted creatures don't tick.
// PHASE9: a status may escalate via `tickFracs` — indexed by how many ticks it has
// already taken (duration − turnsLeft), clamped to the last entry. A refresh resets
// turnsLeft and therefore restarts the ladder (Drowning: /16 → /12 → /8).
export function tickStatuses(creature, trigger) {
  const events = [];
  if (!creature.statuses || creature.hp <= 0) return events;
  let tickDamage = 0;
  for (const s of creature.statuses) {
    const def = STATUSES[s.id];
    if (def.trigger !== trigger) continue;
    // PHASE11 ledger-#15 grace: a status born mid-turn (Braced, set the instant its
    // Stunned denied) sits out the tick of the turn that set it — no decrement, no
    // event. The window then runs its full length in real, usable turns.
    if (s.graceTick) {
      delete s.graceTick;
      continue;
    }
    const frac = def.tickFracs
      ? def.tickFracs[Math.min(def.tickFracs.length - 1, def.duration - s.turnsLeft)]
      : def.tickFrac;
    let dmg = 0;
    if (frac) {
      dmg = Math.max(1, Math.floor(creature.maxHp * frac));
      creature.hp = Math.max(0, creature.hp - dmg);
      tickDamage += dmg;
    }
    s.turnsLeft -= 1;
    events.push({ id: s.id, dmg, expired: s.turnsLeft <= 0 });
    if (creature.hp <= 0) break; // it fell to the tick; the rest hold
  }
  creature.statuses = creature.statuses.filter((s) => s.turnsLeft > 0);
  // PHASE11 §2.2: a tick that drew blood wakes a sleeper too — "any damage" means any.
  // (A sleeper whose Sleep just expired naturally this round already said so via its
  // 'expire' event; only a still-held Sleep is cleared and narrated here.)
  if (tickDamage > 0 && creature.hp > 0) {
    const wake = wakeIfDamaged(creature, tickDamage);
    if (wake) events.push(wake);
  }
  return events;
}

export function clearStatuses(creature) {
  if (creature.statuses) creature.statuses = [];
}

// Format a status log line from its data template. kind: apply|refresh|tick|expire.
export function statusLine(id, kind, name, n) {
  return STATUSES[id].lines[kind].replace('{name}', name).replace('{n}', String(n));
}
