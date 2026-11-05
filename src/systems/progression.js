// Leveling / XP system — PHASE5_BUILD_PLAN §2. Pure, data-driven math with NO imports,
// so combat, the battle scene, the save layer, and the Node tuning sim all share exactly
// one source of truth. Numbers below were landed on by simulation (see PHASE5 report /
// scripts/sim-phase5.mjs) — retune here, and every consumer follows.

// --- Tunables (all set by the Phase-5 sim) ---------------------------------

// Per-stat growth. A creature's stat at level L is its FLAT base (creatures.js) scaled by
// (1 + GROWTH*(L-1)) and floored — so higher-base stats grow faster in absolute terms
// (a Striker's Atk/Spd outpace its Def). 0.07 keeps a capped (Lv15) roster meaningfully
// stronger than base without trivializing type matchups.
export const GROWTH = 0.07;

// XP curve. xpToNext(L) is the XP a creature needs to go from level L to L+1. Shared XP
// (every non-fainted member gets the FULL amount) means "battles to cap" is per-battle,
// not per-creature — so the roster levels together. Tuned so 5→10 takes ~18-24 wild wins.
export const XP_CURVE_A = 12;

// XP awarded per resolved encounter (defeat OR successful catch), scaled by enemy level.
export const BASE_XP = 12;

// --- Level cap: milestone-gated ("badge" machinery, PHASE5 §2.3 / design §10) ----------
// The cap starts at BASE_LEVEL_CAP and is raised by cleared-gate flags. V1 has one gate
// (the Barrow-King). Faction leaders/rivals slot in later by appending milestones here —
// nothing else changes. Ordered high→low cap so levelCapFromFlags picks the best cleared.
export const BASE_LEVEL_CAP = 10;

export const LEVEL_CAP_MILESTONES = [
  { flag: 'barrowKingDefeated', cap: 15 },
  // Post-V1: { flag: 'forgeLeaderDefeated', cap: 20 }, { flag: '...Rival...', cap: 20 }, ...
];

// The current cap = the highest milestone cap whose flag is set, else the base cap.
// Deriving from flags means the cap survives reload and resets on New Game for free
// (flags do), with no separate value to keep in sync.
export function levelCapFromFlags(flags = {}) {
  let cap = BASE_LEVEL_CAP;
  for (const m of LEVEL_CAP_MILESTONES) {
    if (flags[m.flag] && m.cap > cap) cap = m.cap;
  }
  return cap;
}

// --- Pure math -------------------------------------------------------------

// Per-stat growth curve. base is the flat species stat; returns the scaled stat at level L.
// Floor is applied per level off the SAME base (never off the previous level's value), so a
// creature raised to L has identical stats to one caught at L — no path-dependence, which
// is what lets leveled creatures rehydrate exactly from just {species, level} on load.
export function statAtLevel(base, level) {
  return Math.floor(base * (1 + GROWTH * (level - 1)));
}

// XP needed to advance FROM level L to L+1.
export function xpToNext(level) {
  return Math.round(XP_CURVE_A * Math.pow(level, 1.5));
}

// XP granted for resolving an encounter against an enemy of the given level.
export function xpForDefeat(enemyLevel) {
  return Math.round(BASE_XP * enemyLevel);
}
