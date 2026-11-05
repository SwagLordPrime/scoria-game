// Rumor barks — PHASE14 §4 (ledger #26: the world quietly keeps your record). A small
// keyed table the tavern reads off your flags. Not a quest log and not a congratulation:
// Emberfall hears things, gets them slightly wrong, and says them without looking up.
//
// Each bark declares a `when` predicate over { flags, party } and a PRIORITY (lower fires
// first). One bark per visit to the tavern, and never the same one twice running —
// systems/barks.js enforces both.
//
// The collector line is the load-bearing one: it is the only place in the game that says
// out loud that the Ledger man went through the King's door, and it still explains
// nothing (STORY_AND_WORLD §8).

import { temperamentWord } from '../systems/temper.js';

export const BARKS = [
  {
    id: 'collectorLoss',
    priority: 1,
    when: ({ flags }) => flags.duels?.collector === 'lost',
    lines: [
      'Ledger man walked through you, I heard. Walked through the King\'s door too.',
      'Didn\'t come back up the way he went down, mind. Nobody mentions that part.',
    ],
  },
  {
    id: 'murkmawBound',
    priority: 2,
    when: ({ caught }) => caught.includes('Murkmaw'),
    lines: [
      'You brought THAT in under your coat?',
      'Put it by the door. Not the fire. The door.',
    ],
  },
  {
    id: 'outriderBeaten',
    priority: 3,
    when: ({ flags }) => flags.duels?.outrider === 'won',
    lines: [
      'Wayfarer at the gate is telling it like he let you win.',
      'He tells it a lot, is the thing.',
    ],
  },
  {
    id: 'rancorous',
    priority: 4,
    when: ({ party }) => party.some((c) => temperamentWord(c) === 'rancorous'),
    lines: [
      'Yours has a look. Feed it or free it.',
    ],
  },
  {
    id: 'boardThinning',
    priority: 5,
    when: ({ flags }) => (flags.contractsTurned || 0) >= 3,
    lines: [
      'Board\'s thinning. Your doing?',
      'Was a time a notice sat up there till the ink went.',
    ],
  },
];

export const BARK_BY_ID = Object.fromEntries(BARKS.map((b) => [b.id, b]));
