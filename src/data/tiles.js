// Tile registry + ASCII map compiler.
//
// Maps are authored as ASCII grids (see data/maps/*.js). Each character maps to a
// tile definition here: which generated texture to draw, whether it's walkable,
// and flags (`tall` = wild-grass encounters, `heal` = safe-point hearth).
// This is the data-driven seam: adding a tile = one entry here; a Tiled JSON
// importer could later populate the same { key, walk, tall, heal } shape.

export const TILE = {
  '.': { char: '.', key: 'tile-ground', walk: true },
  ',': { char: ',', key: 'tile-ground2', walk: true },
  '"': { char: '"', key: 'tile-tallgrass', walk: true, tall: true },
  T: { char: 'T', key: 'tile-tree', walk: false },
  '~': { char: '~', key: 'tile-water', walk: false },
  o: { char: 'o', key: 'tile-rock', walk: false },
  '=': { char: '=', key: 'tile-path', walk: true },
  '#': { char: '#', key: 'tile-wall', walk: false },
  D: { char: 'D', key: 'tile-door', walk: true },
  f: { char: 'f', key: 'tile-floor', walk: true },
  c: { char: 'c', key: 'tile-cave', walk: true },
  C: { char: 'C', key: 'tile-cavewall', walk: false },
  H: { char: 'H', key: 'tile-heal', walk: true, heal: true },
  X: { char: 'X', key: 'tile-rubble', walk: false, seam: true },
  G: { char: 'G', key: 'tile-threshold', walk: true, threshold: true }, // rubble cleared by the boss (PHASE4)
  // PHASE9 — the Ashen Wastes (exterior ash) + the Deep Hollow (past the last lantern)
  a: { char: 'a', key: 'tile-ash', walk: true },
  d: { char: 'd', key: 'tile-ashdrift', walk: true, tall: true }, // deep ash — encounters
  t: { char: 't', key: 'tile-deadtree', walk: false },
  r: { char: 'r', key: 'tile-relic', walk: false }, // rusted war-husk (the landmark cluster)
  b: { char: 'b', key: 'tile-darkcave', walk: true },
  B: { char: 'B', key: 'tile-darkwall', walk: false },
  u: { char: 'u', key: 'tile-murk', walk: true, tall: true }, // murk patches — encounters
  // PHASE10 — the tavern table the handler stakes the three cores on
  p: { char: 'p', key: 'tile-table', walk: false },
};

// Compile a raw map def (with an `ascii` array) into a runtime map with a `grid`
// of tile chars plus validated width/height. Throws loudly on authoring mistakes
// (ragged rows, unknown chars) so they surface at boot, not mid-play.
export function buildMap(def) {
  const rows = def.ascii;
  if (!rows || !rows.length) throw new Error(`Map ${def.id}: empty ascii`);
  const height = rows.length;
  const width = rows[0].length;
  const grid = [];
  for (let y = 0; y < height; y++) {
    const line = rows[y];
    if (line.length !== width) {
      throw new Error(
        `Map ${def.id}: row ${y} has width ${line.length}, expected ${width}`
      );
    }
    const row = [];
    for (let x = 0; x < width; x++) {
      const ch = line[x];
      if (!TILE[ch]) {
        throw new Error(`Map ${def.id}: unknown tile char '${ch}' at (${x},${y})`);
      }
      row.push(ch);
    }
    grid.push(row);
  }
  const map = { ...def, width, height, grid };
  delete map.ascii;
  return map;
}

export function tileAt(map, x, y) {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return null;
  return TILE[map.grid[y][x]];
}

export function isWalkable(map, x, y) {
  const t = tileAt(map, x, y);
  return !!(t && t.walk);
}
