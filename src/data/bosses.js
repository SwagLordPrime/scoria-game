// Boss table — PHASE4 boss, re-tuned for PHASE5 leveling, RE-TUNED AGAIN for PHASE6
// evolution. One unique, defeat-only gate boss: the Barrow-King.
//
// A boss is a creature instance PLUS a couple of boss-only flags the Battle scene
// reads behind `isBoss` (Lifedrain config + catch-lock). This is deliberately a
// self-contained boss rule, NOT a general status/ability framework (Phase 4 §2/§5).
//
// AUTHORING (PHASE5 §3): the King is authored DIRECTLY at its level-18 stats — it does
// NOT run through per-stat scaling (statAtLevel). `level: 18` is display/flavor only; the
// stats below are its real stats. This avoids double-scaling and keeps the boss a hand-set
// number the sim tunes against, independent of the growth curve.
//
// TUNING (re-simmed with evolved forms in the pool — scripts/sim-phase6.mjs; Lifedrain
// 0.33/0.43 remain Shane's locked call). Phase 5's HP105 Atk13 fell to evolution: the
// mono-Ember starter now arrives as a Lv10 FORGEWROUGHT (evo at Lv9 < cap 10) and beat
// it 100% with 2 HP left. Landed on **HP105 Atk15 Def12**:
//   - Ember-only (the solo starter line — Slagling is not wild-catchable) loses 100% at
//     Lv8/9/10, Forgewrought included, with a solid margin (King ~22 HP up when it falls).
//     Atk was the right knob: super-effective Cinder scaling punishes Ember ~2x harder
//     per point than the resisted/neutral teams we want winning. HP-only walls (115-120)
//     left the wall one damage-floor from flipping.
//   - Bloom/Gale 2-team at the pre-boss cap (Lv10): wins 100% in BOTH lead orders, now
//     properly on a knife-edge — the winner limps out at 8-14 team HP with one creature
//     down. The <=50% "feeding frenzy" bites hardest on the fragile finisher.
//   - Phase 5's "diverse 4-team wins under-leveled at Lv8" bonus is GONE under any tune
//     that walls Forgewrought (checked HP/Atk sweeps) — evolution raised the pre-boss
//     power ceiling, so the floor rose with it. Diverse at the cap still wins big
//     (3/4 alive), and a raised Ossclad (caught Marrowling, evo at 9) counters the King
//     honestly: Cinder-vs-Cinder neutralizes the drain edge and it wins with ~28/68 HP.

export const BOSSES = {
  BarrowKing: {
    key: 'BarrowKing',
    name: 'The Barrow-King',
    type: 'Cinder',
    role: 'Bruiser',
    level: 18, // out-levels the player's cap on purpose (type beats levels); display-only
    hp: 105, // authored at Lv18, not scaled (Phase-4: 75; Phase-5: 105)
    atk: 15, // PHASE6 re-tune: walls the evolved Lv10 Forgewrought (Phase-4: 8; Phase-5: 13)
    mag: 6, // PHASE8: inert — both its moves stay physical; here so the stat space is total
    def: 12,
    spd: 4, // low Spd — the player usually acts first; they'll need it
    moves: [
      { name: 'Marrow Drain', type: 'Cinder', kind: 'physical', power: 7 },
      { name: 'Grave Sunder', type: 'Neutral', kind: 'physical', power: 6 },
    ],
    // Lifedrain: on every successful boss attack it heals a fraction of damage dealt,
    // escalating once the King is at/below 50% HP ("feeding frenzy"). Escalation keys
    // off the King's OWN HP, never off player deaths (Phase 4 §2).
    drain: { above: 0.33, below: 0.43, threshold: 0.5 },
    blurb:
      'A towering bone-titan, reassembled over centuries in the dark. It sustains ' +
      'itself by drawing the marrow from anything that bleeds near it.',
  },
};

export function makeBoss(key) {
  const b = BOSSES[key];
  if (!b) throw new Error(`Unknown boss: ${key}`);
  return {
    species: b.key, // -> texture `creature-BarrowKing`
    name: b.name,
    type: b.type,
    role: b.role,
    level: b.level ?? 1,
    maxHp: b.hp,
    hp: b.hp,
    atk: b.atk,
    mag: b.mag ?? 1, // PHASE8: authored like the rest; unused while its moves are physical
    def: b.def,
    spd: b.spd,
    moves: b.moves.map((m) => ({ ...m })),
    isBoss: true,
    drain: { ...b.drain },
  };
}
