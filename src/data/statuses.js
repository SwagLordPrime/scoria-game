// Status-effect table — PHASE7_BUILD_PLAN §2.1/§2.3. Every status is DATA; the engine
// (systems/status.js) ticks whatever is defined here, so adding a status is one entry
// plus (optionally) a move that applies it. Statuses are BATTLE-ONLY for now: the battle
// scene clears every combatant on the way out (no overworld persistence yet — a future
// option that would need heal-point cures).
//
// Fields:
//   flavorType — palette key (data/types.js TYPE_COLORS) for the UI chip; flavor only.
//   trigger    — 'turnEnd' (ticks at end of a full battle turn) or 'onAction' (ticks when
//                the afflicted creature ACTS: uses a move, or is swapped out).
//   tickFrac   — DoT per activation as a fraction of maxHp, min 1 (engine enforces).
//   tickFracs  — PHASE9: escalating DoT — an array indexed by ticks-already-taken
//                (clamped to the last entry). Refreshing the status restarts the
//                ladder (re-applied = pulled under again). Drowning uses this.
//   statMods   — multipliers on effective stats while active (e.g. Burn dulls Atk).
//                Recomputed on the fly off base stats — never baked in — so level-ups
//                and evolution mid-status stay correct. PHASE9: a multiplier >1 is a
//                BUFF riding the same machinery (Calcified, Hasted).
//   beneficial — PHASE9: marks a status the bearer WANTS (self-buffs). Data flavor for
//                now — the engine ticks it identically; UI may color-code it later.
//   healingMod — multiplier on healing the afflicted creature RECEIVES while active
//                (Rot; bites the Barrow-King's Lifedrain if the player lands it).
//   duration   — activations until it expires ('turnEnd': turns; 'onAction': actions).
//   lines      — log-line templates; {name} = creature, {n} = tick damage.
//
// Re-applying a status a creature already has REFRESHES its duration (one instance per
// id); different statuses stack freely. Numbers landed by scripts/sim-phase7.mjs.

export const STATUSES = {
  Burn: {
    id: 'Burn',
    name: 'Burn',
    flavorType: 'Ember',
    trigger: 'turnEnd',
    tickFrac: 1 / 16,
    statMods: { atk: 0.75 },
    duration: 3,
    lines: {
      apply: '{name} is scorched — Burn!',
      refresh: 'The burn on {name} is stoked anew.',
      tick: 'The burn sears {name} — −{n} HP.',
      expire: 'The burn on {name} gutters out.',
    },
  },
  Poison: {
    id: 'Poison',
    name: 'Poison',
    flavorType: 'Bloom',
    trigger: 'turnEnd',
    tickFrac: 1 / 12,
    duration: 4,
    lines: {
      apply: '{name} is envenomed — Poison!',
      refresh: 'The poison in {name} is renewed.',
      tick: 'Poison works through {name} — −{n} HP.',
      expire: 'The poison in {name} spends itself.',
    },
  },
  Bleed: {
    id: 'Bleed',
    name: 'Bleed',
    flavorType: 'Neutral',
    trigger: 'onAction',
    tickFrac: 1 / 10,
    duration: 3,
    lines: {
      apply: '{name} is torn open — Bleed!',
      refresh: "{name}'s wound is torn wider.",
      tick: '{name} bleeds as it moves — −{n} HP.',
      expire: "{name}'s wound closes.",
    },
  },
  Rot: {
    id: 'Rot',
    name: 'Rot',
    flavorType: 'Cinder',
    trigger: 'turnEnd',
    tickFrac: 1 / 16,
    healingMod: 0.5,
    duration: 4,
    lines: {
      apply: 'Rot takes hold of {name} — its wounds will knit slower.',
      refresh: 'The rot in {name} spreads anew.',
      tick: 'Rot eats at {name} — −{n} HP.',
      expire: 'The rot sloughs off {name}.',
    },
  },

  // ---- PHASE9 wave-1 statuses (DESIGN_OVERVIEW §7c; numbers sim-phase9) -------
  // Slowed + Calcified are WIRED (Coldlight / Calcify). Hasted + Drowning ship in
  // data with passing sim tests but are wired to NO move yet — the clean seam for
  // the arena / next region's kits.
  Slowed: {
    id: 'Slowed',
    name: 'Slowed',
    flavorType: 'Tide',
    trigger: 'turnEnd', // no tickFrac: a pure statMod that counts down at turn end
    statMods: { spd: 0.6 },
    duration: 3,
    lines: {
      apply: 'Cold seeps into {name} — Slowed!',
      refresh: 'The chill in {name} deepens anew.',
      tick: 'The cold clings to {name}.',
      expire: 'The cold lets go of {name}.',
    },
  },
  Calcified: {
    id: 'Calcified',
    name: 'Calcified',
    flavorType: 'Cinder',
    trigger: 'turnEnd',
    statMods: { def: 1.35 },
    duration: 3,
    beneficial: true,
    lines: {
      apply: 'Stone knits over {name} — Calcified!',
      refresh: 'The stone on {name} thickens anew.',
      tick: 'The stone holds around {name}.',
      expire: 'The stone sloughs from {name}.',
    },
  },
  Hasted: {
    id: 'Hasted',
    name: 'Hasted',
    flavorType: 'Gale',
    trigger: 'turnEnd',
    statMods: { spd: 1.4 },
    duration: 3,
    beneficial: true,
    lines: {
      apply: '{name} quickens — Hasted!',
      refresh: 'The quickening in {name} is renewed.',
      tick: 'The wind stays under {name}.',
      expire: 'The quickening leaves {name}.',
    },
  },
  Drowning: {
    id: 'Drowning',
    name: 'Drowning',
    flavorType: 'Tide',
    trigger: 'turnEnd',
    tickFracs: [1 / 16, 1 / 12, 1 / 8], // escalates each successive turn under
    duration: 3,
    lines: {
      apply: "Water finds {name}'s lungs — Drowning!",
      refresh: 'The water pulls {name} under again.',
      tick: 'The water rises in {name} — −{n} HP.',
      expire: '{name} coughs the water out.',
    },
  },

  // ==== PHASE11 — wave 2: the CONTROL statuses (DESIGN_OVERVIEW §7c; ledger #15-21).
  // New fields, all read by the engine (systems/status.js), never by scenes directly:
  //   control     — cleansed on swap-out (ledger #18) and refused by isBoss targets
  //                 (ledger #21). DoTs/statMods never carry it.
  //   denyAct     — resolveAction denies the bearer's action outright (Stunned, Sleep).
  //   consumeOnDeny / braceAfter — Stunned spends itself on the deny and leaves the
  //                 bearer Braced (the anti-stunlock law, ledger #15). tryApplyStatus
  //                 refuses a status onto a target carrying its braceAfter entry.
  //   fizzleChance — per-action roll to deny (Shock's 25%).
  //   charm       — the ledger-#17 coin flip: 50% it strikes ITSELF at half power,
  //                 50% it hesitates (denied). It never targets its charmer.
  //   wakeOnDamage / bindBonus — Sleep: any damage clears it; catchChance ×1.5 while
  //                 it holds (ledger #16; the 0.9 cap stands).
  // Stunned and Sleep are WIRED (Concuss / Undertoll+Lull). Shock and Charmed ship
  // DARK — data + passing sims, no carrier moves (P12+ wires them; Murkmaw debuts
  // Charmed per ledger #20). Numbers are opening bids; sim-phase11 tunes here only.
  Stunned: {
    id: 'Stunned',
    name: 'Stunned',
    flavorType: 'Neutral',
    control: true,
    denyAct: true,
    consumeOnDeny: true,
    braceAfter: 'Braced',
    // No trigger: Stunned never ticks down — it lives until it denies exactly one
    // action (so it works whether it lands before or after the victim's turn).
    duration: 1,
    lines: {
      apply: '{name} reels — Stunned!',
      refresh: '{name} reels again.',
      deny: '{name} is stunned — the moment passes it by.',
      blocked: '{name} stands braced.',
      immune: '{name} does not stagger.',
      expire: '{name} steadies itself.',
    },
  },
  Braced: {
    id: 'Braced',
    name: 'Braced',
    flavorType: 'Neutral',
    trigger: 'turnEnd', // pure countdown, no tick damage
    duration: 2,
    beneficial: true, // the bearer wants this one; NOT control — it survives a swap
    lines: {
      apply: '{name} sets its stance — Braced.',
      refresh: '{name} holds its stance.',
      tick: '{name} stands braced.',
      expire: '{name} eases its stance.',
    },
  },
  Sleep: {
    id: 'Sleep',
    name: 'Asleep',
    flavorType: 'Tide',
    control: true,
    denyAct: true,
    wakeOnDamage: true,
    bindBonus: 1.5,
    trigger: 'turnEnd', // counts down up to 3 turns; any damage ends it early
    duration: 3,
    lines: {
      apply: '{name} slips under — Asleep.',
      refresh: '{name} sinks deeper.',
      tick: '{name} sleeps on.',
      deny: '{name} sleeps through the moment.',
      wake: '{name} jolts awake!',
      immune: '{name} does not sleep.',
      expire: '{name} stirs awake.',
    },
  },
  Shock: {
    id: 'Shock',
    name: 'Shock',
    flavorType: 'Gale',
    control: true,
    fizzleChance: 0.25,
    trigger: 'turnEnd',
    tickFrac: 1 / 14,
    duration: 3,
    lines: {
      apply: 'Current grips {name} — Shock!',
      refresh: 'The current finds {name} again.',
      tick: 'The current bites {name} — −{n} HP.',
      deny: 'The jolt takes {name} — the strike dies before it lands.',
      immune: '{name} does not falter.',
      expire: 'The current lets {name} go.',
    },
  },
  Charmed: {
    id: 'Charmed',
    name: 'Charmed',
    flavorType: 'Umbra',
    control: true,
    charm: true,
    trigger: 'turnEnd',
    duration: 2,
    lines: {
      apply: '{name} is turned — Charmed.',
      refresh: 'The turn in {name} deepens.',
      tick: '{name} is not its own.',
      deny: '{name} hesitates, torn.',
      self: '{name} turns on itself.',
      immune: '{name} does not turn.',
      expire: '{name} comes back to itself.',
    },
  },
};
