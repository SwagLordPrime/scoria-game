import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import WorldScene from './scenes/WorldScene.js';
import BattleScene from './scenes/BattleScene.js';
import { HEX } from './data/palette.js';

// Fixed 800x600 stage, letterbox-scaled to fit. pixelArt keeps the generated
// textures crisp. Scenes: Boot (make textures) -> Title -> World <-> Battle.
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 800,
  height: 600,
  backgroundColor: HEX.bg,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, WorldScene, BattleScene],
};

const game = new Phaser.Game(config);

// Dev-only handles for debugging / automated verification in the browser console.
if (import.meta.env.DEV) {
  window.__game = game;
  Promise.all([
    import('./systems/state.js'),
    import('./systems/combat.js'),
    import('./systems/save.js'),
    import('./data/creatures.js'),
    import('./systems/progression.js'),
    import('./data/bosses.js'),
    import('./systems/status.js'),
    import('./data/moves.js'),
    import('./data/types.js'),
    import('./data/roles.js'),
    import('./data/statuses.js'),
    import('./data/maps/index.js'),
  ]).then(([state, combat, save, creatures, progression, bosses, status, moves, types, roles, statuses, maps]) => {
    window.__dev = { state, combat, save, creatures, progression, bosses, status, moves, types, roles, statuses, maps };
  });
}
