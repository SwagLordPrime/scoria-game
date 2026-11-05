import Phaser from 'phaser';
import { generateAllTextures } from '../render/textures.js';

// Generates every placeholder texture once, then hands off to the Title screen.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    generateAllTextures(this);
    this.scene.start('Title');
  }
}
