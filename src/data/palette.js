// Grounded muted palette — PHASE3_BUILD_PLAN §5. HEX for text/CSS, INT for Phaser
// Graphics. This is the single source of truth for color; keep the tone (deliberately
// NOT bright-Pokémon). Extra interior/UI shades derived to stay in-family.

export const HEX = {
  // terrain
  ground: '#59684d',
  ground2: '#63735a',
  grassSpeckleA: '#4e5c44',
  grassSpeckleB: '#63735a',
  tallgrass: '#44563b',
  path: '#7a6b56',
  tree: '#33452f',
  water: '#45586a',
  rock: '#6a6e73',
  // built / interior (in-family derivations)
  wall: '#4a4638',
  wood: '#6a4f34',
  floor: '#4b4030',
  cave: '#3c4045',
  cavewall: '#2a2d31',
  rubble: '#3a3d41',
  ember: '#a55a3a',
  emberGlow: '#d9964f',
  // PHASE9 — the Ashen Wastes (gray-tan ash family) + the Deep Hollow (past the
  // last lantern: near-black, a breath of umbra). Grounded, never bright.
  ash: '#6e6a60',
  ash2: '#787366',
  ashdrift: '#59554c',
  deadtree: '#453e33',
  relic: '#6a5140',
  darkfloor: '#1d1f23',
  darkwall: '#121317',
  murk: '#282430',
  // type colors
  Ember: '#a55a3a',
  Tide: '#4f6b82',
  Bloom: '#6f7d45',
  Gale: '#8f8aa6',
  Cinder: '#9a9186',
  Neutral: '#8f8a80',
  // UI
  panel: '#12160f',
  edge: '#2c3428',
  ink: '#c7cbbb',
  dim: '#8b917f',
  accent: '#9a7f4e',
  bad: '#a5533a',
  good: '#7d9153',
  bg: '#0a0c08',
  // character
  coat: '#8a6f45',
  coatTrim: '#6e5836',
  hair: '#241f1b',
  skin: '#b79b74',
  boots: '#3b3226',
};

export const INT = Object.fromEntries(
  Object.entries(HEX).map(([k, v]) => [k, parseInt(v.slice(1), 16)])
);

// Multiply an 0xRRGGBB int by a factor (for outlines / highlights).
export function shade(color, f) {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * f));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * f));
  const b = Math.min(255, Math.round((color & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}
