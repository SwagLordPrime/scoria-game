// Code-generated placeholder art — PHASE3_BUILD_PLAN §5 / §10. Every tile, the
// player, NPCs, and creatures are drawn procedurally into Phaser textures at Boot.
// Real art later drops into the same texture keys. Grounded muted palette only.

import { INT, shade } from '../data/palette.js';
import { SPECIES } from '../data/creatures.js';
import { TYPE_COLORS } from '../data/types.js';

export const TILE_SIZE = 32;

function makeTex(scene, key, w, h, draw) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

// Deterministic speckle scatter so a reused tile texture looks textured, not flat.
function speckle(g, colors, count, w, h, seed) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < count; i++) {
    g.fillStyle(colors[i % colors.length], 1);
    g.fillRect(Math.floor(rnd() * (w - 2)), Math.floor(rnd() * (h - 2)), 2, 2);
  }
}

function generateTiles(scene) {
  const S = TILE_SIZE;

  makeTex(scene, 'tile-ground', S, S, (g) => {
    g.fillStyle(INT.ground, 1).fillRect(0, 0, S, S);
    speckle(g, [INT.grassSpeckleA, INT.grassSpeckleB], 10, S, S, 7);
  });

  makeTex(scene, 'tile-ground2', S, S, (g) => {
    g.fillStyle(INT.ground2, 1).fillRect(0, 0, S, S);
    speckle(g, [INT.ground, shade(INT.ground2, 1.12)], 12, S, S, 31);
  });

  makeTex(scene, 'tile-tallgrass', S, S, (g) => {
    g.fillStyle(shade(INT.tallgrass, 0.85), 1).fillRect(0, 0, S, S);
    g.fillStyle(INT.tallgrass, 1).fillRect(0, 6, S, S - 6);
    // blades
    const blade = (x, y, c) => {
      g.fillStyle(c, 1).fillRect(x, y, 2, 8);
    };
    const cols = [shade(INT.tallgrass, 1.25), INT.grassSpeckleB, shade(INT.tallgrass, 1.1)];
    let i = 0;
    for (let x = 3; x < S; x += 5) {
      blade(x, 14 + ((i * 3) % 6), cols[i % cols.length]);
      i++;
    }
  });

  makeTex(scene, 'tile-tree', S, S, (g) => {
    g.fillStyle(INT.ground, 1).fillRect(0, 0, S, S);
    g.fillStyle(0x4a3f2e, 1).fillRect(14, 22, 4, 8); // trunk
    g.fillStyle(shade(INT.tree, 0.7), 1).fillCircle(16, 15, 12); // shadow ring
    g.fillStyle(INT.tree, 1).fillCircle(16, 14, 11);
    g.fillStyle(shade(INT.tree, 1.25), 1).fillCircle(12, 11, 3);
    g.fillStyle(shade(INT.tree, 1.15), 1).fillCircle(20, 16, 2);
  });

  makeTex(scene, 'tile-water', S, S, (g) => {
    g.fillStyle(INT.water, 1).fillRect(0, 0, S, S);
    g.fillStyle(shade(INT.water, 1.2), 1);
    g.fillRect(3, 7, 12, 2).fillRect(18, 15, 10, 2).fillRect(6, 24, 14, 2);
    g.fillStyle(shade(INT.water, 0.85), 1).fillRect(0, 28, S, 4);
  });

  makeTex(scene, 'tile-rock', S, S, (g) => {
    g.fillStyle(INT.ground, 1).fillRect(0, 0, S, S);
    g.fillStyle(shade(INT.rock, 0.8), 1).fillRoundedRect(4, 6, 24, 22, 6);
    g.fillStyle(INT.rock, 1).fillRoundedRect(5, 5, 22, 20, 6);
    g.fillStyle(shade(INT.rock, 1.15), 1).fillRoundedRect(8, 7, 9, 6, 3);
  });

  makeTex(scene, 'tile-path', S, S, (g) => {
    g.fillStyle(INT.path, 1).fillRect(0, 0, S, S);
    speckle(g, [shade(INT.path, 0.85), shade(INT.path, 1.12)], 14, S, S, 13);
  });

  makeTex(scene, 'tile-wall', S, S, (g) => {
    g.fillStyle(INT.wall, 1).fillRect(0, 0, S, S);
    g.lineStyle(1, shade(INT.wall, 0.7), 1);
    g.strokeRect(0, 0, S, S);
    g.beginPath();
    g.moveTo(0, 11).lineTo(S, 11).moveTo(0, 22).lineTo(S, 22);
    g.moveTo(16, 0).lineTo(16, 11).moveTo(8, 11).lineTo(8, 22).moveTo(24, 11).lineTo(24, 22);
    g.moveTo(16, 22).lineTo(16, 32).strokePath();
    g.fillStyle(shade(INT.wall, 1.12), 1).fillRect(2, 2, 12, 7);
  });

  makeTex(scene, 'tile-door', S, S, (g) => {
    g.fillStyle(INT.wall, 1).fillRect(0, 0, S, S);
    g.fillStyle(shade(INT.wood, 0.7), 1).fillRect(7, 4, 18, 28);
    g.fillStyle(INT.wood, 1).fillRect(8, 5, 16, 27);
    g.fillStyle(shade(INT.wood, 0.55), 1).fillRect(15, 5, 2, 27);
    g.fillStyle(INT.accent, 1).fillCircle(21, 19, 1.6); // handle
  });

  makeTex(scene, 'tile-floor', S, S, (g) => {
    g.fillStyle(INT.floor, 1).fillRect(0, 0, S, S);
    g.lineStyle(1, shade(INT.floor, 0.78), 1);
    g.beginPath();
    g.moveTo(0, 10).lineTo(S, 10).moveTo(0, 21).lineTo(S, 21).strokePath();
    speckle(g, [shade(INT.floor, 1.1)], 5, S, S, 91);
  });

  makeTex(scene, 'tile-cave', S, S, (g) => {
    g.fillStyle(INT.cave, 1).fillRect(0, 0, S, S);
    speckle(g, [shade(INT.cave, 0.82), shade(INT.cave, 1.18)], 9, S, S, 55);
  });

  makeTex(scene, 'tile-cavewall', S, S, (g) => {
    g.fillStyle(INT.cavewall, 1).fillRect(0, 0, S, S);
    g.lineStyle(1, shade(INT.cavewall, 1.4), 1);
    g.beginPath();
    g.moveTo(4, 0).lineTo(9, 12).lineTo(6, 24).moveTo(22, 4).lineTo(26, 18).strokePath();
    g.fillStyle(shade(INT.cavewall, 0.7), 1).fillRect(0, 27, S, 5);
  });

  makeTex(scene, 'tile-heal', S, S, (g) => {
    g.fillStyle(INT.floor, 1).fillRect(0, 0, S, S);
    g.fillStyle(shade(INT.rock, 0.85), 1).fillCircle(16, 16, 12); // stone ring
    g.fillStyle(INT.cavewall, 1).fillCircle(16, 16, 9);
    g.fillStyle(shade(INT.ember, 0.7), 1).fillCircle(16, 17, 7);
    g.fillStyle(INT.ember, 1).fillCircle(16, 17, 5);
    g.fillStyle(INT.emberGlow, 1).fillCircle(16, 16, 3);
    g.fillStyle(0xf0d29a, 1).fillCircle(15, 15, 1.5);
  });

  makeTex(scene, 'tile-rubble', S, S, (g) => {
    g.fillStyle(INT.cavewall, 1).fillRect(0, 0, S, S);
    g.fillStyle(shade(INT.rubble, 0.8), 1).fillRoundedRect(2, 14, 12, 12, 3);
    g.fillStyle(INT.rubble, 1).fillRoundedRect(10, 8, 14, 14, 3);
    g.fillStyle(shade(INT.rubble, 1.15), 1).fillRoundedRect(18, 16, 11, 12, 3);
    g.fillStyle(shade(INT.rubble, 0.65), 1).fillRect(0, 28, S, 4);
  });

  // ---- PHASE9 — the Ashen Wastes ------------------------------------------
  makeTex(scene, 'tile-ash', S, S, (g) => {
    g.fillStyle(INT.ash, 1).fillRect(0, 0, S, S);
    speckle(g, [INT.ash2, shade(INT.ash, 0.85)], 11, S, S, 43);
  });

  makeTex(scene, 'tile-ashdrift', S, S, (g) => {
    // deep ash the way tallgrass is deep grass — drifts you wade through
    g.fillStyle(shade(INT.ashdrift, 0.9), 1).fillRect(0, 0, S, S);
    g.fillStyle(INT.ashdrift, 1).fillRect(0, 5, S, S - 5);
    g.fillStyle(shade(INT.ashdrift, 1.25), 1); // drift crests
    g.fillEllipse(8, 14, 14, 6).fillEllipse(24, 22, 16, 7).fillEllipse(12, 28, 12, 5);
    g.fillStyle(shade(INT.ashdrift, 0.75), 1); // wind-scoured hollows
    g.fillEllipse(20, 10, 8, 3).fillEllipse(28, 30, 8, 3);
    speckle(g, [INT.ash2], 5, S, S, 61);
  });

  makeTex(scene, 'tile-deadtree', S, S, (g) => {
    g.fillStyle(INT.ash, 1).fillRect(0, 0, S, S);
    g.fillStyle(shade(INT.deadtree, 0.8), 1).fillRect(13, 12, 6, 18); // charred trunk
    g.fillStyle(INT.deadtree, 1).fillRect(14, 12, 4, 18);
    g.lineStyle(2, INT.deadtree, 1); // bare reaching branches
    g.beginPath();
    g.moveTo(16, 14).lineTo(8, 5).moveTo(16, 12).lineTo(23, 3).moveTo(16, 18).lineTo(26, 12).moveTo(16, 20).lineTo(6, 16);
    g.strokePath();
    g.fillStyle(shade(INT.ash, 0.8), 1).fillEllipse(16, 30, 16, 4); // ash drifted at the roots
  });

  makeTex(scene, 'tile-relic', S, S, (g) => {
    // a piece of the war: rusted plate half-swallowed by ash
    g.fillStyle(INT.ash, 1).fillRect(0, 0, S, S);
    g.fillStyle(shade(INT.relic, 0.6), 1).fillRoundedRect(3, 8, 26, 20, 4); // hull shadow
    g.fillStyle(INT.relic, 1).fillRoundedRect(4, 7, 24, 19, 4); // rusted hull
    g.fillStyle(shade(INT.relic, 1.25), 1).fillRect(6, 10, 20, 3); // worn top edge
    g.fillStyle(shade(INT.relic, 0.75), 1).fillRect(6, 17, 20, 2).fillRect(14, 7, 3, 19); // seams
    g.fillStyle(shade(INT.relic, 0.5), 1); // rivet line
    for (let i = 0; i < 4; i++) g.fillCircle(8 + i * 5.5, 22, 1.2);
    g.fillStyle(shade(INT.ash, 1.1), 1).fillEllipse(16, 28, 22, 5); // ash lapping the base
  });

  // ---- PHASE9 — the Deep Hollow (past the last lantern) --------------------
  makeTex(scene, 'tile-darkcave', S, S, (g) => {
    g.fillStyle(INT.darkfloor, 1).fillRect(0, 0, S, S);
    speckle(g, [shade(INT.darkfloor, 1.35), shade(INT.darkfloor, 0.7)], 6, S, S, 77);
  });

  makeTex(scene, 'tile-darkwall', S, S, (g) => {
    g.fillStyle(INT.darkwall, 1).fillRect(0, 0, S, S);
    g.lineStyle(1, shade(INT.darkwall, 1.6), 1);
    g.beginPath();
    g.moveTo(6, 0).lineTo(10, 14).lineTo(7, 26).moveTo(24, 6).lineTo(27, 20).strokePath();
    g.fillStyle(shade(INT.darkwall, 0.6), 1).fillRect(0, 28, S, 4);
  });

  makeTex(scene, 'tile-murk', S, S, (g) => {
    // where the dark is thick enough to hide something — the deep's encounter tile
    g.fillStyle(INT.darkfloor, 1).fillRect(0, 0, S, S);
    g.fillStyle(INT.murk, 0.9).fillEllipse(16, 18, 30, 24);
    g.fillStyle(shade(INT.murk, 1.3), 0.6); // faint umbral wisps
    g.fillEllipse(10, 12, 10, 4).fillEllipse(22, 24, 12, 4).fillEllipse(14, 29, 8, 3);
    g.fillStyle(shade(INT.murk, 0.6), 0.8).fillEllipse(18, 17, 10, 6); // a darker pocket
  });

  // PHASE10 — the tavern table the three cores are staked on. Adjacent table tiles
  // read as one plank run; the cores themselves are objects drawn on top.
  makeTex(scene, 'tile-table', S, S, (g) => {
    g.fillStyle(INT.floor, 1).fillRect(0, 0, S, S);
    g.fillStyle(shade(INT.wood, 0.6), 1).fillRect(0, 26, S, 3); // underside shadow
    g.fillStyle(shade(INT.wood, 0.5), 1).fillRect(3, 26, 4, 5).fillRect(25, 26, 4, 5); // legs
    g.fillStyle(INT.wood, 1).fillRect(0, 5, S, 22); // tabletop
    g.fillStyle(shade(INT.wood, 1.18), 1).fillRect(0, 5, S, 3); // lit edge
    g.fillStyle(shade(INT.wood, 0.8), 1).fillRect(0, 13, S, 1).fillRect(0, 20, S, 1); // plank seams
    speckle(g, [shade(INT.wood, 0.9)], 4, S, 20, 23);
  });

  // The opened gateway once the Barrow-King falls: rubble cleared to the sides, a dark
  // arch breathing cold air from the road south.
  makeTex(scene, 'tile-threshold', S, S, (g) => {
    g.fillStyle(INT.cavewall, 1).fillRect(0, 0, S, S);
    g.fillStyle(shade(INT.cave, 0.35), 1).fillRect(6, 2, 20, 30); // dark passage mouth
    g.fillStyle(0x000000, 1).fillRect(9, 6, 14, 24); // deeper black
    g.fillStyle(shade(INT.cavewall, 1.2), 1); // arch stones
    g.fillRect(5, 1, 22, 3).fillRect(5, 1, 3, 12).fillRect(24, 1, 3, 12);
    g.fillStyle(shade(INT.rubble, 0.7), 1).fillRoundedRect(1, 22, 7, 9, 2); // cleared rubble sides
    g.fillStyle(shade(INT.rubble, 0.7), 1).fillRoundedRect(24, 22, 7, 9, 2);
    g.fillStyle(0x3a4c58, 0.55).fillRect(11, 20, 10, 10); // faint cold glow from below
  });
}

// The Barrow-King — an imposing bone-titan, drawn taller and darker than a Marrowling
// so it looms when the Battle scene scales it up. Cinder palette, grounded (dread, not gore).
function generateBoss(scene) {
  const S = 48;
  const base = parseInt(TYPE_COLORS.Cinder.slice(1), 16);
  const bone = 0xbdb6a6;
  const boneDim = shade(bone, 0.62);
  const dark = shade(base, 0.5);
  makeTex(scene, 'creature-BarrowKing', S, S, (g) => {
    g.fillStyle(0x000000, 0.32).fillEllipse(24, 45, 34, 7); // shadow
    // hulking cloaked body (fills the frame — reads big when scaled)
    g.fillStyle(dark, 1).fillRoundedRect(9, 16, 30, 30, 5);
    g.fillStyle(shade(base, 0.66), 1).fillRoundedRect(12, 19, 24, 25, 4);
    // ribcage
    g.fillStyle(boneDim, 1);
    for (let i = 0; i < 4; i++) g.fillRect(15, 24 + i * 5, 18, 2);
    g.fillStyle(bone, 1).fillRect(23, 22, 2, 22); // spine
    // skull head
    g.fillStyle(boneDim, 1).fillCircle(24, 13, 9);
    g.fillStyle(bone, 1).fillCircle(24, 12, 8);
    // jagged crown of horns
    g.fillStyle(boneDim, 1);
    g.fillTriangle(15, 8, 12, -3, 19, 6);
    g.fillTriangle(33, 8, 36, -3, 29, 6);
    g.fillTriangle(24, 4, 21, -6, 27, -6);
    // hollow burning eyes
    g.fillStyle(0x120f0d, 1).fillCircle(20, 12, 2.4).fillCircle(28, 12, 2.4);
    g.fillStyle(INT.ember, 1).fillCircle(20, 12, 1.3).fillCircle(28, 12, 1.3);
    g.fillStyle(0x1a1712, 1).fillRect(22, 15, 4, 5); // nasal cavity
    // fused greatweapon over the shoulder
    g.fillStyle(boneDim, 1).fillRect(37, 6, 4, 34);
    g.fillStyle(bone, 1).fillTriangle(34, 8, 44, 8, 39, -2);
  });
}

// PHASE10 — the three staked cores (§2): rune-etched canisters of war-scrap (design
// canon §6), each reading as its make. Small, dull, tabletop objects — no sparkle.
function generateCores(scene) {
  const S = 32;
  // Forge-make: scrap-iron, a banked furnace seam
  makeTex(scene, 'core-forge', S, S, (g) => {
    g.fillStyle(0x000000, 0.25).fillEllipse(16, 25, 14, 4);
    g.fillStyle(0x3a352c, 1).fillRoundedRect(9, 8, 14, 17, 4);
    g.fillStyle(0x4a4438, 1).fillRoundedRect(10, 9, 12, 15, 4);
    g.fillStyle(0x2c2822, 1).fillRect(12, 11, 8, 2); // rune band, unlit
    g.fillStyle(shade(INT.ember, 0.8), 1).fillRect(11, 16, 10, 2); // the seam
    g.fillStyle(INT.ember, 1).fillRect(13, 16, 6, 2); // dull glow banked in it
    g.fillStyle(0x5a5344, 1).fillRect(13, 6, 6, 3); // cap
  });
  // Barrow-salvage: bone-white, scored, cold
  makeTex(scene, 'core-bone', S, S, (g) => {
    g.fillStyle(0x000000, 0.25).fillEllipse(16, 25, 14, 4);
    g.fillStyle(0x8f887a, 1).fillRoundedRect(9, 8, 14, 17, 4);
    g.fillStyle(0xbdb6a6, 1).fillRoundedRect(10, 9, 12, 15, 4);
    g.fillStyle(0x9a9186, 1).fillRect(11, 14, 10, 1).fillRect(11, 18, 10, 1); // rune scoring
    g.fillStyle(0x7c7568, 1).fillRect(12, 11, 8, 2); // dim band
    g.fillStyle(0xa39c8d, 1).fillRect(13, 6, 6, 3);
  });
  // The Remnant castoff: dead-zone salvage, its light off-center and wrong
  makeTex(scene, 'core-signal', S, S, (g) => {
    g.fillStyle(0x000000, 0.25).fillEllipse(16, 25, 14, 4);
    g.fillStyle(0x2e2c38, 1).fillRoundedRect(9, 8, 14, 17, 4);
    g.fillStyle(0x3b3947, 1).fillRoundedRect(10, 9, 12, 15, 4);
    g.fillStyle(0x8f8aa6, 0.5).fillRect(11, 13, 10, 1); // a flicker, off-true
    g.fillStyle(0xcdd3e8, 0.95).fillRect(14, 17, 5, 2); // the signal, off-center
    g.fillStyle(0xcdd3e8, 0.4).fillRect(11, 21, 3, 1); // stray flicker
    g.fillStyle(0x4a4658, 1).fillRect(13, 6, 6, 3);
  });
}

function generatePlayer(scene) {
  const faces = ['down', 'up', 'left', 'right'];
  for (const f of faces) {
    makeTex(scene, `player-${f}`, 32, 32, (g) => {
      g.fillStyle(0x000000, 0.22).fillEllipse(16, 28, 16, 5); // shadow
      g.fillStyle(INT.boots, 1).fillRect(11, 22, 4, 6).fillRect(17, 22, 4, 6);
      g.fillStyle(INT.coat, 1).fillRoundedRect(9, 11, 14, 13, 3); // coat
      g.lineStyle(1, INT.coatTrim, 1).strokeRoundedRect(9, 11, 14, 13, 3);
      g.fillStyle(INT.accent, 1).fillRect(15, 12, 2, 12); // coat seam
      g.fillStyle(INT.skin, 1).fillCircle(16, 8, 5); // head
      // hair + face by facing
      g.fillStyle(INT.hair, 1);
      if (f === 'up') {
        g.fillCircle(16, 8, 5);
      } else if (f === 'left') {
        g.fillRect(16, 3, 6, 10);
        g.fillStyle(INT.hair, 1).fillRect(11, 3, 11, 3);
        g.fillStyle(INT.hair, 1).fillCircle(12, 8, 1.3); // eye
      } else if (f === 'right') {
        g.fillRect(10, 3, 6, 10);
        g.fillStyle(INT.hair, 1).fillRect(10, 3, 11, 3);
        g.fillStyle(INT.hair, 1).fillCircle(20, 8, 1.3);
      } else {
        g.fillRect(11, 3, 10, 4); // fringe
        g.fillStyle(INT.hair, 1).fillCircle(14, 8, 1.2).fillCircle(18, 8, 1.2); // eyes
      }
    });
  }
}

function generateNpc(scene) {
  // Drawn in light neutral tones so per-NPC setTint() reads cleanly.
  makeTex(scene, 'npc', 32, 32, (g) => {
    g.fillStyle(0x000000, 0.22).fillEllipse(16, 28, 16, 5);
    g.fillStyle(0xcfcabb, 1).fillRoundedRect(8, 10, 16, 16, 5); // robe
    g.lineStyle(1, 0x9a978c, 1).strokeRoundedRect(8, 10, 16, 16, 5);
    g.fillStyle(0xb8b3a4, 1).fillRoundedRect(9, 4, 14, 9, 5); // hood
    g.fillStyle(0x54503f, 1).fillRect(12, 8, 8, 4); // shadowed face
    g.fillStyle(0xe6e0d0, 1).fillCircle(14, 10, 1).fillCircle(18, 10, 1); // eyes
  });
}

function generateCreatures(scene) {
  const S = 48;
  for (const [key, sp] of Object.entries(SPECIES)) {
    const base = parseInt(TYPE_COLORS[sp.type].slice(1), 16);
    const outline = shade(base, 0.55);
    const light = shade(base, 1.3);
    makeTex(scene, `creature-${key}`, S, S, (g) => {
      g.fillStyle(0x000000, 0.28).fillEllipse(24, 42, 30, 7); // shadow
      drawCreatureBody(g, sp, base, outline, light);
    });
  }
}

function eyes(g, x1, x2, y) {
  g.fillStyle(0xe6e2d2, 1).fillCircle(x1, y, 2.4).fillCircle(x2, y, 2.4);
  g.fillStyle(0x1a1712, 1).fillCircle(x1, y, 1.1).fillCircle(x2, y, 1.1);
}

function drawCreatureBody(g, sp, base, outline, light) {
  switch (sp.name) {
    case 'Slagling': {
      // blocky war-frame, furnace glow through the seams
      g.fillStyle(outline, 1).fillRect(11, 15, 26, 26);
      g.fillStyle(base, 1).fillRect(13, 17, 22, 22);
      g.fillStyle(shade(base, 0.8), 1).fillRect(13, 17, 22, 5); // plating
      g.fillStyle(INT.ember, 1).fillRect(15, 26, 18, 3).fillRect(22, 17, 3, 22); // seams
      g.fillStyle(INT.emberGlow, 1).fillCircle(24, 30, 4); // furnace core
      g.fillStyle(0xf0d29a, 1).fillCircle(24, 30, 2);
      eyes(g, 19, 29, 22);
      break;
    }
    case 'Forgewrought': {
      // the scrap rebuilt into armor — taller frame, pauldrons, seams burning hotter
      g.fillStyle(shade(base, 0.7), 1).fillRect(4, 12, 7, 11).fillRect(37, 12, 7, 11); // pauldrons
      g.fillStyle(outline, 1).fillRect(9, 9, 30, 32);
      g.fillStyle(base, 1).fillRect(11, 11, 26, 28);
      g.fillStyle(shade(base, 0.8), 1).fillRect(11, 11, 26, 6); // brow plating
      g.fillStyle(shade(base, 0.72), 1).fillRect(11, 33, 26, 6); // greave band
      g.fillStyle(INT.ember, 1).fillRect(13, 24, 22, 3).fillRect(22, 11, 4, 28); // hot seams
      g.fillStyle(INT.emberGlow, 1).fillCircle(24, 30, 5); // furnace core, burning wider
      g.fillStyle(0xf0d29a, 1).fillCircle(24, 30, 2.5);
      g.fillStyle(shade(base, 0.6), 1).fillRect(13, 41, 8, 4).fillRect(27, 41, 8, 4); // feet
      eyes(g, 18, 30, 17);
      break;
    }
    case 'Warkiln': {
      // a walking kiln — chimney-crowned, grate-maw glowing, near fills the frame
      g.fillStyle(shade(base, 0.62), 1).fillRect(9, 2, 6, 10).fillRect(33, 2, 6, 10); // chimneys
      g.fillStyle(shade(base, 0.45), 1).fillRect(10, 0, 4, 3).fillRect(34, 0, 4, 3); // sooted rims
      g.fillStyle(shade(base, 0.7), 1).fillRect(1, 13, 7, 13).fillRect(40, 13, 7, 13); // pauldrons
      g.fillStyle(outline, 1).fillRect(6, 9, 36, 35);
      g.fillStyle(base, 1).fillRect(8, 11, 32, 31);
      g.fillStyle(shade(base, 0.8), 1).fillRect(8, 11, 32, 7); // brow plating
      g.fillStyle(INT.ember, 1).fillRect(10, 26, 28, 3).fillRect(21, 11, 6, 31); // molten seams
      g.fillStyle(INT.emberGlow, 1).fillRect(14, 31, 20, 7); // kiln maw
      g.fillStyle(0x1a1712, 1); // grate bars over the maw
      for (let i = 0; i < 4; i++) g.fillRect(16 + i * 5, 31, 2, 7);
      g.fillStyle(0xf0d29a, 1).fillRect(22, 33, 4, 3); // white-hot heart
      g.fillStyle(shade(base, 0.6), 1).fillRect(10, 42, 11, 4).fillRect(27, 42, 11, 4); // feet
      eyes(g, 17, 31, 17);
      break;
    }
    case 'Mireling': {
      // lumpy fungal bruiser
      g.fillStyle(outline, 1).fillCircle(24, 30, 15);
      g.fillStyle(base, 1).fillCircle(24, 30, 13);
      g.fillStyle(shade(base, 1.15), 1).fillCircle(17, 22, 5).fillCircle(31, 21, 4).fillCircle(24, 18, 4);
      g.fillStyle(shade(base, 0.8), 1).fillCircle(19, 34, 2).fillCircle(30, 33, 2).fillCircle(25, 38, 2);
      eyes(g, 20, 28, 29);
      break;
    }
    case 'Fenmoth': {
      // slim gale striker with ragged wings
      g.fillStyle(shade(base, 1.1), 1);
      g.fillTriangle(24, 22, 6, 12, 10, 34); // left wing
      g.fillTriangle(24, 22, 42, 12, 38, 34); // right wing
      g.lineStyle(1, outline, 1).strokeTriangle(24, 22, 6, 12, 10, 34).strokeTriangle(24, 22, 42, 12, 38, 34);
      g.fillStyle(outline, 1).fillEllipse(24, 30, 12, 22);
      g.fillStyle(base, 1).fillEllipse(24, 30, 9, 19);
      g.lineStyle(1, outline, 1).lineBetween(21, 12, 19, 6).lineBetween(27, 12, 29, 6); // antennae
      eyes(g, 21, 27, 26);
      break;
    }
    case 'Sistern': {
      // drowned bell warden
      g.fillStyle(outline, 1).fillEllipse(24, 30, 32, 26);
      g.fillStyle(base, 1).fillEllipse(24, 29, 28, 23);
      g.fillStyle(shade(base, 0.78), 1).fillRect(9, 33, 30, 6); // rim
      g.fillStyle(light, 1).fillEllipse(17, 22, 6, 10); // sheen
      g.fillStyle(shade(base, 0.7), 1).fillRect(23, 30, 2, 10); // clapper
      eyes(g, 19, 29, 26);
      break;
    }
    case 'Marrowling': {
      // reassembling bone, cinder-grey
      g.fillStyle(outline, 1).fillRoundedRect(13, 18, 22, 22, 4);
      g.fillStyle(base, 1).fillRoundedRect(15, 20, 18, 18, 4);
      g.fillStyle(0xcfc7b8, 1); // bone shards
      g.fillTriangle(15, 20, 12, 10, 21, 18);
      g.fillTriangle(33, 20, 36, 10, 27, 18);
      g.fillStyle(shade(base, 0.7), 1).fillRect(18, 28, 12, 1.5).fillRect(18, 32, 12, 1.5); // ribs
      g.fillStyle(0xcfc7b8, 1).fillRect(31, 24, 3, 16); // fused shard-weapon
      eyes(g, 20, 28, 25);
      break;
    }
    case 'Ossclad': {
      // the clatter found its shape — bone lapped over bone like grown armor
      const bone = 0xcfc7b8;
      const boneDim = shade(bone, 0.72);
      g.fillStyle(bone, 1); // pauldron shards
      g.fillTriangle(13, 14, 5, 4, 21, 12);
      g.fillTriangle(35, 14, 43, 4, 27, 12);
      g.fillStyle(outline, 1).fillRoundedRect(10, 11, 28, 31, 5);
      g.fillStyle(base, 1).fillRoundedRect(12, 13, 24, 27, 4);
      g.fillStyle(boneDim, 1); // lapped rib plates
      for (let i = 0; i < 3; i++) g.fillRect(15, 22 + i * 5, 18, 2.5);
      g.fillStyle(bone, 1).fillRect(23, 13, 2, 27); // fused spine
      g.fillStyle(bone, 1).fillRect(4, 18, 3, 20).fillRect(41, 18, 3, 20); // twin shard-arms
      g.fillStyle(shade(base, 0.65), 1).fillRect(14, 40, 8, 4).fillRect(26, 40, 8, 4); // feet
      eyes(g, 19, 29, 18);
      break;
    }
    case 'Bonemarch': {
      // a marching ossuary — tall ribbed column, antler sweep, twin grave-blades
      const bone = 0xcfc7b8;
      const boneDim = shade(bone, 0.72);
      g.fillStyle(boneDim, 1); // antler sweep (kept distinct from the King's horn crown)
      g.fillTriangle(16, 10, 8, 0, 21, 8);
      g.fillTriangle(32, 10, 40, 0, 27, 8);
      g.fillStyle(outline, 1).fillRoundedRect(10, 7, 28, 37, 5);
      g.fillStyle(base, 1).fillRoundedRect(12, 9, 24, 33, 4);
      g.fillStyle(shade(base, 0.8), 1).fillRect(12, 9, 24, 5); // brow plate
      g.fillStyle(boneDim, 1); // deep rib stack
      for (let i = 0; i < 4; i++) g.fillRect(15, 20 + i * 5, 18, 2.5);
      g.fillStyle(bone, 1).fillRect(23, 9, 2, 33); // fused spine
      g.fillStyle(bone, 1).fillRect(3, 9, 4, 26).fillRect(41, 9, 4, 26); // twin grave-blades
      g.fillStyle(bone, 1).fillTriangle(2, 9, 8, 9, 5, 2).fillTriangle(40, 9, 46, 9, 43, 2); // blade tips
      g.fillStyle(shade(base, 0.65), 1).fillRect(14, 42, 8, 4).fillRect(26, 42, 8, 4); // feet
      eyes(g, 19, 29, 16);
      break;
    }
    // ---- PHASE9 — the demo-region nine (grounded palette; imposing per rarity) ----
    case 'Ashwhelp': {
      // a whelp-shaped knot of char and wire, ember still live in the seams
      const char = 0x2e2620;
      g.fillStyle(shade(char, 0.7), 1).fillRoundedRect(9, 24, 24, 15, 5); // body outline
      g.fillStyle(char, 1).fillRoundedRect(10, 25, 22, 13, 5);
      g.fillStyle(shade(char, 0.8), 1).fillCircle(33, 22, 7); // head, low and forward
      g.fillStyle(char, 1).fillCircle(33, 21, 6);
      g.fillStyle(INT.ember, 1).fillRect(12, 30, 18, 2); // live seam along the flank
      g.fillStyle(INT.emberGlow, 1).fillRect(18, 30, 4, 2);
      g.lineStyle(1, shade(char, 1.6), 1); // trailing wire tail
      g.beginPath();
      g.moveTo(10, 28).lineTo(4, 22).lineTo(7, 17).strokePath();
      g.fillStyle(shade(char, 0.85), 1); // stub legs
      g.fillRect(12, 37, 4, 5).fillRect(19, 37, 4, 5).fillRect(26, 37, 4, 5);
      g.fillStyle(base, 1).fillTriangle(29, 16, 31, 10, 33, 16).fillTriangle(34, 16, 36, 10, 38, 16); // singed ears
      g.fillStyle(INT.emberGlow, 1).fillCircle(31, 21, 1.3).fillCircle(35.5, 21, 1.3); // warm eyes
      break;
    }
    case 'Sporemote': {
      // not one creature — a drift of spores that votes; loose blobs barely a body
      g.fillStyle(shade(base, 0.7), 0.9).fillCircle(24, 30, 11); // the current consensus
      g.fillStyle(base, 0.95).fillCircle(21, 27, 8).fillCircle(29, 29, 7).fillCircle(24, 35, 7);
      g.fillStyle(shade(base, 1.2), 0.9).fillCircle(19, 23, 4).fillCircle(28, 22, 3.5).fillCircle(33, 27, 3);
      g.fillStyle(shade(base, 1.1), 0.8); // dissenting floaters
      g.fillCircle(10, 18, 2).fillCircle(38, 15, 1.8).fillCircle(41, 24, 1.5).fillCircle(13, 34, 1.6).fillCircle(36, 38, 1.4);
      g.fillStyle(shade(base, 0.55), 0.7).fillCircle(24, 31, 4); // denser heart
      g.fillStyle(0x1a1712, 1).fillCircle(21, 28, 1.2).fillCircle(27, 28, 1.2); // two voted-in eyes
      break;
    }
    case 'Ashcap': {
      // a squat cap of gray flesh; nothing has ever moved it
      const flesh = 0x8d867a; // gray flesh over the Bloom green
      g.fillStyle(shade(flesh, 0.6), 1).fillEllipse(24, 20, 38, 18); // cap outline
      g.fillStyle(flesh, 1).fillEllipse(24, 19, 34, 15);
      g.fillStyle(shade(flesh, 1.15), 1).fillEllipse(18, 16, 10, 5); // dull sheen
      g.fillStyle(shade(flesh, 0.8), 1).fillCircle(30, 17, 2).fillCircle(15, 21, 1.6).fillCircle(25, 22, 1.4); // pocks
      g.fillStyle(shade(base, 0.75), 1).fillRect(15, 25, 18, 4); // gills, Bloom-green under the gray
      g.fillStyle(shade(base, 0.9), 1).fillRoundedRect(15, 27, 18, 15, 4); // stout stem
      g.fillStyle(shade(base, 0.65), 1).fillRect(15, 38, 18, 4); // rooted base band
      eyes(g, 20, 28, 32);
      break;
    }
    case 'Mycolith': {
      // a standing stone that breathes — menhir first, creature second
      const stone = 0x7c766b;
      g.fillStyle(shade(stone, 0.6), 1).fillRoundedRect(13, 4, 22, 40, 6); // stone outline
      g.fillStyle(stone, 1).fillRoundedRect(15, 6, 18, 36, 5);
      g.fillStyle(shade(stone, 0.8), 1); // weather-cracks
      g.fillRect(19, 10, 1.5, 9).fillRect(26, 20, 1.5, 12).fillRect(22, 34, 8, 1.5);
      g.fillStyle(shade(base, 0.9), 1).fillEllipse(13, 18, 8, 4).fillEllipse(35, 26, 8, 4); // fungal shelves
      g.fillStyle(base, 1).fillEllipse(14, 17, 6, 3).fillEllipse(34, 25, 6, 3);
      g.fillStyle(shade(base, 0.7), 1).fillEllipse(24, 8, 12, 5); // mossed crown
      g.fillStyle(shade(stone, 1.1), 1).fillRect(9, 41, 6, 4).fillRect(33, 41, 7, 4); // stacked offerings
      g.fillStyle(shade(stone, 1.2), 1).fillRect(11, 38, 4, 3).fillRect(35, 38, 4, 3);
      g.fillStyle(0xd8d3c4, 0.9).fillCircle(20, 16, 1.4).fillCircle(28, 16, 1.4); // recessed pale eyes
      break;
    }
    case 'Mycelegion': {
      // the drift agreed on a shape — very large, still deciding at the edges
      g.fillStyle(shade(base, 0.7), 0.95); // the mass: a towering consensus
      g.fillCircle(24, 14, 9).fillCircle(16, 22, 8).fillCircle(32, 22, 8).fillCircle(24, 26, 10);
      g.fillCircle(15, 33, 7).fillCircle(33, 33, 7).fillCircle(24, 38, 8);
      g.fillStyle(base, 0.95);
      g.fillCircle(24, 15, 7).fillCircle(17, 23, 6).fillCircle(31, 23, 6).fillCircle(24, 28, 8).fillCircle(24, 38, 6);
      g.fillStyle(shade(base, 1.2), 0.85); // crest still boiling
      g.fillCircle(19, 9, 3).fillCircle(27, 8, 3.4).fillCircle(23, 5, 2.6);
      g.fillStyle(shade(base, 1.1), 0.7); // undecided edges
      g.fillCircle(7, 20, 2.2).fillCircle(41, 19, 2).fillCircle(5, 31, 1.8).fillCircle(43, 32, 1.8).fillCircle(38, 42, 1.6);
      g.fillStyle(shade(base, 0.5), 0.8).fillCircle(24, 27, 5); // the deciding heart
      g.fillStyle(0xd8d3c4, 1).fillCircle(21, 15, 1.6).fillCircle(27, 15, 1.6); // high pale eyes
      break;
    }
    case 'Snarebriar': {
      // a briar-tangle that learned a hare's shape — thorns kept, innocence not
      const briar = shade(base, 0.62);
      g.fillStyle(briar, 1).fillEllipse(22, 31, 24, 17); // haunched body outline
      g.fillStyle(shade(base, 0.85), 1).fillEllipse(22, 31, 20, 13);
      g.fillStyle(briar, 1).fillCircle(33, 20, 6); // head
      g.fillStyle(shade(base, 0.85), 1).fillCircle(33, 20, 4.5);
      g.fillStyle(briar, 1); // long briar ears, ragged
      g.fillTriangle(30, 15, 27, 1, 33, 13).fillTriangle(35, 15, 38, 2, 40, 14);
      g.fillStyle(shade(base, 1.15), 1).fillTriangle(31, 12, 29.5, 4, 32.5, 11).fillTriangle(36.5, 12, 38, 5, 39, 12);
      g.fillStyle(briar, 1); // thorn spikes along the back
      g.fillTriangle(13, 25, 11, 19, 17, 23).fillTriangle(19, 22, 18, 16, 24, 21).fillTriangle(26, 21, 27, 15, 31, 20);
      g.fillStyle(shade(base, 0.7), 1).fillRect(14, 37, 5, 6).fillRect(26, 37, 5, 6); // set haunches
      g.lineStyle(1, shade(base, 1.25), 1); // winding briar strands
      g.beginPath();
      g.moveTo(13, 30).lineTo(20, 27).lineTo(27, 31).moveTo(15, 34).lineTo(23, 33).strokePath();
      g.fillStyle(0xd8d3c4, 1).fillCircle(31.5, 19, 1.1).fillCircle(35, 19, 1.1); // thin pale eyes
      break;
    }
    case 'Fenlight': {
      // a small cold lantern-glow walking the ditch-water; mostly light, barely body
      const glow = 0xb9c9cf;
      g.fillStyle(shade(base, 0.8), 0.35).fillEllipse(24, 40, 26, 5); // still black water
      g.fillStyle(shade(base, 1.1), 0.5).fillEllipse(24, 40, 16, 3);
      g.fillStyle(base, 0.4).fillTriangle(24, 12, 15, 40, 33, 40); // the veil of it
      g.fillStyle(shade(base, 1.2), 0.5).fillTriangle(24, 14, 18, 38, 30, 38);
      g.fillStyle(glow, 0.25).fillCircle(24, 15, 10); // cold halo
      g.fillStyle(glow, 0.5).fillCircle(24, 15, 7);
      g.fillStyle(glow, 1).fillCircle(24, 15, 4.5); // the light itself
      g.fillStyle(0xe9f0ef, 1).fillCircle(24, 14, 2);
      g.fillStyle(glow, 0.6).fillCircle(19, 27, 1.4).fillCircle(28, 31, 1.2); // stray motes
      g.fillStyle(0x33424d, 1).fillCircle(22.5, 15, 0.9).fillCircle(25.5, 15, 0.9); // two dark pips in the light
      break;
    }
    case 'Borck': {
      // a skeleton that stopped being only bone — stone grew into the gaps
      const bone = 0xcfc7b8;
      const stone = 0x6f6a61;
      g.fillStyle(shade(stone, 0.6), 1).fillRoundedRect(10, 14, 28, 28, 4); // squat block outline
      g.fillStyle(stone, 1).fillRoundedRect(12, 16, 24, 24, 3);
      g.fillStyle(bone, 1); // bone lapped through the stone
      g.fillRect(15, 21, 18, 2.5).fillRect(15, 27, 18, 2.5).fillRect(23, 16, 2, 24); // ribs + spine
      g.fillStyle(shade(stone, 1.2), 1).fillRect(12, 16, 7, 6).fillRect(29, 16, 7, 6); // stone shoulders
      g.fillStyle(shade(bone, 0.75), 1).fillCircle(24, 11, 6.5); // low-set skull
      g.fillStyle(bone, 1).fillCircle(24, 10, 5.5);
      g.fillStyle(shade(stone, 0.9), 1).fillRect(20, 4, 8, 3); // stone grown over the crown
      g.fillStyle(0x14110e, 1).fillCircle(21.5, 10, 1.8).fillCircle(26.5, 10, 1.8); // sockets
      g.fillStyle(0xd8d3c4, 1).fillCircle(21.5, 10, 0.7).fillCircle(26.5, 10, 0.7); // patient glints
      g.fillStyle(shade(stone, 0.8), 1).fillRect(13, 40, 9, 5).fillRect(26, 40, 9, 5); // quarried feet
      break;
    }
    case 'Murkmaw': {
      // a patch of dark cast by nothing — dread, not gore; the mouth is a suggestion
      const dark = 0x17141d;
      g.fillStyle(shade(base, 0.5), 0.35); // ragged rim where the dark frays
      g.fillEllipse(24, 27, 40, 26).fillEllipse(17, 20, 18, 12).fillEllipse(33, 22, 16, 10);
      g.fillStyle(0x201b28, 0.85).fillEllipse(24, 27, 34, 21);
      g.fillStyle(dark, 1).fillEllipse(24, 28, 28, 17); // the body of the dark
      g.fillStyle(shade(base, 0.85), 0.22).fillEllipse(24, 19, 22, 6); // faint umbral sheen, upper edge
      g.fillStyle(0x060409, 1).fillEllipse(24, 31, 18, 5); // deeper-than-black: the maw
      g.fillStyle(0x2a2433, 0.8); // the barest suggestion of teeth — spacing, not points
      g.fillRect(16, 29.5, 2, 2).fillRect(21, 30.5, 2, 2).fillRect(27, 30.5, 2, 2).fillRect(31, 29.5, 2, 2);
      g.fillStyle(0x9b93a8, 0.9).fillCircle(19, 23, 1.1).fillCircle(28, 22, 1.1); // pale glints, wrong distance apart
      g.fillStyle(dark, 0.6); // it pools past its own edge
      g.fillEllipse(9, 36, 10, 4).fillEllipse(40, 34, 9, 4);
      break;
    }
    // ---- PHASE10 — the wolf line (§3; grounded palette, dread not gore) ----------
    case 'Staticur': {
      // quadruped dire-wolf silhouette; cracked visor slit leaking a thin light; wire
      // hackles sparking; ONE stance-twitch in the pose (the offset foreleg — a frame
      // offset, not animation work). The tech is parasitic and broken, never sleek.
      const fur = shade(base, 0.85);
      const dark = shade(base, 0.55);
      const glow = 0xcdd3e8; // the thin wrong light behind the visor
      // wire hackles along the neck and back, drawn behind the body
      g.lineStyle(1, shade(base, 1.45), 1);
      g.beginPath();
      g.moveTo(12, 22).lineTo(14, 16).moveTo(17, 21).lineTo(20, 15).moveTo(23, 20).lineTo(25, 14).moveTo(28, 19).lineTo(31, 14);
      g.strokePath();
      g.fillStyle(0xdfe4f2, 1).fillRect(19, 14, 1, 2).fillRect(30, 13, 1, 2); // live sparks
      // body: low, long, lean
      g.fillStyle(dark, 1).fillRoundedRect(8, 21, 26, 13, 5);
      g.fillStyle(fur, 1).fillRoundedRect(9, 22, 24, 11, 5);
      // the graft: a dead plate bolted into the flank
      g.fillStyle(shade(base, 0.66), 1).fillRect(13, 24, 9, 5);
      g.lineStyle(1, shade(base, 1.2), 1).strokeRect(13, 24, 9, 5);
      // tail: a stripped cable, frayed end still live
      g.lineStyle(2, dark, 1);
      g.beginPath();
      g.moveTo(9, 24).lineTo(4, 19).strokePath();
      g.fillStyle(0xdfe4f2, 1).fillRect(3, 17, 2, 2);
      // legs — the stance-twitch: the outer foreleg sits a pixel off true
      g.fillStyle(dark, 1);
      g.fillRect(11, 33, 3, 8).fillRect(16, 34, 3, 7); // hind pair
      g.fillRect(26, 34, 3, 7).fillRect(31, 33, 3, 8); // fore pair, one lifted wrong
      // head: forward and low, wolfish; torn ears
      g.fillStyle(dark, 1).fillRoundedRect(30, 13, 14, 11, 3);
      g.fillStyle(fur, 1).fillRoundedRect(31, 14, 12, 9, 3);
      g.fillStyle(fur, 1).fillTriangle(31, 14, 33, 7, 36, 14).fillTriangle(38, 14, 41, 8, 43, 14);
      g.fillStyle(dark, 1).fillRect(43, 18, 3, 4); // muzzle end
      // the cracked visor: a dark band, a slit of light, one crack leaking
      g.fillStyle(0x1a1a20, 1).fillRect(31, 16, 12, 4);
      g.fillStyle(glow, 0.9).fillRect(32, 17, 10, 1);
      g.lineStyle(1, glow, 0.8);
      g.beginPath();
      g.moveTo(37, 16).lineTo(35, 20).strokePath();
      break;
    }
    case 'Voltwraith': {
      // PUPPETED UPRIGHT (ledger #7): the graft drives now. Half-bipedal, marionette-
      // hunched, forelimbs too long, standing WRONG — held up by the tech, not the
      // spine. Hairline strings from above; visor crack wider, brighter.
      const fur = shade(base, 0.85);
      const dark = shade(base, 0.55);
      const glow = 0xdfe4f2;
      // the strings — barely there, but there
      g.lineStyle(1, glow, 0.35);
      g.beginPath();
      g.moveTo(15, 0).lineTo(16, 9).moveTo(33, 0).lineTo(32, 8).strokePath();
      // the hunch: shoulders heaved higher than the skull will ever hang again,
      // one shoulder ridden up wrong — nothing about the posture is level
      g.fillStyle(dark, 1).fillRoundedRect(12, 7, 25, 25, 8);
      g.fillStyle(dark, 1).fillRoundedRect(12, 5, 11, 10, 5); // the higher shoulder
      g.fillStyle(fur, 1).fillRoundedRect(13, 8, 23, 23, 7);
      g.fillStyle(fur, 1).fillRoundedRect(13, 6, 9, 8, 4);
      // the graft: plating ridged over the hunch, its seam humming
      g.fillStyle(shade(base, 0.62), 1).fillRect(16, 7, 17, 5);
      g.fillStyle(glow, 0.55).fillRect(17, 9, 15, 1);
      // wire hackles torn upward off the hunch
      g.lineStyle(1, shade(base, 1.45), 1);
      g.beginPath();
      g.moveTo(16, 8).lineTo(13, 2).moveTo(22, 7).lineTo(21, 1).moveTo(29, 7).lineTo(31, 1).strokePath();
      g.fillStyle(glow, 1).fillRect(12, 1, 1, 2).fillRect(30, 0, 1, 2);
      // forelimbs TOO LONG — knuckled to the ground either side of it
      g.fillStyle(dark, 1).fillRect(8, 13, 4, 27).fillRect(37, 13, 4, 27);
      g.fillStyle(shade(base, 0.7), 1).fillRect(6, 38, 7, 4).fillRect(36, 38, 7, 4);
      // hind legs: folded wrong beneath the mass
      g.fillStyle(dark, 1).fillRect(16, 31, 4, 7).fillRect(29, 31, 4, 7);
      g.fillStyle(shade(base, 0.7), 1).fillRect(15, 38, 6, 3).fillRect(28, 38, 6, 3);
      // the head hangs low off the hunch, wolf-skull down-tilted
      g.fillStyle(dark, 1).fillRoundedRect(18, 16, 13, 12, 3);
      g.fillStyle(fur, 1).fillRoundedRect(19, 17, 11, 10, 3);
      g.fillStyle(fur, 1).fillTriangle(19, 17, 20, 12, 24, 17).fillTriangle(26, 17, 29, 12, 30, 17); // folded ears
      // the visor: an eye-band, its slit brighter and wider-cracked than Staticur's
      g.fillStyle(0x1a1a20, 1).fillRect(19, 19, 11, 4);
      g.fillStyle(glow, 1).fillRect(20, 20, 9, 1); // the slit, hard and level
      g.lineStyle(1, glow, 0.85);
      g.beginPath();
      g.moveTo(26, 19).lineTo(24, 23).strokePath(); // the one wide crack, leaking down
      // the muzzle beneath, pointed at the floor
      g.fillStyle(shade(base, 0.45), 1).fillRect(22, 24, 5, 4);
      g.fillStyle(0x1a1a20, 1).fillRect(23, 26, 3, 2);
      break;
    }
    default: {
      g.fillStyle(outline, 1).fillCircle(24, 28, 15);
      g.fillStyle(base, 1).fillCircle(24, 28, 13);
      eyes(g, 20, 28, 26);
    }
  }
}

export function generateAllTextures(scene) {
  generateTiles(scene);
  generateCores(scene);
  generatePlayer(scene);
  generateNpc(scene);
  generateCreatures(scene);
  generateBoss(scene);
}
