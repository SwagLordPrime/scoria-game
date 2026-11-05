// Sable's workshop — the enterable building off Emberfall's west side.
// One NPC (lore on the containment cores), door back out to town.

export default {
  id: 'house',
  name: "Sable's Workshop",
  ascii: [
    '##########',
    '#ffffffff#',
    '#ffffffff#',
    '#ffffffff#',
    '#ffffffff#',
    '#ffffffff#',
    '#ffffffff#',
    '####DD####',
  ],
  spawns: {
    enter: { x: 4, y: 6, facing: 'up' },
  },
  warps: [
    { x: 4, y: 7, target: 'town', spawn: 'fromHouse' },
    { x: 5, y: 7, target: 'town', spawn: 'fromHouse' },
  ],
  npcs: [
    {
      x: 5,
      y: 2,
      name: 'Sable',
      facing: 'down',
      lines: [
        'Sable: Salvaged casing, a few etched runes, and old spite. That is a core.',
        'Sable: An Ember-thing runs a furnace. A Gale-thing spins a turbine. Living batteries.',
        'Sable: Half the war was fought over who gets to hold the lights. Still is, quietly.',
      ],
    },
  ],
  objects: [],
  encounters: null,
};
