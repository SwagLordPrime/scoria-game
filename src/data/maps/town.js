// Emberfall — the hub town. Safe point (hearth), enterable house, 3 NPCs, the path
// south to the route, and PHASE9: the west way out into the Ashen Wastes plus the
// east building unshuttered as the Emberfall Tavern (New Game begins inside it).
// No wild encounters here.
//
// ASCII legend (see data/tiles.js): T tree  . ground  , speckle  # wall  D door
//   H hearth (heal)  = path.  West building (door @ 4,4) is enterable → house.
//   East building (door @ 13,4) → tavern. West gap (rows 6-7) → the wastes.

export default {
  id: 'town',
  name: 'Emberfall',
  ascii: [
    'TTTTTTTTTTTTTTTTTTTT',
    'T..................T',
    'T..####....####....T',
    'T..#..#....#..#....T',
    'T..#D.#....#.D#....T',
    'T..................T',
    '=.......,,,,.......T',
    '=........HH........T',
    'T.......,,,,.......T',
    'T..................T',
    'T..................T',
    'T..................T',
    'T..................T',
    'TTTTTTTTT==TTTTTTTTT',
  ],
  spawns: {
    start: { x: 9, y: 10, facing: 'up' },
    fromRoute: { x: 9, y: 12, facing: 'up' },
    fromHouse: { x: 4, y: 5, facing: 'down' },
    fromTavern: { x: 13, y: 5, facing: 'down' },
    fromWastes: { x: 1, y: 6, facing: 'right' },
  },
  warps: [
    { x: 4, y: 4, target: 'house', spawn: 'enter' },
    { x: 13, y: 4, target: 'tavern', spawn: 'enter' },
    { x: 9, y: 13, target: 'route', spawn: 'fromTown' },
    { x: 10, y: 13, target: 'route', spawn: 'fromTown' },
    { x: 0, y: 6, target: 'wastes', spawn: 'fromTown' },
    { x: 0, y: 7, target: 'wastes', spawn: 'fromTown' },
  ],
  npcs: [
    {
      x: 6,
      y: 9,
      name: 'Wynn',
      facing: 'down',
      lines: [
        'Wynn: You feel that hum off the hearth? A bound core, deep under the stones.',
        'Wynn: It keeps Emberfall lit. Costs a numen its freedom to do it, mind.',
      ],
    },
    {
      x: 13,
      y: 9,
      name: 'Harrow',
      facing: 'down',
      lines: [
        'Harrow: South of here the grass grows tall and the war-husks rust in it.',
        'Harrow: Weaken a wild thing before you bind it. Kill it and the core takes nothing.',
      ],
    },
    {
      x: 10,
      y: 5,
      name: 'Sela',
      facing: 'down',
      lines: [
        'Sela: Rest at a hearth whenever you like. It mends what the fighting breaks.',
        'Sela: If your whole team falls out there... you wake at the last hearth you rested by. Everything kept.',
      ],
    },
  ],
  objects: [
    {
      type: 'sign',
      x: 12,
      y: 5,
      lines: ['THE EMBERFALL TAVERN — hearth, board, and no questions.'],
    },
    {
      type: 'sign',
      x: 2,
      y: 8,
      lines: ['West: the Ashen Wastes. What the war left, left here.'],
    },
  ],
  encounters: null,
};
