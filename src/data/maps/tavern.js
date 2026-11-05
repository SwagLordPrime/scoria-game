// The Emberfall Tavern — PHASE9 §7 + PHASE10 §2 (the choice at the table). The merc's
// origin: New Game begins HERE, and now begins with a CHOICE — the handler stakes
// three salvaged cores on the table and the player binds ONE. Innkeep + patrons carry
// the whispers — vocabulary breathing, zero exposition — and the contract board's
// first notice points at the Hollow. The hearth doubles as the starting safe point.
//
// PHASE10 pieces, all data-driven:
//   - table tiles ('p') + three 'core' objects the WorldScene renders/inspects while
//     flags.starterChoice is unset (details in data/starterCores.js);
//   - the handler (Marga) + the two rival greenhorns (Brann / Vess) — ⚠ working
//     names, Shane vetoes at playtest. NPC `lines` may be a FUNCTION of flags so the
//     room changes register once the pick is made;
//   - doorBlock: the soft-block (§2.2) — until flags.starterChoice, the door warp
//     plays a patron line instead of warping. No wall, just a room full of witnesses.
//   - The P9 patron formerly named Vess is now TAM: the P10 plan assigns 'Vess' to
//     rival B, and one tavern can't hold two of them. NPC names are unlocked
//     (NAMES.md defers them) — both names ship for veto.
//
// ASCII legend (see data/tiles.js): # wall  f floor  H hearth (heal)  D door  p table.

export default {
  id: 'tavern',
  name: 'The Emberfall Tavern',
  ascii: [
    '################',
    '#ffffffffffffff#',
    '#ffffffffffffff#',
    '#ffffffffffffff#',
    '#fffffpppffffff#',
    '#fHffffffffffff#',
    '#ffffffffffffff#',
    '#ffffffffffffff#',
    '#ffffffffffffff#',
    '#ffffffffffffff#',
    '#######DD#######',
  ],
  spawns: {
    start: { x: 8, y: 6, facing: 'up' }, // New Game wakes here, facing the table
    enter: { x: 8, y: 9, facing: 'up' },
  },
  warps: [
    { x: 7, y: 10, target: 'town', spawn: 'fromTavern' },
    { x: 8, y: 10, target: 'town', spawn: 'fromTavern' },
  ],
  // PHASE10 §2.2: nobody walks out coreless.
  doorBlock: {
    flag: 'starterChoice',
    lines: [
      "A patron, not looking up: Handler's staking greenhorns today. Nobody walks out coreless.",
    ],
  },
  npcs: [
    {
      x: 8,
      y: 2,
      name: 'Maren',
      facing: 'down',
      tint: 0xb9a27a,
      // PHASE13 §4: Maren keeps the locker behind the bar. No new NPC — the innkeep the
      // board already told you to ask for the mark is the one who sells you salve.
      shop: true,
      lines: [
        "Maren: Keep your numen fed and it'll keep you breathing. That's the whole trade, merc.",
        "Maren: They call this stretch the Calm. Floorboards creak before they give. It's creaking.",
        "Maren: Locker's behind the bar. Salve, rag, cores. I don't take promises.",
      ],
    },
    {
      x: 3,
      y: 7,
      name: 'Edda',
      facing: 'right',
      tint: 0x8f9fa8,
      lines: (flags) => {
        const out = [
          'Edda: Born in the Melancholy, me — slept through shelling before I ever slept through rain. Peace is just the war holding its breath.',
        ];
        // §6: one patron nods at the wolf-core while it's still on the table.
        if (!flags.starterChoice)
          out.push('Edda: One of those cores hums through the tabletop. Felt it in my teeth all morning.');
        return out;
      },
    },
    {
      x: 12,
      y: 7,
      name: 'Cobb',
      facing: 'left',
      tint: 0xa79ab0,
      lines: [
        'Cobb: Mined the Hollow galleries a season. Went below the barrow once. ONCE. Something down there ate the lantern-light — drank it, wick to glass.',
        "Cobb: Even the barrow's dead won't go near it. Bones give it room. BONES.",
      ],
    },
    {
      x: 12,
      y: 3,
      name: 'Tam',
      facing: 'left',
      tint: 0x9aa47c,
      // PHASE12 §3: ONE bark notices the collector, and only after the Hollow opens —
      // a Wayfarer watches who comes and goes on a road. It explains nothing. Nobody
      // in Emberfall knows what a Murkmaw is, let alone that his shouldn't exist.
      lines: (flags) => {
        const out = [
          "Tam: Wayfarer. Passing through — it's the whole faith. West in the wastes the war-husks still tick when the ash cools at night.",
        ];
        if (flags.barrowKingDefeated)
          out.push('Tam: Ledger man came through, day you opened the Hollow. His shadow was wrong.');
        return out;
      },
    },
    // ---- PHASE10: the handler at the table -------------------------------------
    {
      x: 7,
      y: 3,
      name: 'Marga',
      facing: 'down',
      tint: 0x8a7a5c,
      lines: (flags) =>
        flags.starterChoice
          ? ["Marga: Still here? The road won't send for you, merc. It just waits."]
          : [
              'Marga: Three cores, three numens, one hand each. Look them over — bind the one you can live with.',
              "Marga: No, you don't get two.",
            ],
    },
    // ---- PHASE10 §5: the rival greenhorns (dialogue-only; corelocks in P12) ----
    {
      x: 5,
      y: 3,
      name: 'Brann',
      facing: 'right',
      tint: 0xb08a62,
      lines: (flags) => {
        if (!flags.starterChoice)
          return [
            'Brann: Three cores on one table. Best morning this tavern has ever had.',
            'Brann: Go on, pick. One of the leftovers is mine, and I want to know which.',
          ];
        const mine = {
          Slagling: "Brann: The Forge-make sleeps warm in my pack. Can't stop checking it's real.",
          Staticur: 'Brann: Mine twitches when I talk at it. Listening, I figure.',
          Marrowling: 'Brann: Mine rattles when the room laughs. Keeping it anyway.',
        };
        return [mine[flags.rivals?.a] || 'Brann: Corehands, the pair of us. Say it back to me sometime.'];
      },
    },
    {
      x: 11,
      y: 5,
      name: 'Vess',
      facing: 'left',
      tint: 0x7d8a92,
      lines: (flags) => {
        if (!flags.starterChoice) return ['Vess: Stare all you want. The table only pays out once.'];
        const mine = {
          Slagling: 'Vess: Forge-make. Holds a line, holds its value.',
          Staticur: "Vess: The twitcher, discounted. We'll see who got cheated.",
          Marrowling: 'Vess: Bone salvage. It reassembles. So do debts.',
        };
        return [mine[flags.rivals?.b] || "Vess: We're square. Keep it that way."];
      },
    },
  ],
  objects: [
    {
      type: 'board',
      x: 11,
      y: 1,
      lines: [
        'THE CONTRACT BOARD. One notice, fresh ink:',
        '"The digging under the Hollow has stopped. Whatever stopped it, unstop it. Payment on the Bone\'s word — ask the innkeep for the mark."',
      ],
    },
    // PHASE10 §2: the three staked cores, in the plan's table dressing — furnace-glow,
    // bone-white, wrong-signal. (Claim order is STARTER_CORES, not seat order.)
    { type: 'core', species: 'Slagling', x: 6, y: 4 },
    { type: 'core', species: 'Marrowling', x: 7, y: 4 },
    { type: 'core', species: 'Staticur', x: 8, y: 4 },
  ],
  encounters: null,
};
