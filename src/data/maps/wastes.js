// The Ashen Wastes — PHASE9 §7. Exterior west of Emberfall: gray ash, dead trees,
// and a war-relic cluster as the landmark (a war-frame, knelt where it died). Deep
// ash drifts ('d') trigger wild encounters — the region's common numens live here.
//
// ASCII legend (see data/tiles.js): a ash  d ash drift (encounters)  t dead tree
//   r war-relic (blocked)  = warp path. East edge (rows 6-7) opens back into Emberfall.

export default {
  id: 'wastes',
  name: 'The Ashen Wastes',
  ascii: [
    'tttttttttttttttttttttt',
    'ta.a..aa..a...aa...a.t',
    't.dd..a..a..a..dd..a.t',
    't.dd.....rr.....dd...t',
    'ta...a..rrrr..a......t',
    't..a....rrr....a..a..t',
    't...a....r...........=',
    't..dd........a..a....=',
    't..dd...a..dd........t',
    'ta.....a...dd...a..a.t',
    't...a...........dd...t',
    't.a...a...a..a..dd..at',
    'ta..a......a......a..t',
    'tttttttttttttttttttttt',
  ],
  spawns: {
    fromTown: { x: 20, y: 6, facing: 'left' },
  },
  warps: [
    { x: 21, y: 6, target: 'town', spawn: 'fromWastes' },
    { x: 21, y: 7, target: 'town', spawn: 'fromWastes' },
  ],
  npcs: [],
  objects: [
    {
      type: 'sign',
      x: 11,
      y: 5,
      lines: [
        'A war-frame, knelt where it died. Centuries of ash, and the wastes have not buried it.',
        'Something small has been denning in the furnace-hollow of its chest.',
      ],
    },
  ],
  encounters: {
    rate: 0.18,
    table: [
      { species: 'Ashwhelp', rarity: 'common', min: 2, max: 4 },
      { species: 'Sporemote', rarity: 'common', min: 2, max: 4 },
      { species: 'Ashcap', rarity: 'uncommon', min: 3, max: 5 },
    ],
  },
};
