// Map registry. To add a new area: drop a new `*.js` def in this folder, import it
// here, and add it to RAW. Wire it into the world with a warp from an existing map.
// Everything downstream (rendering, collision, encounters) is data-driven off this.

import { buildMap } from '../tiles.js';
import town from './town.js';
import house from './house.js';
import route from './route.js';
import cave from './cave.js';
import tavern from './tavern.js';
import wastes from './wastes.js';
import deephollow from './deephollow.js';

const RAW = { town, house, route, cave, tavern, wastes, deephollow };

// Compile once at import (buildMap validates widths / tile chars and throws loudly).
export const MAPS = Object.fromEntries(
  Object.entries(RAW).map(([id, def]) => [id, buildMap({ ...def, id })])
);

export function getMap(id) {
  const m = MAPS[id];
  if (!m) throw new Error(`No such map: ${id}`);
  return m;
}

export function getSpawn(mapId, spawnKey) {
  const m = getMap(mapId);
  const s = m.spawns?.[spawnKey];
  if (!s) throw new Error(`Map ${mapId} has no spawn '${spawnKey}'`);
  return s;
}
