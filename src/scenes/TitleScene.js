import Phaser from 'phaser';
import { HEX, INT } from '../data/palette.js';
import { hasSave, loadGame, newGame } from '../systems/save.js';

// Title / start menu: Continue (if a save exists) or New Game. Keyboard + mouse.
export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(HEX.bg);

    // faint vignette bands for a grounded, low-light title
    this.add.rectangle(width / 2, height / 2, width, height, INT.bg).setDepth(0);
    this.add.rectangle(width / 2, 150, width, 4, INT.edge).setAlpha(0.6);
    this.add.rectangle(width / 2, height - 120, width, 4, INT.edge).setAlpha(0.6);

    // PHASE9: the game becomes SCORIA — world name, then the phrase that translates it.
    this.add
      .text(width / 2, 116, 'SCORIA', {
        fontFamily: 'Consolas, monospace',
        fontSize: '54px',
        color: HEX.ink,
      })
      .setOrigin(0.5)
      .setLetterSpacing?.(8);

    this.add
      .text(width / 2, 166, 'What the War Left', {
        fontFamily: 'Consolas, monospace',
        fontSize: '18px',
        color: HEX.dim,
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    this.state = 'main';
    this.index = 0;
    this.optionTexts = [];
    this.buildMenu();

    this.hintText = this.add
      .text(width / 2, height - 60, '↑/↓ select   ·   Enter confirm', {
        fontFamily: 'Consolas, monospace',
        fontSize: '14px',
        color: HEX.dim,
      })
      .setOrigin(0.5);

    this.keyUp = this.input.keyboard.addKey('UP');
    this.keyDown = this.input.keyboard.addKey('DOWN');
    this.keyW = this.input.keyboard.addKey('W');
    this.keyS = this.input.keyboard.addKey('S');
    this.keyEnter = this.input.keyboard.addKey('ENTER');
    this.keySpace = this.input.keyboard.addKey('SPACE');
    this.keyBack = this.input.keyboard.addKey('ESC');
  }

  buildMenu() {
    for (const t of this.optionTexts) t.destroy();
    this.optionTexts = [];

    if (this.state === 'main') {
      this.options = [];
      if (hasSave()) this.options.push({ label: 'Continue', act: () => this.continueGame() });
      this.options.push({ label: 'New Game', act: () => this.startNew() });
    } else if (this.state === 'confirmNew') {
      this.options = [
        { label: 'No — keep my save', act: () => this.toMain() },
        { label: 'Yes — erase and start over', act: () => this.doNew(), danger: true },
      ];
    }
    this.index = 0;

    const { width } = this.scale;
    const baseY = 300;
    if (this.state === 'confirmNew') {
      this.add
        .text(width / 2, 250, 'A saved world exists. Starting new will erase it.', {
          fontFamily: 'Consolas, monospace',
          fontSize: '16px',
          color: HEX.bad,
        })
        .setOrigin(0.5)
        .setData('menu', true);
    }
    this.options.forEach((opt, i) => {
      const t = this.add
        .text(width / 2, baseY + i * 44, opt.label, {
          fontFamily: 'Consolas, monospace',
          fontSize: '22px',
          color: HEX.ink,
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => {
        this.index = i;
        this.renderSelection();
      });
      t.on('pointerdown', () => {
        this.index = i;
        this.confirm();
      });
      this.optionTexts.push(t);
    });
    this.renderSelection();
  }

  toMain() {
    this.children.list.filter((c) => c.getData && c.getData('menu')).forEach((c) => c.destroy());
    this.state = 'main';
    this.buildMenu();
  }

  renderSelection() {
    this.optionTexts.forEach((t, i) => {
      const sel = i === this.index;
      t.setColor(sel ? HEX.accent : this.options[i].danger ? HEX.bad : HEX.dim);
      t.setText((sel ? '▸ ' : '  ') + this.options[i].label);
    });
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keyUp) || Phaser.Input.Keyboard.JustDown(this.keyW)) {
      this.index = (this.index - 1 + this.options.length) % this.options.length;
      this.renderSelection();
    } else if (
      Phaser.Input.Keyboard.JustDown(this.keyDown) ||
      Phaser.Input.Keyboard.JustDown(this.keyS)
    ) {
      this.index = (this.index + 1) % this.options.length;
      this.renderSelection();
    } else if (
      Phaser.Input.Keyboard.JustDown(this.keyEnter) ||
      Phaser.Input.Keyboard.JustDown(this.keySpace)
    ) {
      this.confirm();
    } else if (Phaser.Input.Keyboard.JustDown(this.keyBack) && this.state === 'confirmNew') {
      this.toMain();
    }
  }

  confirm() {
    this.options[this.index].act();
  }

  continueGame() {
    loadGame();
    this.scene.start('World');
  }

  startNew() {
    if (hasSave()) {
      this.state = 'confirmNew';
      this.buildMenu();
    } else {
      this.doNew();
    }
  }

  doNew() {
    newGame();
    this.scene.start('World');
  }
}
