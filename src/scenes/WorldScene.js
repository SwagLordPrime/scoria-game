import Phaser from 'phaser';
import { getMap, getSpawn } from '../data/maps/index.js';
import { TILE_SIZE } from '../render/textures.js';
import { TILE, tileAt, isWalkable } from '../data/tiles.js';
import { GameState, markSeen } from '../systems/state.js';
import { healParty } from '../systems/party.js';
import { rollEncounter, SPECIES, speciesSlots } from '../data/creatures.js';
import { makeBoss } from '../data/bosses.js';
import { CORE_DETAILS, RIVALS } from '../data/starterCores.js';
import { bindStarter } from '../systems/starterSelect.js';
import {
  corelocksOn,
  duelAvailable,
  markDuelMet,
  ambushOn,
  buildCorelockTeam,
} from '../systems/corelocks.js';
import { saveGame, newGame } from '../systems/save.js';
import { levelCapFromFlags, xpToNext } from '../systems/progression.js';
import { ITEMS, LOCKER_STOCK, BASELINE_CORE } from '../data/items.js';
import {
  heldItems, usableItems, itemCount, addItem, removeItem, topUpHearthCores,
} from '../systems/inventory.js';
import { gilt, addGilt, spendGilt } from '../systems/economy.js';
import { hearthRest, temperamentWord, feedTreat } from '../systems/temper.js';
import { healingReceivedMod, clearStatuses } from '../systems/status.js';
import {
  boardContracts, contractState, progressOf, canAccept, acceptContract, canTurnIn,
  turnInContract, syncContracts, slateLines, tickTileStep, carried, ACTIVE_CAP,
} from '../systems/contracts.js';
import { pickBark, recordBark } from '../systems/barks.js';
import { HEX, INT } from '../data/palette.js';

const T = TILE_SIZE;
const MOVE_MS = 130; // tile-locked step duration (PHASE3 §3)
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const NPC_TINTS = [0xb9a27a, 0x8f9fa8, 0xa79ab0, 0x9aa47c];

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super('World');
  }

  create() {
    this.moving = false;
    this.transitioning = false;
    this.dialogueOpen = false;
    this.menuOpen = false;
    this.pendingWipe = false;

    this.tileGroup = this.add.group();
    this.npcGroup = this.add.group();
    this.objectGroup = this.add.group();
    this.player = null;

    // input
    this.keys = this.input.keyboard.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
      w: 'W', a: 'A', s: 'S', d: 'D',
      space: 'SPACE', enter: 'ENTER', esc: 'ESC', m: 'M',
    });

    this.buildHud();
    this.loadMap(GameState.position.mapId);

    // returning from a battle (this scene was paused): reset transient state
    this.events.on('resume', this.onResume, this);
    this.events.once('shutdown', () => this.events.off('resume', this.onResume, this));

    // PHASE13 §2: P12 recorded its purses as flags because gilt did not exist yet. The
    // v5 load settles that debt, once; this is the one quiet line it gets. No fanfare —
    // the Ledger pays what it owes and so, eventually, does everyone else.
    const retro = GameState.pendingRetroPurses;
    if (retro) {
      GameState.pendingRetroPurses = null;
      this.openDialogue([
        `Word travels. Purses you were owed have caught up with you — ${retro.paid} gilt, ` +
          `settled against ${retro.count} name${retro.count === 1 ? '' : 's'}.`,
      ]);
    }
  }

  // ---- HUD ---------------------------------------------------------------
  buildHud() {
    this.mapNameText = this.add
      .text(12, 10, '', { fontFamily: 'Consolas, monospace', fontSize: '16px', color: HEX.ink })
      .setScrollFactor(0)
      .setDepth(90);
    this.leadText = this.add
      .text(12, 32, '', { fontFamily: 'Consolas, monospace', fontSize: '13px', color: HEX.dim })
      .setScrollFactor(0)
      .setDepth(90);
    this.hint = this.add
      .text(12, this.scale.height - 24, 'Arrows/WASD move · Space interact · Esc menu', {
        fontFamily: 'Consolas, monospace',
        fontSize: '12px',
        color: HEX.dim,
      })
      .setScrollFactor(0)
      .setDepth(90);
  }

  refreshHud() {
    if (this.map) this.mapNameText.setText(this.map.name);
    const lead = GameState.party[0];
    if (lead) {
      const alive = GameState.party.filter((c) => c.hp > 0).length;
      this.leadText.setText(
        `${lead.name}  Lv${lead.level}  ${lead.hp}/${lead.maxHp} HP   ·   team ${alive}/${GameState.party.length}` +
          `   ·   ${gilt()} gilt` // PHASE13 §2
      );
    } else {
      // PHASE10: pre-pick the party is legitimately empty — never show a stale lead
      // (an in-game New Game reset used to leave the old starter's line up).
      this.leadText.setText('');
    }
  }

  // ---- Map loading -------------------------------------------------------
  loadMap(mapId) {
    this.tileGroup.clear(true, true);
    this.npcGroup.clear(true, true);
    this.objectGroup.clear(true, true);

    this.map = getMap(mapId);
    this.reconcileGate(); // rubble ('X') vs opened threshold ('G') per the boss flag
    const wpx = this.map.width * T;
    const hpx = this.map.height * T;

    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const def = TILE[this.map.grid[y][x]];
        const img = this.add.image(x * T + T / 2, y * T + T / 2, def.key).setDepth(0);
        this.tileGroup.add(img);
      }
    }

    // objects (signposts drawn as simple wood posts — no texture needed).
    // PHASE9: 'board' is the tavern's contract board — a wider plank with notices.
    // PHASE10: 'core' objects are the three staked cores — rendered (and later,
    // interactable) only while the choice is still open; once flags.starterChoice is
    // set they've left the table in three different hands.
    (this.map.objects || []).forEach((o) => {
      if (o.type === 'core') {
        if (!GameState.flags.starterChoice) {
          const spr = this.add
            .sprite(o.x * T + T / 2, o.y * T + T / 2 - 5, CORE_DETAILS[o.species].texture)
            .setDepth(5);
          this.objectGroup.add(spr);
        }
      } else if (o.type === 'sign') {
        const post = this.add
          .rectangle(o.x * T + T / 2, o.y * T + T / 2, 12, 16, INT.wood)
          .setStrokeStyle(1, INT.edge)
          .setDepth(4);
        this.objectGroup.add(post);
      } else if (o.type === 'board') {
        const plank = this.add
          .rectangle(o.x * T + T / 2, o.y * T + T / 2, 26, 20, INT.wood)
          .setStrokeStyle(1, INT.edge)
          .setDepth(4);
        const notice = this.add
          .rectangle(o.x * T + T / 2 - 4, o.y * T + T / 2 - 1, 9, 12, 0xcfc7b8)
          .setDepth(5);
        this.objectGroup.add(plank);
        this.objectGroup.add(notice);
      }
    });

    // npcs
    (this.map.npcs || []).forEach((n, i) => {
      const s = this.add
        .sprite(n.x * T + T / 2, n.y * T + T / 2, 'npc')
        .setDepth(6)
        .setTint(n.tint ?? NPC_TINTS[i % NPC_TINTS.length]);
      this.npcGroup.add(s);
    });

    // PHASE12 §3: corelocks stand in the world like anyone else — same sprite, their
    // own tint, blocking their tile, answering to Space. Presence is pure data: the
    // rivals need the table resolved, and the collector is simply NOT THERE until the
    // Barrow-King falls (clearGate re-runs loadMap, so he arrives with the threshold).
    this.corelocks = corelocksOn(this.map.id, GameState.flags);
    this.corelocks.forEach((c) => {
      const s = this.add
        .sprite(c.x * T + T / 2, c.y * T + T / 2, 'npc')
        .setDepth(6)
        .setTint(c.tint ?? 0x9a8f7c);
      this.npcGroup.add(s);
    });

    // player
    this.gx = GameState.position.x;
    this.gy = GameState.position.y;
    this.facing = GameState.facing || 'down';
    if (!this.player) this.player = this.add.sprite(0, 0, `player-${this.facing}`).setDepth(10);
    this.player
      .setTexture(`player-${this.facing}`)
      .setPosition(this.gx * T + T / 2, this.gy * T + T / 2);

    this.barkGiven = false; // PHASE14 §4: a fresh visit, a fresh bark
    this.cameras.main.setBounds(0, 0, wpx, hpx);
    this.cameras.main.setBackgroundColor(HEX.bg);
    this.cameras.main.startFollow(this.player, true, 0.18, 0.18);
    // center small maps
    this.cameras.main.setScroll(
      Phaser.Math.Clamp(this.player.x - this.scale.width / 2, 0, Math.max(0, wpx - this.scale.width)),
      Phaser.Math.Clamp(this.player.y - this.scale.height / 2, 0, Math.max(0, hpx - this.scale.height))
    );

    this.refreshHud();
  }

  // Reconcile a map's gate tiles with its boss flag: rubble 'X' while undefeated,
  // opened threshold 'G' once cleared. Idempotent, so it's correct after reload and
  // resets on New Game. Mutates only this map's own gate coordinates.
  reconcileGate() {
    const gate = this.map.gate;
    if (!gate) return;
    const cleared = !!GameState.flags[gate.flag];
    for (const [gx, gy] of gate.seamTiles) {
      this.map.grid[gy][gx] = cleared ? 'G' : 'X';
    }
  }

  // ---- Update loop -------------------------------------------------------
  update() {
    this.refreshHud();
    if (this.transitioning) return;

    if (this.dialogueOpen) {
      if (this.justInteract()) this.advanceDialogue();
      return;
    }
    if (this.menuOpen) {
      this.updateMenu();
      return;
    }
    if (this.justMenu()) {
      this.openMenu();
      return;
    }
    if (this.justInteract()) {
      this.interact();
      return;
    }
    if (this.moving) return;

    const k = this.keys;
    let dir = null;
    if (k.left.isDown || k.a.isDown) dir = 'left';
    else if (k.right.isDown || k.d.isDown) dir = 'right';
    else if (k.up.isDown || k.w.isDown) dir = 'up';
    else if (k.down.isDown || k.s.isDown) dir = 'down';
    if (dir) this.tryMove(dir);
  }

  justInteract() {
    return (
      Phaser.Input.Keyboard.JustDown(this.keys.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.enter)
    );
  }
  justMenu() {
    return (
      Phaser.Input.Keyboard.JustDown(this.keys.esc) || Phaser.Input.Keyboard.JustDown(this.keys.m)
    );
  }

  // ---- Movement ----------------------------------------------------------
  setFacing(dir) {
    this.facing = dir;
    GameState.facing = dir;
    this.player.setTexture(`player-${dir}`);
  }

  npcAt(x, y) {
    return (this.map.npcs || []).find((n) => n.x === x && n.y === y);
  }

  // PHASE12: a corelock occupies a tile exactly like an NPC does.
  corelockAt(x, y) {
    return (this.corelocks || []).find((c) => c.x === x && c.y === y) || null;
  }

  tryMove(dir) {
    this.setFacing(dir);
    const [dx, dy] = DIRV[dir];
    const nx = this.gx + dx;
    const ny = this.gy + dy;
    if (this.npcAt(nx, ny) || this.corelockAt(nx, ny) || !isWalkable(this.map, nx, ny)) return; // bumped
    this.moving = true;
    this.tweens.add({
      targets: this.player,
      x: nx * T + T / 2,
      y: ny * T + T / 2,
      duration: MOVE_MS,
      onComplete: () => {
        this.gx = nx;
        this.gy = ny;
        GameState.position = { mapId: this.map.id, x: nx, y: ny };
        this.moving = false;
        this.onEnterTile();
      },
    });
  }

  onEnterTile() {
    const warp = (this.map.warps || []).find((w) => w.x === this.gx && w.y === this.gy);
    if (warp) {
      this.doWarp(warp);
      return;
    }
    // PHASE12 §3: the eager rival jumps you on your first exit after the table. Fires
    // ONCE ever (flags.duelsMet) — after that he waits at his bend like everyone else,
    // so losing to him never traps a spent party in a re-challenge loop.
    const ambush = ambushOn(this.map.id, GameState.flags);
    if (ambush) {
      this.approachCorelock(ambush);
      return;
    }
    // PHASE14 §2: SCOUT ticks off the step that already happened. Fires once per job —
    // walking the region again does nothing.
    if (tickTileStep(this.map.id, this.gx, this.gy)) {
      saveGame();
      this.toast('You have seen what the notice asked about.');
    }
    const t = tileAt(this.map, this.gx, this.gy);
    if (t?.heal) {
      this.useHeal();
      return;
    }
    // PHASE9: a threshold tile that carries no warp is a gateway to nowhere yet; the
    // Hollow's gate tiles DO warp (into the Deep Hollow), so this is a safety line.
    if (t?.threshold) {
      this.openDialogue([
        'You stand in the opened gateway. Cold air breathes up from the dark below.',
      ]);
      return;
    }
    if (t?.tall && this.map.encounters) {
      if (Math.random() < (this.map.encounters.rate ?? 0.18)) this.startEncounter();
    }
  }

  // ---- Warps -------------------------------------------------------------
  doWarp(warp) {
    // PHASE10 §2.2: a map may soft-block its exits behind a flag (the tavern door,
    // until the pick). Not a wall — a patron line, and the warp simply doesn't fire.
    const block = this.map.doorBlock;
    if (block && !GameState.flags[block.flag]) {
      this.openDialogue(block.lines);
      return;
    }
    this.transitioning = true;
    const cam = this.cameras.main;
    cam.fadeOut(200, 8, 10, 6);
    cam.once('camerafadeoutcomplete', () => {
      const sp = getSpawn(warp.target, warp.spawn);
      GameState.position = { mapId: warp.target, x: sp.x, y: sp.y };
      GameState.facing = sp.facing || 'down';
      this.loadMap(warp.target);
      saveGame(); // autosave on every map transition (§6)
      cam.fadeIn(200, 8, 10, 6);
      this.transitioning = false;
    });
  }

  // ---- Interaction -------------------------------------------------------
  // PHASE10: an NPC's `lines` may be a function of the flags (the tavern's room
  // changes register once the pick is made). Static arrays pass through untouched.
  npcLines(npc) {
    return typeof npc.lines === 'function' ? npc.lines(GameState.flags) : npc.lines;
  }

  interact() {
    const [dx, dy] = DIRV[this.facing];
    const fx = this.gx + dx;
    const fy = this.gy + dy;

    const npc = this.npcAt(fx, fy);
    if (npc) {
      // PHASE13 §4: a shopkeeper's lines run first, then the locker opens as a second
      // branch — you always get the room's voice before you get a menu.
      // PHASE14 §4: and the tavern may have heard something about you.
      const lines = [...this.npcLines(npc)];
      const bark = this.maybeBark();
      if (bark) lines.push(...bark.lines);
      this.openDialogue(lines, npc.shop ? () => this.openLocker() : null);
      return;
    }
    const lock = this.corelockAt(fx, fy);
    if (lock) {
      this.approachCorelock(lock);
      return;
    }
    // PHASE10 §2.3: a staked core, while the choice is open — the inspect card.
    const core = (this.map.objects || []).find(
      (o) => o.type === 'core' && o.x === fx && o.y === fy
    );
    if (core && !GameState.flags.starterChoice) {
      this.openCoreInspect(core.species);
      return;
    }
    // PHASE14 §3: the board stopped being scenery. Its P9 plank text still reads first —
    // it is the room's voice — and then the notices are actually takeable.
    const board = (this.map.objects || []).find((o) => o.type === 'board' && o.x === fx && o.y === fy);
    if (board) {
      this.openDialogue(board.lines, () => this.openBoard());
      return;
    }
    const sign = (this.map.objects || []).find((o) => o.type === 'sign' && o.x === fx && o.y === fy);
    if (sign) {
      this.openDialogue(sign.lines);
      return;
    }
    const front = tileAt(this.map, fx, fy);
    if (front?.seam) {
      this.approachGate();
      return;
    }
    const here = tileAt(this.map, this.gx, this.gy);
    if (front?.threshold || here?.threshold) {
      this.openDialogue([
        'The gateway stands open. Cold air breathes up from the Deep Hollow below.',
      ]);
      return;
    }
    if (front?.heal || here?.heal) this.useHeal();
  }

  // ---- The gate boss (PHASE4) --------------------------------------------
  // Facing the rubble seam: telegraph the fight ("Danger ahead"), then let the player
  // choose to commit — so they can back off and heal first. No permadeath; fully retryable.
  approachGate() {
    const gate = this.map.gate;
    if (!gate) return;
    if (GameState.flags[gate.flag]) {
      // already cleared (shouldn't reach — tile is 'G' not seam — but stay safe)
      this.openDialogue(['The way already lies open.']);
      return;
    }
    GameState.flags.reachedHollowSeam = true;
    this.bossGate = gate;
    this.openDialogue(
      [
        'The rubble shifts. Something vast stirs behind it — patient, ancient, and hungry.',
        'DANGER AHEAD. This is a real fight. Steady your team and heal before you commit.',
      ],
      () => this.openBossConfirm()
    );
  }

  openBossConfirm() {
    this.menuOpen = true;
    this.menuState = 'bossConfirm';
    this.menuObjs = [];
    this.buildMenu();
  }

  commitBossFight() {
    this.closeMenu();
    this.startBossBattle();
  }

  startBossBattle() {
    const gate = this.bossGate;
    if (!gate) return;
    const enemy = makeBoss(gate.boss);
    this.cameras.main.flash(220, 30, 8, 8);
    this.time.delayedCall(180, () => {
      this.scene.launch('Battle', { enemy, boss: true, onEnd: (res) => this.onBattleEnd(res) });
      this.scene.pause();
    });
  }

  // Victory: set the flag, RAISE the level cap (milestone-gated, PHASE5 §2.3), open the
  // threshold, autosave. Runs on resume after the win.
  clearGate() {
    const gate = this.map.gate;
    if (gate) GameState.flags[gate.flag] = true;
    const prevCap = GameState.levelCap;
    GameState.levelCap = levelCapFromFlags(GameState.flags); // 10 -> 15 on the Barrow-King
    saveGame(); // autosave the cleared gate + raised cap (both persist across reload)
    this.loadMap(this.map.id); // re-render; reconcileGate turns the rubble into a threshold
    const lines = [
      'The Barrow-King folds down into a cairn of still, silent bone.',
      'The rubble slumps away. A cold gateway opens — and below it, stairs the miners cut, going down past the last lantern.',
    ];
    if (GameState.levelCap > prevCap) {
      lines.push(
        `Something gives way in you and your team. The way ahead demands more — your ` +
          `numens can now grow to Lv${GameState.levelCap}.`
      );
    }
    lines.push('The Hollow is yours. Whatever the miners fled is still down there.');
    this.openDialogue(lines);
  }

  // ---- Corelock duels (PHASE12 §2/§3) --------------------------------------
  // Facing a corelock: a beaten one drops to their `after` line and stands down (V1
  // has no rematches — ledger's call, `rematch: false`). Anyone still owed a fight
  // reads their challenge, then the player SIGNS it — the confirm is the fiction: you
  // agreed, which is why there is no running once it starts.
  approachCorelock(def) {
    if (!duelAvailable(def, GameState.flags)) {
      this.openDialogue(def.lines.after);
      return;
    }
    const firstMeeting = !GameState.flags.duelsMet?.[def.id];
    markDuelMet(def, GameState.flags);
    if (firstMeeting) saveGame(); // the ambush spends itself even if the player declines
    this.pendingDuel = def;
    this.openDialogue(def.lines.challenge, () => this.openDuelConfirm());
  }

  openDuelConfirm() {
    this.menuOpen = true;
    this.menuState = 'duelConfirm';
    this.menuObjs = [];
    this.buildMenu();
  }

  startDuel() {
    this.closeMenu();
    const def = this.pendingDuel;
    if (!def) return;
    const enemyTeam = buildCorelockTeam(def, GameState.flags);
    this.cameras.main.flash(220, 18, 16, 26);
    this.time.delayedCall(180, () => {
      this.scene.launch('Battle', { duel: def, enemyTeam, onEnd: (res) => this.onBattleEnd(res) });
      this.scene.pause();
    });
  }

  // ---- The board (PHASE14 §3) ----------------------------------------------
  openBoard() {
    syncContracts(GameState.flags);
    this.menuOpen = true;
    this.menuState = 'board';
    this.menuObjs = [];
    this.buildMenu();
  }

  acceptNotice(def) {
    if (!acceptContract(def, GameState.flags)) {
      this.toast(carried(GameState.flags).length >= ACTIVE_CAP
        ? `You are carrying ${ACTIVE_CAP} already. Finish something.`
        : 'Not that one.');
      return;
    }
    saveGame();
    this.closeMenu();
    this.openDialogue([def.lines.accept], () => this.openBoard());
  }

  turnInNotice(def) {
    const res = turnInContract(def, GameState.flags);
    if (!res) {
      this.toast('Not yet.');
      return;
    }
    saveGame();
    this.closeMenu();
    this.openDialogue(
      [def.lines.turnin, `Paid: ${res.paid} gilt. ${gilt()} on you.`],
      () => this.openBoard()
    );
  }

  // ---- Rumor barks (PHASE14 §4) --------------------------------------------
  // One per visit to the tavern, priority-ordered, never the same one twice running.
  // The engine holds those two rules; the scene only decides that a "visit" is a walk
  // through the door.
  maybeBark() {
    if (this.map.id !== 'tavern' || this.barkGiven) return null;
    const bark = pickBark();
    if (!bark) return null;
    this.barkGiven = true;
    recordBark(bark);
    saveGame();
    return bark;
  }

  // ---- The locker (PHASE13 §4) ---------------------------------------------
  // Shop v1: static stock, terse, in-voice. The never-zero law (ledger #9) is satisfied
  // by construction — the stock list is a constant, so the rough core can never sell out.
  openLocker() {
    this.menuOpen = true;
    this.menuState = 'locker';
    this.menuObjs = [];
    this.buildMenu();
  }

  buyItem(id) {
    const price = ITEMS[id].buy;
    if (price == null || !spendGilt(price)) {
      this.toast("Maren: I don't take promises.");
      return;
    }
    addItem(id, 1);
    saveGame();
    this.buildMenu(); // prices and counts move; rebuild in place
    this.toast(`Bought ${ITEMS[id].name} — ${gilt()} gilt left.`);
  }

  sellItem(id) {
    const value = ITEMS[id].sell ?? 0;
    if (!value || !removeItem(id, 1)) return;
    addGilt(value);
    saveGame();
    this.buildMenu();
    this.toast(`Sold ${ITEMS[id].name} — +${value} gilt.`);
  }

  // ---- The bag (PHASE13 §3, field use) -------------------------------------
  // Field use reaches the whole party, which is the difference between the bag here and
  // the bag in a fight: no turn to spend, and you can pick who it lands on.
  useItemInField(id, creature) {
    const it = ITEMS[id];
    if (!removeItem(id, 1)) return;
    const lines = [];
    if (it.healFrac) {
      const heal = Math.max(1, Math.floor(creature.maxHp * it.healFrac * healingReceivedMod(creature)));
      const before = creature.hp;
      creature.hp = Math.min(creature.maxHp, creature.hp + heal);
      lines.push(`${creature.name} takes the ${it.name.toLowerCase()} — +${creature.hp - before} HP.`);
    }
    if (it.kind === 'cleanse') {
      clearStatuses(creature);
      lines.push(`You work the rag over ${creature.name}.`);
    }
    if (it.bond) {
      const fed = feedTreat(creature, it.bond);
      if (fed) lines.push(`${creature.name} takes it from your hand without being asked.`);
    }
    saveGame();
    this.closeMenu();
    this.openDialogue(lines.length ? lines : [`Nothing to do with a ${it.name.toLowerCase()} just now.`]);
  }

  // ---- The choice at the table (PHASE10 §2) --------------------------------
  // The inspect card: numen name, type · role, the handler's faction-origin line,
  // and the bible blurb. NO stat screens — mystery over menus (ledger #5). Esc backs
  // out freely; all three cores can be inspected any number of times.
  openCoreInspect(speciesKey) {
    this.inspectSpecies = speciesKey;
    this.menuOpen = true;
    this.menuState = 'coreInspect';
    this.menuObjs = [];
    this.buildMenu();
  }

  // Confirm-final. By the time this runs the player has answered "The choice is
  // final." — bind, re-render the map (the cores leave the table), then the claim
  // beat: handler's dry line, the two rivals each take a leftover, autosave.
  confirmBind() {
    const speciesKey = this.inspectSpecies;
    this.closeMenu();
    const { starter, rivals } = bindStarter(speciesKey);
    this.loadMap(this.map.id);
    const d = CORE_DETAILS;
    this.openDialogue(
      [
        `You press your palm to the ${d[speciesKey].look}. The bind takes, quiet as a signature.`,
        `${starter.name} is yours.`,
        d[speciesKey].handler,
        `${RIVALS.a.name} is first to the table and takes the ${d[rivals.a].look}.`,
        RIVALS.a.claim,
        `${RIVALS.b.name} takes the ${d[rivals.b].look} last, weighing it once.`,
        RIVALS.b.claim,
        'The table stands empty. The door is just a door again.',
      ],
      () => saveGame() // §2.5: autosave once the claims are done
    );
  }

  useHeal() {
    GameState.flags.respawn = { mapId: this.map.id, x: this.gx, y: this.gy };
    const injured = GameState.party.some((c) => c.hp < c.maxHp);
    healParty();
    // PHASE13 §6: rest soothes — Bond +1, Wrath −1 for everyone, and a fresh treat
    // window. It is the only lever on Wrath the player has before the ranch exists.
    for (const c of GameState.party) hearthRest(c);
    // PHASE13 §3 (ledger #9), the never-zero law: someone tops you back up to three
    // roughs. A gift, not a purchase, and it is logged ONCE — the line only appears on
    // a rest that actually left cores, so it never becomes wallpaper.
    const cores = topUpHearthCores();
    saveGame(); // autosave on heal (§6)
    const lines = injured
      ? ["The hearth's warmth settles into the cores.",
        'Your team is fully restored, and this spot marked as safe.']
      : ['The hearth glows steady. Your team is already whole.'];
    if (cores > 0) {
      lines.push(`Someone left cores by the hearth. You take ${cores} — ${itemCount(BASELINE_CORE)} rough in the bag.`);
    }
    this.openDialogue(lines);
  }

  // ---- Encounters --------------------------------------------------------
  startEncounter() {
    // PHASE13 §5: the map rides along so the loot engine knows what falls out here.
    const enemy = rollEncounter(this.map.encounters.table, Math.random, this.map.id);
    markSeen(enemy.species);
    this.cameras.main.flash(160, 18, 22, 14);
    this.time.delayedCall(140, () => {
      this.scene.launch('Battle', { enemy, onEnd: (res) => this.onBattleEnd(res) });
      this.scene.pause();
    });
  }

  onBattleEnd(res) {
    if (res.type === 'wipe') this.pendingWipe = true;
    else if (res.type === 'win' && res.boss) this.pendingBossCleared = true;
  }

  onResume() {
    this.moving = false;
    this.transitioning = false;
    if (this.pendingWipe) {
      this.pendingWipe = false;
      this.blackOut();
      return;
    }
    if (this.pendingBossCleared) {
      this.pendingBossCleared = false;
      this.clearGate();
    }
  }

  blackOut() {
    this.transitioning = true;
    const cam = this.cameras.main;
    cam.fadeOut(650, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      // PHASE9: the default safe point is the tavern hearth (where New Game wakes).
      const r = GameState.flags.respawn || { mapId: 'tavern', x: 2, y: 5 };
      let { mapId, x, y } = r;
      if (x === undefined || y === undefined) {
        const sp = getSpawn(mapId || 'tavern', r.spawn || 'start'); // legacy-save fallback
        x = sp.x;
        y = sp.y;
      }
      healParty();
      GameState.position = { mapId, x, y };
      GameState.facing = 'up';
      this.loadMap(r.mapId);
      saveGame();
      cam.fadeIn(650, 0, 0, 0);
      this.transitioning = false;
      this.openDialogue([
        'Your vision fades to black...',
        'You wake at the last hearth your team rested by. They stir, whole again.',
      ]);
    });
  }

  // ---- Dialogue ----------------------------------------------------------
  openDialogue(lines, onDone) {
    this.dialogueOpen = true;
    this.dialogueLines = lines;
    this.dialogueIndex = 0;
    this.dialogueDone = onDone || null;
    const w = this.scale.width;
    const h = this.scale.height;
    this.dlgBg = this.add
      .rectangle(w / 2, h - 70, w - 40, 110, INT.panel, 0.97)
      .setStrokeStyle(2, INT.edge)
      .setScrollFactor(0)
      .setDepth(100);
    this.dlgText = this.add
      .text(40, h - 112, '', {
        fontFamily: 'Consolas, monospace',
        fontSize: '18px',
        color: HEX.ink,
        wordWrap: { width: w - 90 },
        lineSpacing: 4,
      })
      .setScrollFactor(0)
      .setDepth(101);
    this.dlgHint = this.add
      .text(w - 34, h - 30, '▸ Space', {
        fontFamily: 'Consolas, monospace',
        fontSize: '12px',
        color: HEX.dim,
      })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(101);
    this.renderDialogue();
  }

  renderDialogue() {
    this.dlgText.setText(this.dialogueLines[this.dialogueIndex]);
  }

  advanceDialogue() {
    this.dialogueIndex++;
    if (this.dialogueIndex >= this.dialogueLines.length) {
      this.closeDialogue();
      const cb = this.dialogueDone;
      this.dialogueDone = null;
      if (cb) cb();
    } else {
      this.renderDialogue();
    }
  }

  closeDialogue() {
    this.dlgBg.destroy();
    this.dlgText.destroy();
    this.dlgHint.destroy();
    this.dialogueOpen = false;
  }

  // ---- Pause menu --------------------------------------------------------
  openMenu() {
    this.menuOpen = true;
    this.menuState = 'root';
    this.menuObjs = [];
    this.buildMenu();
  }

  clearMenu() {
    for (const o of this.menuObjs) o.destroy();
    this.menuObjs = [];
  }

  closeMenu() {
    this.clearMenu();
    this.menuOpen = false;
  }

  menuStyle(size, color) {
    return { fontFamily: 'Consolas, monospace', fontSize: size, color };
  }

  buildMenu() {
    this.clearMenu();
    const w = this.scale.width;
    const cx = w / 2;
    // PHASE9: the Numinary holds 18 numens — it gets a wide two-column panel.
    const panelW = this.menuState === 'compendium' ? 720 : 460;
    // Party (2 lines per creature since PHASE6 shows movesets) and the grown compendium
    // need the taller layout; the other menus keep the compact one. PHASE13: the bag and
    // the locker's two columns want the room too.
    const tall = this.menuState === 'party' || this.menuState === 'compendium' ||
      this.menuState === 'bag' || this.menuState === 'lockerBuy' || this.menuState === 'lockerSell' ||
      this.menuState === 'board' || this.menuState === 'contracts';
    const panelH = tall ? 440 : 360;
    const panelCY = tall ? 315 : 300;
    const top = tall ? 110 : 130;

    const bg = this.add
      .rectangle(cx, panelCY, panelW, panelH, INT.panel, 0.97)
      .setStrokeStyle(2, INT.edge)
      .setScrollFactor(0)
      .setDepth(100);
    this.menuObjs.push(bg);

    let title = 'MENU';
    if (this.menuState === 'party') title = 'PARTY';
    else if (this.menuState === 'compendium') title = 'THE NUMINARY'; // PHASE9 vocabulary
    else if (this.menuState === 'confirmNew') title = 'NEW GAME';
    else if (this.menuState === 'bossConfirm') title = 'THE BARROW-KING';
    else if (this.menuState === 'duelConfirm') title = this.pendingDuel.name.toUpperCase();
    else if (this.menuState === 'bag' || this.menuState === 'bagTarget') title = 'THE BAG';
    else if (this.menuState === 'board' || this.menuState === 'notice') title = 'THE CONTRACT BOARD';
    else if (this.menuState === 'contracts') title = 'CONTRACTS';
    else if (this.menuState.startsWith('locker')) title = "THE LOCKER";
    else if (this.menuState === 'coreInspect' || this.menuState === 'coreConfirm')
      title = SPECIES[this.inspectSpecies].name.toUpperCase(); // PHASE10 inspect card
    this.menuObjs.push(
      this.add
        .text(cx, top, title, this.menuStyle('22px', HEX.accent))
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(101)
    );

    if (this.menuState === 'root') {
      this.menuItems = [
        { label: 'Party', act: () => this.gotoMenu('party') },
        { label: 'Bag', act: () => this.gotoMenu('bag') }, // PHASE13 §3
        { label: 'Contracts', act: () => this.gotoMenu('contracts') }, // PHASE14 §2
        { label: 'The Numinary', act: () => this.gotoMenu('compendium') },
        { label: 'Save Game', act: () => this.doSave() },
        { label: 'New Game', act: () => this.gotoMenu('confirmNew') },
        { label: 'Close', act: () => this.closeMenu() },
      ];
      this.renderMenuItems(top + 60);
    } else if (this.menuState === 'contracts') {
      // The slate: what you took and how far along it is. Terse by instruction (§2).
      const slate = slateLines(GameState.flags);
      this.renderInfo([`Carrying ${carried(GameState.flags).length}/${ACTIVE_CAP}`],
        top + 40, '15px', 5, cx - 320);
      this.renderInfo(slate, top + 68, '13px', 5, cx - 320, 640);
      this.menuItems = [{ label: 'Back', act: () => this.gotoMenu('root') }];
      this.renderMenuItems(Math.min(500, top + 92 + slate.length * 18));
    } else if (this.menuState === 'board') {
      const notices = boardContracts(GameState.flags);
      this.renderInfo([`Carrying ${carried(GameState.flags).length}/${ACTIVE_CAP}   ·   ${gilt()} gilt`],
        top + 40, '15px', 5, cx - 320);
      this.menuItems = notices.map((def) => {
        const st = contractState(def.id, GameState.flags);
        const p = progressOf(def, GameState.flags);
        const tag = st === 'done' ? 'DONE' : st === 'active' ? `${p.have}/${p.need}` : `${def.payout}g`;
        return {
          label: `${def.title.padEnd(34)} ${tag}`,
          act: () => {
            this.pendingNotice = def;
            this.gotoMenu('notice');
          },
          danger: st === 'done',
        };
      });
      this.menuItems.push({ label: 'Step away', act: () => this.closeMenu() });
      this.renderMenuItems(top + 74);
    } else if (this.menuState === 'notice') {
      // The notice itself, in full. No objective markers, no explanation — it says what
      // the plank says (§3).
      const def = this.pendingNotice;
      const st = contractState(def.id, GameState.flags);
      const p = progressOf(def, GameState.flags);
      this.renderInfo([def.lines.notice], top + 40, '14px', 5, cx - 300, 600);
      this.renderInfo(
        [`${st === 'open' || st === 'turned' ? 'Not taken' : st === 'done' ? 'Done' : `${p.have}/${p.need}`}` +
          `   ·   pays ${def.payout} gilt${def.faction ? `   ·   ${def.faction}` : ''}` +
          `${def.repeatable ? '   ·   standing work' : ''}`],
        top + 150, '13px', 5, cx - 300, 600
      );
      this.menuItems = [];
      if (canTurnIn(def, GameState.flags)) {
        this.menuItems.push({ label: 'Turn it in', act: () => this.turnInNotice(def), danger: true });
      } else if (canAccept(def, GameState.flags)) {
        this.menuItems.push({ label: 'Take it', act: () => this.acceptNotice(def) });
      }
      this.menuItems.push({ label: 'Back', act: () => this.gotoMenu('board') });
      this.renderMenuItems(top + 190);
    } else if (this.menuState === 'bag') {
      // Everything carried, with its blurb — materials included, because a merc knowing
      // what a wire-spool is worth is half the economy.
      const held = heldItems();
      this.renderInfo([`${gilt()} gilt`], top + 40, '15px', 5, cx - 320);
      this.renderInfo(held.length ? this.bagLines(held) : ['(the bag is empty)'],
        top + 68, '13px', 5, cx - 320, 640);
      this.menuItems = usableItems('field').map((id) => ({
        label: `Use ${ITEMS[id].name}  ×${itemCount(id)}`,
        act: () => {
          this.pendingItem = id;
          this.gotoMenu('bagTarget');
        },
      }));
      this.menuItems.push({ label: 'Back', act: () => this.gotoMenu('root') });
      this.renderMenuItems(Math.min(500, top + 84 + Math.max(held.length, 1) * 18));
    } else if (this.menuState === 'bagTarget') {
      const it = ITEMS[this.pendingItem];
      this.renderInfo([`${it.name} — on which numen?`, '', it.blurb], top + 44, '14px', 5, cx - 200, 400);
      this.menuItems = GameState.party.map((c) => ({
        label: `${c.name}  Lv${c.level}  ${c.hp}/${c.maxHp}`,
        act: () => this.useItemInField(this.pendingItem, c),
      }));
      this.menuItems.push({ label: 'Back', act: () => this.gotoMenu('bag') });
      this.renderMenuItems(top + 130);
    } else if (this.menuState === 'locker') {
      this.renderInfo([`${gilt()} gilt`, '', 'Maren keeps it stocked. She always has.'],
        top + 44, '15px', 5, cx - 200, 400);
      this.menuItems = [
        { label: 'Buy', act: () => this.gotoMenu('lockerBuy') },
        { label: 'Sell', act: () => this.gotoMenu('lockerSell') },
        { label: 'Leave it', act: () => this.closeMenu() },
      ];
      this.renderMenuItems(top + 130);
    } else if (this.menuState === 'lockerBuy') {
      this.renderInfo([`${gilt()} gilt`], top + 40, '15px', 5, cx - 320);
      this.renderInfo(LOCKER_STOCK.map((id) => `  ${ITEMS[id].name.padEnd(20)}${String(ITEMS[id].buy).padStart(4)}g   ${ITEMS[id].blurb}`),
        top + 66, '12px', 5, cx - 320, 640);
      this.menuItems = LOCKER_STOCK.map((id) => ({
        label: `${ITEMS[id].name} — ${ITEMS[id].buy}g  (have ${itemCount(id)})`,
        act: () => this.buyItem(id),
        danger: gilt() < ITEMS[id].buy,
      }));
      this.menuItems.push({ label: 'Back', act: () => this.gotoMenu('locker') });
      this.renderMenuItems(top + 66 + LOCKER_STOCK.length * 18 + 16);
    } else if (this.menuState === 'lockerSell') {
      const sellable = heldItems().filter((id) => (ITEMS[id].sell ?? 0) > 0);
      this.renderInfo([`${gilt()} gilt`], top + 40, '15px', 5, cx - 320);
      this.menuItems = sellable.map((id) => ({
        label: `Sell ${ITEMS[id].name}  ×${itemCount(id)}  → ${ITEMS[id].sell}g`,
        act: () => this.sellItem(id),
      }));
      if (!sellable.length) this.renderInfo(['(nothing she wants)'], top + 68, '13px', 5, cx - 200);
      this.menuItems.push({ label: 'Back', act: () => this.gotoMenu('locker') });
      this.renderMenuItems(top + 76);
    } else if (this.menuState === 'confirmNew') {
      this.menuObjs.push(
        this.add
          .text(cx, top + 46, 'Erase this world and start over?', this.menuStyle('15px', HEX.bad))
          .setOrigin(0.5, 0)
          .setScrollFactor(0)
          .setDepth(101)
      );
      this.menuItems = [
        { label: 'No — go back', act: () => this.gotoMenu('root') },
        { label: 'Yes — erase and restart', act: () => this.doNewGame(), danger: true },
      ];
      this.renderMenuItems(top + 120);
    } else if (this.menuState === 'bossConfirm') {
      this.menuObjs.push(
        this.add
          .text(
            cx,
            top + 44,
            'A bone-titan bars the way south.\nFace it now?',
            { ...this.menuStyle('15px', HEX.bad), align: 'center', lineSpacing: 4 }
          )
          .setOrigin(0.5, 0)
          .setScrollFactor(0)
          .setDepth(101)
      );
      this.menuItems = [
        { label: 'Not yet — step back', act: () => this.closeMenu() },
        { label: 'Face the Barrow-King', act: () => this.commitBossFight(), danger: true },
      ];
      this.renderMenuItems(top + 120);
    } else if (this.menuState === 'duelConfirm') {
      // PHASE12 §2: the two laws, stated once, as the terms you are agreeing to —
      // never repeated as tutorial text mid-fight.
      const d = this.pendingDuel;
      this.menuObjs.push(
        this.add
          .text(
            cx,
            top + 40,
            `${d.epithet}\n\nNo binding. No walking away.`,
            { ...this.menuStyle('15px', HEX.dim), align: 'center', lineSpacing: 4 }
          )
          .setOrigin(0.5, 0)
          .setScrollFactor(0)
          .setDepth(101)
      );
      this.menuItems = [
        { label: 'Not yet — step back', act: () => this.closeMenu() },
        { label: 'Sign the duel', act: () => this.startDuel(), danger: true },
      ];
      this.renderMenuItems(top + 130);
    } else if (this.menuState === 'coreInspect') {
      // PHASE10 §2.3: name (the title), type · role, origin line, blurb. No numbers.
      const sp = SPECIES[this.inspectSpecies];
      const core = CORE_DETAILS[this.inspectSpecies];
      this.menuObjs.push(
        this.add
          .text(cx, top + 40, `${sp.type} · ${sp.role}`, this.menuStyle('15px', HEX.dim))
          .setOrigin(0.5, 0)
          .setScrollFactor(0)
          .setDepth(101)
      );
      this.renderInfo([`“${core.origin}”`], top + 76, '15px', 5, cx - 195, 390);
      this.renderInfo([sp.blurb], top + 148, '13px', 5, cx - 195, 390);
      this.menuItems = [
        { label: 'Bind this one', act: () => this.gotoMenu('coreConfirm') },
        { label: 'Leave it', act: () => this.closeMenu() },
      ];
      this.renderMenuItems(top + 230);
    } else if (this.menuState === 'coreConfirm') {
      this.menuObjs.push(
        this.add
          .text(cx, top + 60, 'Bind this one? The choice is final.', this.menuStyle('16px', HEX.bad))
          .setOrigin(0.5, 0)
          .setScrollFactor(0)
          .setDepth(101)
      );
      this.menuItems = [
        { label: 'Not yet', act: () => this.gotoMenu('coreInspect') },
        { label: 'Bind it', act: () => this.confirmBind(), danger: true },
      ];
      this.renderMenuItems(top + 130);
    } else if (this.menuState === 'party') {
      this.renderInfo(this.partyLines(), top + 44, '13px', 4);
      this.menuItems = [{ label: 'Back', act: () => this.gotoMenu('root') }];
      this.renderMenuItems(492);
    } else if (this.menuState === 'compendium') {
      // Header across the top, then the roster split into two columns.
      const all = this.compendiumLines();
      const rows = all.slice(2);
      const half = Math.ceil(rows.length / 2);
      this.renderInfo([all[0]], top + 44, '14px', 5, cx - 340);
      this.renderInfo(rows.slice(0, half), top + 76, '13px', 5, cx - 340);
      this.renderInfo(rows.slice(half), top + 76, '13px', 5, cx + 20);
      this.menuItems = [{ label: 'Back', act: () => this.gotoMenu('root') }];
      this.renderMenuItems(492);
    }

    this.menuIndex = 0;
    this.renderMenuSelection();
  }

  renderMenuItems(startY) {
    const cx = this.scale.width / 2;
    this.itemTexts = this.menuItems.map((it, i) => {
      const t = this.add
        .text(cx, startY + i * 38, it.label, this.menuStyle('20px', HEX.ink))
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(101)
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => {
        this.menuIndex = i;
        this.renderMenuSelection();
      });
      t.on('pointerdown', () => {
        this.menuIndex = i;
        this.menuItems[i].act();
      });
      this.menuObjs.push(t);
      return t;
    });
  }

  renderInfo(lines, y, fontSize = '15px', lineSpacing = 6, x = this.scale.width / 2 - 200, wrapWidth) {
    const style = {
      fontFamily: 'Consolas, monospace',
      fontSize,
      color: HEX.dim,
      lineSpacing,
    };
    if (wrapWidth) style.wordWrap = { width: wrapWidth }; // PHASE10: the inspect card wraps prose
    const t = this.add.text(x, y, lines.join('\n'), style).setScrollFactor(0).setDepth(101);
    this.menuObjs.push(t);
  }

  // PHASE13 §3: the bag, with blurbs. The materials matter most here — knowing a
  // wire-spool is worth seven is half of knowing whether to walk back to town.
  bagLines(held) {
    return held.map((id) => {
      const it = ITEMS[id];
      const worth = it.sell ? `${it.sell}g` : '—';
      return `${String(itemCount(id)).padStart(2)}× ${it.name.padEnd(20)}${worth.padStart(4)}   ${it.blurb}`;
    });
  }

  partyLines() {
    if (!GameState.party.length) return ['(no numens)'];
    const cap = GameState.levelCap;
    const lines = [`Level cap: Lv${cap}`, ''];
    for (const c of GameState.party) {
      const atCap = c.level >= cap;
      const xp = atCap ? 'XP MAX' : `XP ${c.xp ?? 0}/${xpToNext(c.level)}`;
      const hp = `${c.hp}/${c.maxHp}`;
      // PHASE13 §6: ONE muted word, and it is the only Temper the player ever sees. No
      // numbers, no bars, no tooltip. They will work out what feeds it.
      lines.push(
        `${c.name.padEnd(12)} Lv${String(c.level).padEnd(2)} ${c.type.padEnd(6)} ${hp.padEnd(7)} ${xp.padEnd(12)} ${temperamentWord(c)}`
      );
      // PHASE6: the moveset, against this stage's slot cap.
      lines.push(`  [${c.moves.length}/${speciesSlots(c.species)}] ${c.moves.map((m) => m.name).join(' · ')}`);
    }
    if (GameState.box.length) {
      lines.push('', `Box: ${GameState.box.map((c) => c.name).join(', ')}`);
    }
    return lines;
  }

  // PHASE9: the compendium is the Numinary; a numen is SEEN or BOUND.
  compendiumLines() {
    const total = Object.keys(SPECIES).length;
    const lines = [
      `Seen ${GameState.seen.length}/${total}    Bound ${GameState.caught.length}/${total}`,
      '',
    ];
    for (const key of Object.keys(SPECIES)) {
      const caught = GameState.caught.includes(key);
      const seen = GameState.seen.includes(key);
      const mark = caught ? '●' : seen ? '◐' : '·';
      const name = seen ? SPECIES[key].name : '?????';
      // PHASE8: a bound numen's nature is known — type · role (roles per data/roles.js).
      const detail = caught ? `  ·  ${SPECIES[key].type} ${SPECIES[key].role}` : '';
      lines.push(`${mark} ${name.padEnd(13)}${detail}`);
    }
    return lines;
  }

  gotoMenu(state) {
    this.menuState = state;
    this.buildMenu();
  }

  renderMenuSelection() {
    this.itemTexts.forEach((t, i) => {
      const sel = i === this.menuIndex;
      const danger = this.menuItems[i].danger;
      t.setColor(sel ? HEX.accent : danger ? HEX.bad : HEX.dim);
      t.setText((sel ? '▸ ' : '  ') + this.menuItems[i].label);
    });
  }

  updateMenu() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w)) {
      this.menuIndex = (this.menuIndex - 1 + this.menuItems.length) % this.menuItems.length;
      this.renderMenuSelection();
    } else if (
      Phaser.Input.Keyboard.JustDown(this.keys.down) ||
      Phaser.Input.Keyboard.JustDown(this.keys.s)
    ) {
      this.menuIndex = (this.menuIndex + 1) % this.menuItems.length;
      this.renderMenuSelection();
    } else if (this.justInteract()) {
      this.menuItems[this.menuIndex].act();
    } else if (this.justMenu()) {
      // PHASE10: Esc backs out of the inspect card freely (§2.3); the confirm steps
      // back to the card, never straight out — the final answer is deliberate.
      if (this.menuState === 'coreConfirm') this.gotoMenu('coreInspect');
      // PHASE13: the locker is not part of the pause menu — it was opened by talking to
      // Maren, so backing out of it leaves the conversation, not the menu tree.
      else if (this.menuState === 'lockerBuy' || this.menuState === 'lockerSell') this.gotoMenu('locker');
      else if (this.menuState === 'bagTarget') this.gotoMenu('bag');
      // The board, like the locker, was opened by walking up to a thing in the world —
      // backing out of it leaves the plank, not the pause menu.
      else if (this.menuState === 'notice') this.gotoMenu('board');
      else if (
        this.menuState === 'root' ||
        this.menuState === 'bossConfirm' ||
        this.menuState === 'duelConfirm' ||
        this.menuState === 'locker' ||
        this.menuState === 'board' ||
        this.menuState === 'coreInspect'
      )
        this.closeMenu();
      else this.gotoMenu('root');
    }
  }

  doSave() {
    const ok = saveGame();
    this.toast(ok ? 'Game saved.' : 'Save failed (storage blocked).');
  }

  doNewGame() {
    newGame();
    this.closeMenu();
    this.transitioning = true;
    const cam = this.cameras.main;
    cam.fadeOut(300, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      this.loadMap(GameState.position.mapId);
      cam.fadeIn(300, 0, 0, 0);
      this.transitioning = false;
    });
  }

  toast(msg) {
    const t = this.add
      .text(this.scale.width / 2, 70, msg, this.menuStyle('16px', HEX.good))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(120);
    this.tweens.add({
      targets: t,
      alpha: 0,
      y: 50,
      delay: 900,
      duration: 600,
      onComplete: () => t.destroy(),
    });
  }
}
