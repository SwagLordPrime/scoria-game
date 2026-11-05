// TEMPER v0 — PHASE13 §6 (ledger #25). Two meters and one word. NO TEETH.
//
// This phase ships the bookkeeping and nothing else: Bond and Wrath accrue correctly and
// persist (save v5), the party panel shows a single muted temperament word, and no line
// of combat code reads any of it. That is deliberate. Arc D (P20) arms Wrath with chip
// damage to the hero pool and P21 branches evolution off these histories — and when it
// does, the histories have to be REAL, accrued from the player's actual play, not
// back-filled from zero on the day the teeth arrive. So the meters start turning now.
//
// Canon: WORLD_AND_CREATURES §11.1. The escalating faint ramp is Shane's spec — gentle
// the first time, cruel if you keep letting it fall.

export const METER_MAX = 100;
export const WORD_THRESHOLD = 50;

const clamp = (v) => Math.max(0, Math.min(METER_MAX, v));

// Every creature carries a temper; makeCreature stamps a fresh one and the save layer
// restores it. This is the defensive path for anything built before v5.
export function ensureTemper(c) {
  if (!c.temper) c.temper = { bond: 0, wrath: 0, faintStreak: 0 };
  if (typeof c.temper.bond !== 'number') c.temper.bond = 0;
  if (typeof c.temper.wrath !== 'number') c.temper.wrath = 0;
  if (typeof c.temper.faintStreak !== 'number') c.temper.faintStreak = 0;
  return c.temper;
}

export function freshTemper() {
  return { bond: 0, wrath: 0, faintStreak: 0 };
}

// §6 — the ramp: wrath += min(11, 3 + 2×faintStreak), then the streak lengthens.
// First faint +3, then +5, +7, +9, +11, +11, … A numen you let fall once forgives you.
// One you keep feeding to the grass does not.
export function onFaint(c) {
  const t = ensureTemper(c);
  const gain = Math.min(11, 3 + 2 * t.faintStreak);
  t.wrath = clamp(t.wrath + gain);
  t.faintStreak += 1;
  return gain;
}

// A battle it came through standing resets the streak — the ramp measures a RUN of
// neglect, not a lifetime total. Called for every party member that ends a battle alive.
export function onSurvivedBattle(c) {
  const t = ensureTemper(c);
  const had = t.faintStreak;
  t.faintStreak = 0;
  return had;
}

// §6 — a win it was standing at the end of: Bond +2.
export function onWinStanding(c) {
  const t = ensureTemper(c);
  t.bond = clamp(t.bond + 2);
  return 2;
}

// A treat (the hearth-berry, canon §11.1's first active Bond source). Bond is fed ONCE
// per battle-or-rest window — the heal always lands, but stuffing six berries down a
// numen in one fight does not buy six berries' worth of loyalty.
export function feedTreat(c, bond) {
  const t = ensureTemper(c);
  if (t.treatWindow) return 0;
  t.treatWindow = true;
  t.bond = clamp(t.bond + bond);
  return bond;
}

// Opens a fresh treat window: a battle starting, or a rest at the hearth.
export function openTreatWindow(c) {
  ensureTemper(c).treatWindow = false;
}

// §6 — rest soothes: Bond +1, Wrath −1. Small, but it is the one lever the player has
// on Wrath before the ranch exists.
export function hearthRest(c) {
  const t = ensureTemper(c);
  t.bond = clamp(t.bond + 1);
  t.wrath = clamp(t.wrath - 1);
  openTreatWindow(c);
  return t;
}

// The ONLY Temper the player ever sees: one muted word in the party panel. No numbers,
// no bars, no explanation — they will work out what feeds it, which is the whole design.
export function temperamentWord(c) {
  const t = ensureTemper(c);
  const b = t.bond >= WORD_THRESHOLD;
  const w = t.wrath >= WORD_THRESHOLD;
  if (b && w) return 'fervent';
  if (b && t.bond > t.wrath) return 'devoted';
  if (w && t.wrath > t.bond) return 'rancorous';
  return 'steady';
}

// Serialization shape (save v5). faintStreak persists: a streak that survives a reload
// is the difference between a ramp and a party trick.
export function serializeTemper(c) {
  const t = ensureTemper(c);
  return { bond: t.bond, wrath: t.wrath, faintStreak: t.faintStreak };
}

export function deserializeTemper(d) {
  return {
    bond: clamp(Math.floor(d?.bond ?? 0)),
    wrath: clamp(Math.floor(d?.wrath ?? 0)),
    faintStreak: Math.max(0, Math.floor(d?.faintStreak ?? 0)),
  };
}
