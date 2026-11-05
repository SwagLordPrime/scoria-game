// The Hollow — the deeper cave/gate zone. Fungal grass ('"') triggers tougher wild
// encounters. The southern passage is collapsed rubble ('X', seam:true): the Phase 4
// mini-boss gate. Traversable up to the seam; PHASE9: once the Barrow-King falls the
// seam tiles become the open threshold AND carry warps down into the Deep Hollow —
// while the rubble stands the warp tiles are unwalkable, so the deep is provably
// gated behind the boss (sim-phase9 walks the map graph to prove it).
//
// ASCII legend (see data/tiles.js): C cave wall  c cave floor  o rock pillar
//   " fungal grass (encounters)  X collapsed passage (blocked seam)  = warp path.

export default {
  id: 'cave',
  name: 'The Hollow',
  ascii: [
    'CCCCCCCCC==CCCCCCCCC',
    'CccccccccccccccccccC',
    'Ccc""cccccccccc""ccC',
    'Ccc""ccccoocccc""ccC',
    'CccccccccooccccccccC',
    'CccccccccccccccccccC',
    'Cccccc"""ccccccccccC',
    'Cccccc"""ccccccccccC',
    'CccooccccccccccooccC',
    'CccccccccccccccccccC',
    'Cccccccccc"""ccccccC',
    'Cccccccccc"""ccccccC',
    'CccccccccccccccccccC',
    'CcccccccoooocccccccC',
    'CccccccccccccccccccC',
    'CCCCCCCCCXXCCCCCCCCC',
  ],
  // The gate boss (PHASE4). While `flag` is false, the seamTiles are collapsed rubble
  // ('X') that walls the way south and, on interact, telegraphs + triggers the boss.
  // Once the flag is set, those tiles become an open threshold ('G') — reconciled every
  // time the map loads, so it survives reload and resets on New Game.
  gate: {
    boss: 'BarrowKing',
    flag: 'barrowKingDefeated',
    seamTiles: [
      [9, 15],
      [10, 15],
    ],
  },
  spawns: {
    fromRoute: { x: 9, y: 1, facing: 'down' },
    fromDeep: { x: 9, y: 14, facing: 'up' }, // climbing back out of the Deep Hollow
  },
  warps: [
    { x: 9, y: 0, target: 'route', spawn: 'fromCave' },
    { x: 10, y: 0, target: 'route', spawn: 'fromCave' },
    // PHASE9: the gate seam itself — unreachable while the tiles are rubble ('X').
    { x: 9, y: 15, target: 'deephollow', spawn: 'fromCave' },
    { x: 10, y: 15, target: 'deephollow', spawn: 'fromCave' },
  ],
  npcs: [],
  objects: [],
  encounters: {
    rate: 0.18,
    // PHASE9: rarity-tiered (see rollEncounter) + Borck joins the barrow-fields.
    table: [
      { species: 'Marrowling', rarity: 'common', min: 5, max: 6 },
      { species: 'Fenmoth', rarity: 'common', min: 5, max: 6 },
      { species: 'Sistern', rarity: 'uncommon', min: 4, max: 6 },
      { species: 'Borck', rarity: 'uncommon', min: 5, max: 6 },
    ],
  },
};
