// Combat math — PHASE3_BUILD_PLAN §4.3 / §4.4 (do not change these numbers).
// PHASE7: stats are sourced through the status engine's effectiveStat, so active
// statuses (e.g. Burn's −Atk) modulate the SAME formula for every consumer — the
// battle scene, the enemy AI, and the tuning sims. A creature with no statuses
// resolves to its base stats exactly as before.

import { typeMultiplier } from '../data/types.js';
import { effectiveStat, bindBonusOf, hasStatus, resolveApplyTarget } from './status.js';
import { STATUSES } from '../data/statuses.js';

// §4.3: damage = max(1, floor( stat * power / def * typeMultiplier )) — the formula is
// unchanged; PHASE8 routes `stat` by the move's kind (canon §6): physical off Atk,
// magic off Mag. A move with no kind reads as physical (defensive default).
// EMERGENT, INTENDED: Burn's statMod touches only 'atk', so a burned caster's magic
// moves hit at full strength — Burn cripples physical attackers; Sorcerers shrug it off.
// PHASE9: a power-0 STATUS MOVE (Calcify) deals exactly 0 — the min-1 clamp is a floor
// for damaging moves, not a tax on moves that never meant to hurt. This also keeps the
// greedy enemy AI from ever preferring a status move to a real hit.
export function computeDamage(attacker, move, defender) {
  if (!move.power) return 0;
  const mult = typeMultiplier(move.type, defender.type);
  const stat = effectiveStat(attacker, move.kind === 'magic' ? 'mag' : 'atk');
  const raw = (stat * move.power) / effectiveStat(defender, 'def') * mult;
  return Math.max(1, Math.floor(raw));
}

// §4.4: catchChance = min(0.9, (1 - currentHP/maxHP) + 0.05).
// ~5% at full HP, ~90% near faint.
// PHASE11 (ledger #16 — the ONE sanctioned change to this formula since Phase 3):
// the canon statusBonus seam goes live. The base chance is multiplied by the target's
// active bindBonus (today: ×1.5 while it Sleeps, nothing else carries one) and the
// 0.9 cap stands over the product. Everything else in this file keeps Phase-3 numbers.
// PHASE13 §3 (ledger #9): the CORE TIER joins the product. A rough core is ×1.0 — the
// Phase-3 formula unchanged — and trued/forge-sealed multiply on top. The order is the
// law: every multiplier applies BEFORE the 0.9 cap, and the cap still rules over the
// product. So a trued core on a sleeping target at half HP computes 0.55 × 1.5 × 1.25 =
// 1.03 and lands on 0.9, not above it. Nothing binds itself for you.
export function catchChance(target, coreMult = 1) {
  const base = 1 - target.hp / target.maxHp + 0.05;
  return Math.min(0.9, base * bindBonusOf(target) * coreMult);
}

export function rollCatch(target, coreMult = 1) {
  return Math.random() < catchChance(target, coreMult);
}

// §4.3: higher Spd acts first; tie -> player first. (Effective Spd, so a future
// slowing status slots in with no code change here.)
export function playerActsFirst(playerActive, enemy) {
  return effectiveStat(playerActive, 'spd') >= effectiveStat(enemy, 'spd');
}

// 'super' | 'shrug' | 'resist' | 'neutral' — for battle-log flavor only. PHASE8: the
// ×0.85 "shrugged" tier (elemental move vs an exotic defender) gets its own light line.
export function effectiveness(move, defender) {
  const m = typeMultiplier(move.type, defender.type);
  if (m > 1) return 'super';
  if (m === 1) return 'neutral';
  if (m >= 0.85) return 'shrug';
  return 'resist';
}

// PHASE11 (ledger #17): the Charmed self-strike — the chosen move turned on its own
// wielder at HALF power, through the real damage formula (own Atk/Mag vs own Def,
// same-type reads neutral on the chart). Lives here, not in status.js, so the status
// engine stays free of combat-math imports; the scene and the sim share this one line.
export function charmSelfDamage(creature, move) {
  return computeDamage(creature, { ...move, power: move.power / 2 }, creature);
}

// Enemy AI: pick the move that deals the most damage to the current player active.
// Makes the type wheel (and your swap decision) actually matter.
// PHASE11 (ledger #20): a species may declare `ai: 'cunning'` (stamped onto instances
// by makeCreature; default greedy, untouched). The cunning policy, in order:
//   1. a kill on the table is always taken (never fish past a finishing blow — this
//      also subsumes "never a power-0 move over a kill");
//   2. if the target lacks a status one of my foe-targeting moves applies, open with
//      that move (highest-damage such move if several) — immune/braced targets that
//      CAN'T take the status don't count as lacking it;
//   3. otherwise damage-max, exactly like everyone else.
// PHASE12 §2: corelock numens declare `ai: 'seeker'` — the SAME policy under the name
// the duel rules use for it (the sim's status-fishing play, promoted to the game). One
// implementation, two names: a wild that hunts and a merc who fights smart are doing
// the same arithmetic. Team-awareness (switching, saving a counter) is a later phase.
const FISHERS = new Set(['cunning', 'seeker']);

export function chooseEnemyMove(enemy, playerActive) {
  let best = enemy.moves[0];
  let bestDmg = -1;
  for (const m of enemy.moves) {
    const d = computeDamage(enemy, m, playerActive);
    if (d > bestDmg || (d === bestDmg && Math.random() < 0.5)) {
      best = m;
      bestDmg = d;
    }
  }
  if (FISHERS.has(enemy.ai) && bestDmg < playerActive.hp) {
    const fishable = enemy.moves.filter((m) => {
      if (!m.applies) return false;
      if (resolveApplyTarget(enemy, playerActive, m.applies) !== playerActive) return false;
      const def = STATUSES[m.applies.status];
      if (hasStatus(playerActive, m.applies.status)) return false;
      if (def.control && playerActive.isBoss) return false;
      if (def.braceAfter && hasStatus(playerActive, def.braceAfter)) return false;
      return true;
    });
    if (fishable.length) {
      // Go for the throat: a control status (denial) outranks a statMod fish;
      // damage breaks ties. This is what makes a Lull-carrier open with Lull.
      return fishable.reduce((a, b) => {
        const ac = STATUSES[a.applies.status].control ? 1 : 0;
        const bc = STATUSES[b.applies.status].control ? 1 : 0;
        if (ac !== bc) return ac > bc ? a : b;
        return computeDamage(enemy, a, playerActive) >= computeDamage(enemy, b, playerActive) ? a : b;
      });
    }
  }
  return best;
}
