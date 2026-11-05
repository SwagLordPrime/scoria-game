// The Deep Hollow — PHASE9 §7. The dark sub-area BEYOND the Barrow-King's chamber:
// its only entrance is the gate seam the King guards, so it is unreachable until he
// falls (a deliberate design lock — the hidden chase cannot trivialize the gate
// because it sits behind it; sim-phase9 proves the gating on the map graph).
// Darkest palette in the game — past the last lantern. Murk patches ('u') hide the
// epic chase: the Murkmaw, the game's first Umbra.
//
// ASCII legend (see data/tiles.js): B dark wall  b dark floor  u murk (encounters)
//   = warp path (back up through the opened gate).

export default {
  id: 'deephollow',
  name: 'The Deep Hollow',
  ascii: [
    'BBBBBBBBB==BBBBBBBBB',
    'BbbbbbbbbbbbbbbbbbbB',
    'BbbuubbbbbbbbbuubbbB',
    'BbbuubbBBbbbbbuubbbB',
    'BbbbbbbBBbbbbbbbbbbB',
    'BbbbbbbbbbbbuubbbbbB',
    'BbuubbbbbbbbuubbbbbB',
    'BbuubbbbBbbbbbbbuubB',
    'BbbbbbbbBbbbbbbbuubB',
    'BbbbuubbbbbuubbbbbbB',
    'BbbbuubbbbbuubbbbbbB',
    'BbbbbbbbbbbbbbbuubbB',
    'BbbbbbuubbbbbbbuubbB',
    'BBBBBBBBBBBBBBBBBBBB',
  ],
  spawns: {
    fromCave: { x: 9, y: 1, facing: 'down' },
  },
  warps: [
    { x: 9, y: 0, target: 'cave', spawn: 'fromDeep' },
    { x: 10, y: 0, target: 'cave', spawn: 'fromDeep' },
  ],
  npcs: [],
  objects: [
    {
      type: 'sign',
      x: 11,
      y: 1,
      lines: [
        'The last lantern hangs here, guttering. Past it, the dark is not empty.',
      ],
    },
  ],
  encounters: {
    rate: 0.18,
    // The deep is still the Hollow's belly — its denizens, older and harder, plus the
    // thing they all give room to. Epic lands at 10/(60+30+10) = 10% within the room.
    table: [
      { species: 'Marrowling', rarity: 'common', min: 7, max: 9 },
      { species: 'Sistern', rarity: 'uncommon', min: 7, max: 9 },
      { species: 'Borck', rarity: 'uncommon', min: 7, max: 9 },
      { species: 'Murkmaw', rarity: 'epic', min: 8, max: 10 },
    ],
  },
};
