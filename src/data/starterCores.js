// The three staked cores — PHASE10 §2. Everything the choice-at-the-table scene says
// about a core lives HERE, keyed by species: its table sprite, its short look (used in
// narration), the handler's faction-origin pitch (ledger #13 — fiction reframe only),
// and the handler's dry line once it's bound. The inspect card composes this with the
// species' own type/role/blurb (data/creatures.js) — NO stat screens (ledger #5).
//
// Claim order is NOT here: rival claims resolve against STARTER_CORES (data/creatures.js),
// the canonical trio order that is the P12 contract.
//
// ⚠ Working names throughout (Marga / Brann / Vess) — Shane vetoes at playtest.

export const CORE_DETAILS = {
  Slagling: {
    texture: 'core-forge',
    look: 'furnace-glow core',
    origin: "Forge-make. Honest scrap, honest heat. It'll hold a line.",
    handler: 'Marga: The Forge-make. Safe hands, then. Keep them.',
  },
  Staticur: {
    texture: 'core-signal',
    look: 'wrong-signal core',
    origin: "Nobody's make. Pulled off a dead zone by a Remnant crew. It's the one nobody wants — it twitches.",
    handler: "Marga: The twitcher. Huh. Don't let it listen too long.",
  },
  Marrowling: {
    texture: 'core-bone',
    look: 'bone-white core',
    origin: 'Salvage out of the barrow-fields. The Bone let it go cheap. It reassembles.',
    handler: "Marga: The Bone's salvage. It'll come apart on you. It'll come back, too.",
  },
};

// The two greenhorns (PHASE10 §5 — dialogue-only this phase; corelocks in P12).
// `a` is the eager one — first to the table, first claim by canonical list order.
export const RIVALS = {
  a: { name: 'Brann', claim: "Brann: Knew you'd leave one warm for me." },
  b: { name: 'Vess', claim: 'Vess: Debts start today, then.' },
};
