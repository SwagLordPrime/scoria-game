// Corelocks — PHASE12 §2/§3. Human opposition, entirely as DATA: who they are, where
// they stand, what they field, what they say, and what the purse is worth. The duel
// rules live in systems/corelocks.js; the battle itself is the Phase-3 battle code
// reused whole (§2 — a duel is a wild fight with three laws bolted on: no binding,
// no fleeing, and a team on the other side).
//
// Fields:
//   id            — the flag key. flags.duels[id] is 'won' | 'lost' — the P15 rep seam
//                   (ledger #26) and the thing P13's retroactive purse payout reads.
//   name/epithet  — the label; epithet is display-only flavor.
//   mapId/x/y     — where they stand. The WorldScene renders them like NPCs (they block
//                   a tile, they answer to Space) off this alone.
//   requires      — a flag that must be set before they exist in the world at all.
//   challengeOnEnter — they jump you the first time you set foot on their map (the
//                   eager rival). Fires ONCE ever (flags.duelsMet), so a loss never
//                   traps a weak party in a re-challenge loop; after that they wait.
//   team          — array of { species, level, moves? }, or a FUNCTION of flags for the
//                   rivals (whose numens derive from flags.rivals — never hardcoded).
//                   `moves` overrides the species kit; absent = the learnset-armed kit
//                   at that level (creatures.learnsetKit — the §4 rule wilds now share).
//   purse         — gilt. DATA ONLY this phase: recorded to the flags on a win and paid
//                   retroactively when gilt exists (P13). The log says the number now.
//   ai            — 'seeker' for every corelock (§2): P11's cunning policy promoted to
//                   the game — fish a status the target lacks, never past a kill.
//   rematch       — false everywhere in V1; a won corelock stands down to their `after`.
//   lines         — { challenge, win, lose, after }, each an array of dialogue lines.
//
// ⚠ WORKING NAMES (Shane vetoes at playtest): Ruel (the sellsword), Kest (the outrider).
// Brann / Vess are P10's, already staked. The collector is deliberately UNNAMED — the
// Ledger doesn't introduce itself (STORY_AND_WORLD §8).

// The route catch rival B picked up on her way south (§3): she never fields the same
// numen twice, so what she caught depends on what she was left holding at the table.
function rivalBCatch(flags) {
  return flags.rivals?.b === 'Marrowling' ? 'Snarebriar' : 'Mireling';
}

export const CORELOCKS = [
  // ---- Rival A — the eager one. First stretch of the route, first time out. --------
  {
    id: 'rivalA',
    name: 'Brann',
    epithet: 'the eager one',
    mapId: 'route',
    x: 11,
    y: 1,
    facing: 'left',
    tint: 0xb08a62,
    requires: 'starterChoice',
    challengeOnEnter: true,
    team: (flags) => [{ species: flags.rivals?.a, level: 6 }],
    purse: 30,
    ai: 'seeker',
    rematch: false,
    lines: {
      challenge: [
        "Brann: There you are! I've been stood at this bend since first light.",
        'Brann: One match. I just want to know. Come on.',
      ],
      win: [
        'Brann: Oh. Oh, that — right. That was quick.',
        "Brann: Take it. Take it, I'm not going to stand here holding it.",
      ],
      lose: [
        'Brann: Did you see that? Tell me you saw that.',
        "Brann: Come back when you've fed it. I mean that kindly.",
      ],
      after: ["Brann: Rematch. Not today. But rematch — I'm writing it down somewhere."],
    },
  },

  // ---- The sellsword — twenty years of this, mid-route, mostly sober. -------------
  {
    id: 'sellsword',
    name: 'Ruel',
    epithet: 'the sellsword',
    mapId: 'route',
    x: 11,
    y: 9,
    facing: 'left',
    tint: 0x9c8f78,
    // §3 bid was Lv6/Lv6. TUNED +1 (the phase's whole authority) by sim-phase12: at Lv6
    // the duo-Lv8 party beat him 100/100/100 and even +1 only reaches 97.8% — he needs
    // +3 to enter the 55-85 band, which is Shane's call, not this phase's
    // (reports/MEGA_BLOCKERS.md, B-1). The +1 is kept anyway because Lv7 puts Blightspore
    // in the Mireling's mouth, which is the fight he ought to have had all along.
    team: [
      { species: 'Mireling', level: 7 },
      { species: 'Fenmoth', level: 7 },
    ],
    purse: 40,
    ai: 'seeker',
    rematch: false,
    lines: {
      challenge: [
        'Ruel: Twenty years on this road. Twenty. You know what it buys you?',
        'Ruel: This bend. Draw your core.',
      ],
      win: [
        'Ruel: Right. Right, then.',
        "Ruel: Purse is yours. It was never much of one.",
      ],
      lose: ['Ruel: Still got it. Some of it. Enough of it.'],
      after: [
        'Ruel: Stand me a drink at the tavern sometime and I’ll tell you where the grass thins.',
      ],
    },
  },

  // ---- The Wayfarer outrider — duels for news and sport, at the town's south gate. -
  {
    id: 'outrider',
    name: 'Kest',
    epithet: 'the Wayfarer outrider',
    mapId: 'town',
    x: 11,
    y: 12,
    facing: 'left',
    tint: 0x9aa47c,
    // §3 bid was Lv7/Lv6. TUNED +1 by sim-phase12, and this one earns its keep: at Lv8
    // the Sistern crosses its Undertoll learnset entry, so the outrider stops being a
    // stat-check and starts tolling you under — 100% → 66.7%. Still 1.7 points over the
    // 35-65 band; +2 would land it at 62.4% (MEGA_BLOCKERS.md, B-2).
    team: [
      { species: 'Sistern', level: 8 },
      { species: 'Ashwhelp', level: 7 },
    ],
    purse: 60,
    ai: 'seeker',
    rematch: false,
    lines: {
      challenge: [
        'Kest: Wayfarer. I deal in roads and what happens on them.',
        'Kest: Give me something worth carrying west.',
      ],
      win: [
        'Kest: That will travel.',
        'Kest: Sixty, and the road hears your name by dark. Cheap at the price.',
      ],
      lose: ['Kest: Nothing worth carrying, then. Roads are patient. So am I.'],
      after: ['Kest: West is still west. The husks out there still tick when the ash cools.'],
    },
  },

  // ---- Rival B — the flinty one. The Hollow's mouth, before the rubble. ------------
  {
    id: 'rivalB',
    name: 'Vess',
    epithet: 'the flinty one',
    mapId: 'cave',
    x: 11,
    y: 1,
    facing: 'left',
    tint: 0x7d8a92,
    requires: 'starterChoice',
    team: (flags) => [
      { species: flags.rivals?.b, level: 8 },
      { species: rivalBCatch(flags), level: 6 },
    ],
    purse: 45,
    ai: 'seeker',
    rematch: false,
    lines: {
      challenge: [
        'Vess: You went in first. Of course you did.',
        'Vess: Debts start today.',
      ],
      win: ['Vess: Noted.', "Vess: Paid in full. Don't get comfortable with the sound of that."],
      lose: ["Vess: A ledger is only a ledger. You'll settle it. They always do."],
      after: ["Vess: We're square. Keep it that way and we stay friendly."],
    },
  },

  // ---- The Ledger collector — the cleared threshold room, post-boss only. ----------
  // The deliberate whisper (ledger #29): a Murkmaw OUT of the Deep Hollow, in the hands
  // of a man who was never down there, carrying a move nothing else in the world knows.
  // Nobody explains it. Nobody is going to. (STORY_AND_WORLD §8.)
  {
    id: 'collector',
    name: 'The collector',
    epithet: 'Obsidian Ledger',
    mapId: 'cave',
    x: 11,
    y: 14,
    facing: 'left',
    tint: 0x5f5a63,
    requires: 'barrowKingDefeated',
    // §3 bid was Murkmaw Lv12 / Fenlight Lv10, with §6 granting ±1 on HIS levels to hit
    // the 30-55 band. TUNED +1 — and ±1 is not enough: 71.8% → 63.3%, where +2 would
    // land 45.9%, squarely in band (MEGA_BLOCKERS.md, B-3). A pure stat nudge; neither
    // numen crosses a learnset entry between 12→13 or 10→11, so the fight's SHAPE is
    // unchanged and the override kit still reads Drag Under + Gloam.
    team: [
      { species: 'Murkmaw', level: 13, moves: ['Drag Under', 'Gloam'] },
      { species: 'Fenlight', level: 11 },
    ],
    purse: 90,
    ai: 'seeker',
    rematch: false,
    lines: {
      challenge: [
        'A man in very good boots is measuring the opened seam with a length of knotted cord.',
        'The collector: You cleared this. Good. It saves me arranging for it to be cleared.',
        'The collector: Two minutes of your time, and then I have your name for the book.',
      ],
      win: [
        'The collector: Hm. Amended.',
        'The collector: Ninety. The Ledger pays what it owes — that is the whole of its charm.',
      ],
      lose: [
        'The collector: Written down.',
        'He coils the cord, unhurried. Something at his heel does not move when he does.',
      ],
      after: ['The collector: Go down, then. Mind what gives you room.'],
    },
  },
];

export const CORELOCK_BY_ID = Object.fromEntries(CORELOCKS.map((c) => [c.id, c]));

export function getCorelock(id) {
  const c = CORELOCK_BY_ID[id];
  if (!c) throw new Error(`Unknown corelock: ${id}`);
  return c;
}
