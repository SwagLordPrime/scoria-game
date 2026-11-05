// Fell-Grass Route — connects Emberfall (north) to the Hollow cave (south).
// Tall grass on both flanks; 18% wild-encounter roll per step onto a grass tile.

export default {
  id: 'route',
  name: 'Fell-Grass Route',
  ascii: [
    'TTTTTTTTT==TTTTTTTTT',
    'T........==........T',
    'T.""""...==..""""..T',
    'T.""""...==..""""..T',
    'T........==........T',
    'T........==........T',
    'T.""""...==..""""..T',
    'T.""""...==..""""..T',
    'T........==........T',
    'T........==........T',
    'T.""""...==..""""..T',
    'T.""""...==..""""..T',
    'T........==........T',
    'T........==........T',
    'T.""""...==..""""..T',
    'T.""""...==..""""..T',
    'T........==........T',
    'TTTTTTTTT==TTTTTTTTT',
  ],
  spawns: {
    fromTown: { x: 9, y: 1, facing: 'down' },
    fromCave: { x: 9, y: 16, facing: 'up' },
  },
  warps: [
    { x: 9, y: 0, target: 'town', spawn: 'fromRoute' },
    { x: 10, y: 0, target: 'town', spawn: 'fromRoute' },
    { x: 9, y: 17, target: 'cave', spawn: 'fromRoute' },
    { x: 10, y: 17, target: 'cave', spawn: 'fromRoute' },
  ],
  npcs: [
    {
      x: 3,
      y: 8,
      name: 'Rell',
      facing: 'right',
      lines: [
        'Rell: I forage the edges. I do not go into the tall grass anymore.',
        'Rell: Something in the Hollow started answering when I called down it. So — no.',
      ],
    },
  ],
  objects: [
    {
      type: 'sign',
      x: 2,
      y: 1,
      lines: ['ROUTE MARKER — Emberfall north. The Hollow south. Mind the grass.'],
    },
  ],
  encounters: {
    rate: 0.18,
    // PHASE9: rarity-tiered (see rollEncounter). Snarebriar haunts the verges;
    // Fenlight is the route's rare — the game's first Sorcerer, ~9% of rolls
    // (its "dusk over the flooded ruts" stays blurb flavor — no day/night system).
    table: [
      { species: 'Mireling', rarity: 'common', min: 3, max: 5 },
      { species: 'Fenmoth', rarity: 'common', min: 3, max: 5 },
      { species: 'Marrowling', rarity: 'common', min: 3, max: 5 },
      { species: 'Sistern', rarity: 'uncommon', min: 3, max: 5 },
      { species: 'Snarebriar', rarity: 'uncommon', min: 3, max: 5 },
      { species: 'Fenlight', rarity: 'rare', min: 4, max: 6 },
    ],
  },
};
