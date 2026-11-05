import Phaser from 'phaser';
import { GameState, markSeen, markCaught } from '../systems/state.js';
import { addCreature, firstAlive, aliveCount } from '../systems/party.js';
import { SPECIES, makeCreature, gainCreatureXp, speciesSlots, armLearnset } from '../data/creatures.js';
import { xpToNext, xpForDefeat } from '../systems/progression.js';
import { saveGame } from '../systems/save.js';
import {
  computeDamage,
  catchChance,
  rollCatch,
  playerActsFirst,
  effectiveness,
  chooseEnemyMove,
  charmSelfDamage,
} from '../systems/combat.js';
import {
  tryApplyStatus,
  resolveApplyTarget,
  resolveAction,
  wakeIfDamaged,
  cleanseControl,
  tickStatuses,
  clearStatuses,
  activeStatuses,
  healingReceivedMod,
  statusLine,
} from '../systems/status.js';
import {
  DUEL_NO_BIND,
  DUEL_NO_FLEE,
  purseLine,
  recordDuelWin,
  recordDuelLoss,
} from '../systems/corelocks.js';
import { ITEMS } from '../data/items.js';
import { heldCores, usableItems, itemCount, removeItem } from '../systems/inventory.js';
import { rollLoot, applyLoot } from '../systems/loot.js';
import { tickWildWin } from '../systems/contracts.js';
import { wildWipeLoss, duelWipeLoss, gilt, addGilt } from '../systems/economy.js';
import { onFaint, onWinStanding, onSurvivedBattle, feedTreat, openTreatWindow } from '../systems/temper.js';
import { TYPE_COLORS } from '../data/types.js';
import { HEX, INT, shade } from '../data/palette.js';

// Turn-based battle. Ports PHASE3 §4 exactly: damage/turn order (§4.3), catching (§4.4),
// and swap-costs-your-turn (§4.3).
// PHASE12 §2 — DUELS. A corelock duel is this same battle with three laws bolted on:
// no binding ("Its core answers to another."), no fleeing ("You signed the duel."), and
// a TEAM on the other side that sends out its next numen when one falls. Everything
// else — statuses, swap-cleanse, the onAct gate, XP, evolution beats — is untouched.
export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('Battle');
  }

  init(data) {
    this.boss = !!data.boss; // PHASE4 boss mode: Lifedrain on, Catch off, unique framing
    // PHASE12: `duel` is the corelock DEF; `enemyTeam` its built bench, fought in order.
    // A wild fight is a one-creature team with no def, so the rest of the scene can ask
    // `this.duel` once and stop caring.
    this.duel = data.duel || null;
    this.enemyTeam = data.enemyTeam || [data.enemy];
    this.foeIndex = 0;
    this.enemy = this.enemyTeam[0];
    this.onEnd = data.onEnd;
    this.frenzy = false; // one-time "feeding frenzy" callout latch
    this.postDirty = false; // PHASE6: set when evolution/moveset changes need an autosave
    this.sleepHintShown = false; // PHASE11: the once-per-battle bind hint latch
  }

  // Who the log calls the thing across from you. A wild is "Wild X"; a boss and a
  // corelock's numen are named outright — a duel is between people, not weather.
  isWild() {
    return !this.boss && !this.duel;
  }
  foeLabel() {
    return this.isWild() ? `Wild ${this.enemy.name}` : this.enemy.name;
  }
  foesRemain() {
    return this.enemyTeam.slice(this.foeIndex + 1).some((c) => c.hp > 0);
  }

  create() {
    this.active = firstAlive(GameState.party);
    if (!this.active) {
      // Shouldn't happen, but never soft-lock: report a wipe and bail.
      this.onEnd({ type: 'wipe' });
      this.scene.resume('World');
      this.scene.stop();
      return;
    }
    // PHASE12 §2: a corelock's numens enter the Numinary the moment they take the
    // ground — the same "seen on reveal" law the wilds have always had. Bosses aren't
    // compendium species.
    if (!this.boss) markSeen(this.enemy.species);
    // PHASE13 §6: a fresh treat window opens with the fight — one berry's worth of Bond
    // per battle, however many you feed it.
    for (const c of GameState.party) openTreatWindow(c);

    this.buildScene();
    this.optionTexts = [];
    this.state = 'message';

    this.keys = this.input.keyboard.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
      w: 'W', a: 'A', s: 'S', d: 'D',
      space: 'SPACE', enter: 'ENTER', esc: 'ESC', back: 'BACKSPACE',
    });

    this.refreshHP();
    // PHASE9: "gloom" over "grass" — the same line has to hold in ash, grass, and the dark.
    const intro = this.boss
      ? `The Barrow-King rises — bone grinding on bone, filling the passage. It hungers.`
      : this.duel
        ? `${this.duel.name} unseals a core. ${this.enemy.name} takes the ground.`
        : `A wild ${this.enemy.name} looms out of the gloom!`;
    this.log([intro], () => this.showMain());
  }

  // ---- Scene construction -----------------------------------------------
  buildScene() {
    const W = this.scale.width;
    this.add.rectangle(W / 2, 300, W, 600, INT.bg).setDepth(0);
    this.add.rectangle(W / 2, 165, W, 330, shade(INT.cave, 0.7)).setDepth(0);

    this.add.ellipse(575, 205, 180, 42, shade(INT.ground, 0.7)).setDepth(2);
    this.add.ellipse(220, 330, 200, 46, shade(INT.ground, 0.7)).setDepth(2);

    // The boss looms — larger and set a touch higher/darker than a normal wild.
    this.enemySprite = this.add
      .sprite(565, this.boss ? 150 : 172, `creature-${this.enemy.species}`)
      .setScale(this.boss ? 3.6 : 2.3)
      .setDepth(5);
    this.playerSprite = this.add
      .sprite(220, 292, `creature-${this.active.species}`)
      .setScale(2.5)
      .setDepth(5);

    // enemy info panel (top-left)
    this.add
      .rectangle(185, 82, 320, 80, INT.panel, 0.95)
      .setStrokeStyle(2, INT.edge)
      .setDepth(8);
    this.enemyName = this.add.text(40, 52, '', this.tx('18px', HEX.ink)).setDepth(9);
    this.enemyType = this.add.text(40, 74, '', this.tx('13px', HEX.dim)).setDepth(9);
    this.enemyBarG = this.add.graphics().setDepth(9);
    this.enemyHpText = this.add.text(320, 96, '', this.tx('12px', HEX.dim)).setOrigin(1, 0).setDepth(9);

    // player info panel (mid-right)
    this.add
      .rectangle(610, 250, 340, 86, INT.panel, 0.95)
      .setStrokeStyle(2, INT.edge)
      .setDepth(8);
    this.playerName = this.add.text(455, 214, '', this.tx('18px', HEX.ink)).setDepth(9);
    this.playerType = this.add.text(455, 236, '', this.tx('13px', HEX.dim)).setDepth(9);
    this.playerBarG = this.add.graphics().setDepth(9);
    this.playerHpText = this.add.text(765, 258, '', this.tx('12px', HEX.dim)).setOrigin(1, 0).setDepth(9);
    // PHASE5: slim XP bar beneath the HP bar for the active creature (level/XP indicator).
    this.playerXpG = this.add.graphics().setDepth(9);
    this.playerXpText = this.add.text(765, 278, '', this.tx('10px', HEX.dim)).setOrigin(1, 0).setDepth(9);

    // PHASE7: status chips (icon-label + turns left) float near each combatant's sprite;
    // rebuilt by refreshHP so they always track the current active creature.
    this.enemyStatusTexts = [];
    this.playerStatusTexts = [];

    // prompt + options
    this.add.rectangle(W / 2, 360, W - 40, 50, INT.panel, 0.97).setStrokeStyle(2, INT.edge).setDepth(14);
    this.promptText = this.add
      .text(40, 348, '', { ...this.tx('17px', HEX.ink), wordWrap: { width: W - 90 } })
      .setDepth(16);
    this.add.rectangle(W / 2, 495, W - 40, 190, INT.panel, 0.97).setStrokeStyle(2, INT.edge).setDepth(14);
    this.hint = this.add
      .text(W - 30, 578, '↑/↓ select · Space confirm · Esc back', this.tx('11px', HEX.dim))
      .setOrigin(1, 1)
      .setDepth(16);
  }

  tx(size, color) {
    return { fontFamily: 'Consolas, monospace', fontSize: size, color };
  }

  // ---- HP bars -----------------------------------------------------------
  barColor(frac) {
    if (frac > 0.5) return INT.good;
    if (frac > 0.2) return INT.accent;
    return INT.bad;
  }

  drawBar(g, x, y, w, h, frac) {
    g.clear();
    g.fillStyle(INT.cavewall, 1).fillRect(x, y, w, h);
    g.fillStyle(this.barColor(frac), 1).fillRect(x, y, Math.max(0, Math.round(w * frac)), h);
    g.lineStyle(1, INT.edge, 1).strokeRect(x, y, w, h);
  }

  refreshHP() {
    const e = this.enemy;
    this.enemyName.setText(this.boss ? e.name : `${e.name}   Lv${e.level}`);
    // PHASE12: a duel shows whose numen it is and how deep the bench goes — the one
    // number a corelock fight owes the player that a wild fight doesn't.
    const stance = this.boss
      ? 'APEX'
      : this.duel
        ? `${this.duel.name} ${this.foeIndex + 1}/${this.enemyTeam.length}`
        : 'wild';
    this.enemyType.setText(`${e.type} · ${e.role} · ${stance}`);
    this.enemyHpText.setText(`${e.hp}/${e.maxHp}`);
    this.drawBar(this.enemyBarG, 40, 98, 250, 9, e.hp / e.maxHp);

    const a = this.active;
    this.playerSprite.setTexture(`creature-${a.species}`);
    this.playerName.setText(`${a.name}   Lv${a.level}`);
    this.playerType.setText(`${a.type} · ${a.role}`);
    this.playerHpText.setText(`${a.hp}/${a.maxHp}`);
    this.drawBar(this.playerBarG, 455, 258, 270, 9, a.hp / a.maxHp);
    this.drawXpBar(a);
    this.refreshStatusChips();
  }

  // PHASE7: floating status chips — "◈ Name turns" in the status's muted flavor color,
  // centered under the enemy and above the player's active creature.
  refreshStatusChips() {
    for (const t of this.enemyStatusTexts) t.destroy();
    for (const t of this.playerStatusTexts) t.destroy();
    this.enemyStatusTexts = this.buildStatusChips(this.enemy, 565, 240);
    this.playerStatusTexts = this.buildStatusChips(this.active, 220, 212);
  }

  buildStatusChips(creature, cx, y) {
    const list = activeStatuses(creature);
    if (!list.length) return [];
    const gap = 10;
    const texts = list.map((s) =>
      this.add
        .text(0, y, `◈ ${s.def.name} ${s.turnsLeft}`, this.tx('12px', TYPE_COLORS[s.def.flavorType]))
        .setDepth(9)
    );
    const total = texts.reduce((w, t) => w + t.width, 0) + gap * (texts.length - 1);
    let x = cx - total / 2;
    for (const t of texts) {
      t.setX(x);
      x += t.width + gap;
    }
    return texts;
  }

  // Slim XP-to-next bar under the active creature's HP bar. At the cap it reads MAX.
  drawXpBar(a) {
    const g = this.playerXpG;
    const atCap = a.level >= GameState.levelCap;
    const need = xpToNext(a.level);
    const frac = atCap ? 1 : Math.max(0, Math.min(1, (a.xp ?? 0) / need));
    g.clear();
    g.fillStyle(INT.cavewall, 1).fillRect(455, 276, 270, 5);
    g.fillStyle(atCap ? INT.good : INT.accent, 1).fillRect(455, 276, Math.round(270 * frac), 5);
    g.lineStyle(1, INT.edge, 1).strokeRect(455, 276, 270, 5);
    this.playerXpText.setText(atCap ? `XP MAX (Lv${GameState.levelCap})` : `XP ${a.xp ?? 0}/${need}`);
  }

  // ---- Menus -------------------------------------------------------------
  showMain() {
    this.state = 'menu';
    this.canBack = false;
    this.promptText.setText('What will you do?');
    const benchAlive = GameState.party.filter((c) => c !== this.active && c.hp > 0).length;
    // PHASE9 vocabulary: you BIND a numen (the code path keeps its old name — text sweep,
    // not a refactor). PHASE12: in a duel Bind and Run stay ON the menu and REFUSE with
    // a line — a greyed-out option teaches nothing; a refusal teaches the law. Neither
    // costs the turn (the boss's catch-lock has worked this way since Phase 4).
    this.setOptions([
      { label: 'Fight', enabled: true, onSelect: () => this.showMoves() },
      { label: 'Bind', enabled: true, onSelect: () => this.resolveCatch() },
      // PHASE13 §3: the bag. Disabled rather than hidden when empty — the action exists,
      // you just have nothing in it.
      { label: 'Item', enabled: usableItems('battle').length > 0, onSelect: () => this.showItems() },
      { label: 'Swap', enabled: benchAlive > 0, onSelect: () => this.showSwap(false) },
      { label: 'Run', enabled: true, onSelect: () => this.resolveRun() },
    ]);
  }

  showMoves() {
    this.state = 'menu';
    this.canBack = true;
    this.backFn = () => this.showMain();
    this.promptText.setText(`${this.active.name} — choose a move.`);
    const opts = this.active.moves.map((m) => ({
      // PHASE7 hook tags (+Status / recoil) + PHASE8 kind marker (◆ = magic, off Mag).
      // PHASE9: a power-0 status move reads as what it is — no damage number.
      label: !m.power
        ? `${m.name}   · self  +${m.applies.status}`
        : `${m.name}   · ${m.kind === 'magic' ? '◆ ' : ''}${m.type} ${m.power}${m.applies ? `  +${m.applies.status}` : ''}${m.recoil ? '  recoil' : ''}`,
      enabled: true,
      onSelect: () => this.resolveMove(m),
    }));
    opts.push({ label: '‹ Back', enabled: true, onSelect: () => this.showMain() });
    this.setOptions(opts);
  }

  showSwap(forced) {
    this.state = 'menu';
    this.canBack = !forced;
    this.backFn = () => this.showMain();
    this.promptText.setText(
      forced ? 'Send out which numen?' : 'Swap to which? (this costs your turn)'
    );
    const opts = GameState.party.map((c, i) => ({
      label: `${c.name}  Lv${c.level}  ${c.hp}/${c.maxHp}${
        c === this.active ? '  (active)' : c.hp <= 0 ? '  (down)' : ''
      }`,
      enabled: c.hp > 0 && c !== this.active,
      onSelect: () => (forced ? this.forcedSwap(i) : this.resolveSwap(i)),
    }));
    if (!forced) opts.push({ label: '‹ Back', enabled: true, onSelect: () => this.showMain() });
    this.setOptions(opts);
  }

  setOptions(list) {
    this.options = list;
    this.optIndex = list.findIndex((o) => o.enabled);
    if (this.optIndex < 0) this.optIndex = 0;
    this.renderOptions();
  }

  clearOptions() {
    for (const t of this.optionTexts) t.destroy();
    this.optionTexts = [];
  }

  renderOptions() {
    this.clearOptions();
    const x = 70;
    const y0 = 418;
    const sp = 25;
    this.options.forEach((o, i) => {
      const t = this.add.text(x, y0 + i * sp, '', this.tx('17px', HEX.ink)).setDepth(16);
      if (o.enabled) {
        t.setInteractive({ useHandCursor: true });
        t.on('pointerover', () => {
          this.optIndex = i;
          this.renderOptionSelection();
        });
        t.on('pointerdown', () => {
          this.optIndex = i;
          this.confirm();
        });
      }
      this.optionTexts.push(t);
    });
    this.renderOptionSelection();
  }

  renderOptionSelection() {
    this.optionTexts.forEach((t, i) => {
      const o = this.options[i];
      const sel = i === this.optIndex;
      const color = !o.enabled ? HEX.edge : sel ? HEX.accent : HEX.ink;
      t.setColor(color);
      t.setText((sel && o.enabled ? '▸ ' : '  ') + o.label);
    });
  }

  moveSel(step) {
    const n = this.options.length;
    let i = this.optIndex;
    for (let c = 0; c < n; c++) {
      i = (i + step + n) % n;
      if (this.options[i].enabled) {
        this.optIndex = i;
        break;
      }
    }
    this.renderOptionSelection();
  }

  confirm() {
    const o = this.options[this.optIndex];
    if (o && o.enabled) o.onSelect();
  }

  // ---- Turn resolution ---------------------------------------------------
  effLine(name, move, defender, dmg, wild) {
    const e = effectiveness(move, defender);
    const tag =
      e === 'super' ? '  A telling hit.'
      : e === 'resist' ? '  It barely flinched.'
      : e === 'shrug' ? '  It barely seems to touch it.' // PHASE8: elemental vs exotic ×0.85
      : '';
    const who = wild ? `Wild ${name}` : name;
    return `${who} used ${move.name}.  −${dmg} HP${tag}`;
  }

  // PHASE11 §2.1 — the onAct gate, shared by both sides. Returns true when the chosen
  // action may proceed. A DENIED actor's turn is consumed with one line and NO
  // onAction ticks (a creature that never moved doesn't bleed for moving — noted for
  // Shane). The Charmed redirect strikes the actor ITSELF at half power — that IS an
  // exertion, so its onAction statuses bite, and the self-wound can wake a sleeper.
  // (Charmed ships dark this phase — no carrier move — but the path is live for P12.)
  actGate(actor, move, lines) {
    const act = resolveAction(actor);
    if (act.outcome === 'act') return true;
    if (act.outcome === 'self') {
      const d = charmSelfDamage(actor, move);
      actor.hp = Math.max(0, actor.hp - d);
      lines.push(statusLine(act.id, 'self', actor.name));
      lines.push(`${actor.name} strikes itself with ${move.name} — −${d} HP.`);
      const w = wakeIfDamaged(actor, d);
      if (w) lines.push(statusLine(w.id, 'wake', actor.name));
      this.tickAndLog(actor, 'onAction', lines);
    } else {
      lines.push(statusLine(act.id, 'deny', actor.name));
    }
    return false;
  }

  // PHASE7 shared per-hit effects: recoil self-cost, then the on-hit status roll
  // against a still-living target. Generic — enemy moves ride the same hooks.
  // PHASE9: the status roll resolves its target through the §5 hook — a move with
  // applies.target 'self' lands on the USER (Calcify), everything else on the foe.
  // PHASE11: the roll may come back REFUSED — 'immune' (the boss law) or 'blocked'
  // (the Braced window) — each with its own dry line. A Sleep that lands on a wild
  // hints the bind play once per battle (ledger #16).
  applyHitEffects(user, move, dmg, target, lines) {
    if (move.recoil && dmg > 0) {
      const r = Math.max(1, Math.floor(move.recoil * dmg));
      user.hp = Math.max(0, user.hp - r);
      lines.push(`The force of it costs ${user.name} −${r} HP.`);
    }
    const tgt = resolveApplyTarget(user, target, move.applies);
    const ev = tryApplyStatus(tgt, move.applies);
    if (!ev) return;
    if (ev.result === 'immune' || ev.result === 'blocked') {
      lines.push(statusLine(ev.id, ev.result, tgt.name));
      return;
    }
    lines.push(statusLine(ev.id, ev.result === 'refreshed' ? 'refresh' : 'apply', tgt.name));
    // PHASE12: the bind hint stays out of duels — you cannot bind what is already bound.
    if (ev.id === 'Sleep' && tgt === this.enemy && this.isWild() && !this.sleepHintShown) {
      this.sleepHintShown = true;
      lines.push('It sleeps. The core would drink it easy.');
    }
  }

  // Tick one creature's statuses for a trigger and narrate the results.
  // PHASE11: a tick round that drew blood can wake a sleeper — the engine reports it
  // as a `woke` event, narrated in Sleep's own voice.
  tickAndLog(creature, trigger, lines) {
    for (const ev of tickStatuses(creature, trigger)) {
      if (ev.woke) {
        lines.push(statusLine(ev.id, 'wake', creature.name));
        continue;
      }
      if (ev.dmg > 0) lines.push(statusLine(ev.id, 'tick', creature.name, ev.dmg));
      if (ev.expired) lines.push(statusLine(ev.id, 'expire', creature.name));
    }
  }

  // End of a full battle turn (both sides had their action): turnEnd statuses bite the
  // two creatures ON THE FIELD (benched creatures hold, Pokémon-style). Only runs while
  // both sides still stand — a decided battle skips it.
  turnEndTicks(lines) {
    this.tickAndLog(this.active, 'turnEnd', lines);
    this.tickAndLog(this.enemy, 'turnEnd', lines);
    this.checkFrenzy(lines); // a DoT can carry the King across the frenzy line
  }

  // Where the turn lands once everything has resolved. Enemy death wins even if the
  // active fainted to recoil/bleed on the same exchange — the kill counts first.
  turnTerminal() {
    // PHASE12: a felled foe with bench behind it is a beat, not the end of the fight.
    if (this.enemy.hp <= 0) return this.foesRemain() ? () => this.foeFell() : () => this.win();
    if (this.active.hp <= 0) return () => this.activeFainted();
    return () => this.showMain();
  }

  // PHASE12 §2 — a corelock's numen goes down but the duel does not. XP resolves for
  // THIS foe immediately (the same per-defeat award a wild win pays, so a two-numen
  // duel is worth two wins), any evolution beat plays, then the next core comes off
  // the belt. The fallen one is cleansed on the way out — nothing carries over.
  foeFell() {
    const fallen = this.enemy;
    const lines = [`${fallen.name} folds. ${this.duel.name} calls the core back.`];
    const steps = this.awardXp(lines);
    clearStatuses(fallen);
    this.refreshHP();
    this.log(lines, () => this.runSteps(steps, () => this.sendNextFoe()));
  }

  sendNextFoe() {
    this.foeIndex = this.enemyTeam.findIndex((c, i) => i > this.foeIndex && c.hp > 0);
    this.enemy = this.enemyTeam[this.foeIndex];
    markSeen(this.enemy.species); // seen on reveal, one numen at a time
    this.enemySprite.setTexture(`creature-${this.enemy.species}`);
    this.refreshHP();
    this.log([`${this.duel.name} sends out ${this.enemy.name}.`], () => this.showMain());
  }

  // The player's attack: damage, then hit effects (recoil/status), then the attacker's
  // own on-action statuses (Bleed bites as it moves). PHASE9: a power-0 status move
  // skips the damage exchange entirely — it consumes the turn and carries its applies
  // (which always land: chance 1, target self for Calcify) through the same hook.
  playerAttack(move, lines) {
    const me = this.active;
    const enemy = this.enemy;
    if (!this.actGate(me, move, lines)) return; // PHASE11: the onAct hook
    if (!move.power) {
      lines.push(`${me.name} used ${move.name}.`);
      this.applyHitEffects(me, move, 0, enemy, lines);
      this.tickAndLog(me, 'onAction', lines);
      return;
    }
    const d = computeDamage(me, move, enemy);
    enemy.hp = Math.max(0, enemy.hp - d);
    lines.push(this.effLine(me.name, move, enemy, d, false));
    // PHASE11 §2.2 ordering law: the wake fires after damage applies, BEFORE any
    // drain/recoil/status bookkeeping can confuse the order.
    const w = wakeIfDamaged(enemy, d);
    if (w) lines.push(statusLine(w.id, 'wake', enemy.name));
    this.checkFrenzy(lines);
    this.applyHitEffects(me, move, d, enemy, lines);
    this.tickAndLog(me, 'onAction', lines);
  }

  // The enemy attacks the active creature. In boss mode this also triggers Lifedrain.
  // (The greedy AI never picks a power-0 move over a damaging one, but if a wild's
  // whole kit is ever status moves the same PHASE9 branch keeps the turn coherent.)
  enemyStrike(lines) {
    const enemy = this.enemy;
    const em = chooseEnemyMove(enemy, this.active);
    if (!this.actGate(enemy, em, lines)) return; // PHASE11: a slept wild loses its turn too
    if (!em.power) {
      lines.push(`${this.foeLabel()} used ${em.name}.`);
      this.applyHitEffects(enemy, em, 0, this.active, lines);
      this.tickAndLog(enemy, 'onAction', lines);
      return;
    }
    const d = computeDamage(enemy, em, this.active);
    this.active.hp = Math.max(0, this.active.hp - d);
    lines.push(this.effLine(enemy.name, em, this.active, d, this.isWild()));
    // PHASE11 §2.2: wake after damage, before the drain heals or effects roll.
    const w = wakeIfDamaged(this.active, d);
    if (w) lines.push(statusLine(w.id, 'wake', this.active.name));
    this.applyLifedrain(d, lines);
    this.applyHitEffects(enemy, em, d, this.active, lines);
    this.tickAndLog(enemy, 'onAction', lines);
  }

  // PHASE4 Lifedrain — self-contained boss rule. On a successful boss hit it heals a
  // fraction of damage dealt, escalating once the King is at/below 50% HP (feeding
  // frenzy). PHASE7: healing RECEIVED respects the King's statuses — land Rot on it
  // and the drain is halved (the framework's healingMod, not a boss re-tune).
  applyLifedrain(dmg, lines) {
    if (!this.boss || dmg <= 0) return;
    this.checkFrenzy(lines);
    const d = this.enemy.drain;
    const belowHalf = this.enemy.hp <= this.enemy.maxHp * d.threshold;
    const heal = Math.floor((belowHalf ? d.below : d.above) * dmg * healingReceivedMod(this.enemy));
    if (heal > 0) {
      this.enemy.hp = Math.min(this.enemy.maxHp, this.enemy.hp + heal);
      lines.push(`The Barrow-King draws marrow from the wound — heals ${heal}.`);
    }
  }

  // One-time "feeding frenzy" callout the moment the King crosses to <=50% HP.
  checkFrenzy(lines) {
    if (!this.boss || this.frenzy) return;
    if (this.enemy.hp <= this.enemy.maxHp * this.enemy.drain.threshold) {
      this.frenzy = true;
      lines.push('The Barrow-King enters a feeding frenzy — its hunger deepens.');
    }
  }

  resolveMove(move) {
    const me = this.active;
    const enemy = this.enemy;
    const lines = [];

    // A side only takes its action if it still stands after the other's (PHASE3 rule),
    // which now includes falling to recoil or its own Bleed mid-exchange.
    if (playerActsFirst(me, enemy)) {
      this.playerAttack(move, lines);
      if (enemy.hp > 0 && me.hp > 0) this.enemyStrike(lines);
    } else {
      this.enemyStrike(lines);
      if (me.hp > 0 && enemy.hp > 0) this.playerAttack(move, lines);
    }
    if (me.hp > 0 && enemy.hp > 0) this.turnEndTicks(lines);
    this.refreshHP();
    this.log(lines, this.turnTerminal());
  }

  resolveCatch() {
    if (this.boss) {
      // Defeat-only: Catch is a no-op with flavor (PHASE4 §2). No turn cost.
      this.log(['No core can bind the Barrow-King. It is far beyond binding.'], () =>
        this.showMain()
      );
      return;
    }
    if (this.duel) {
      // PHASE12 §2: it is already bound — to him. No turn cost.
      this.log([DUEL_NO_BIND], () => this.showMain());
      return;
    }
    // PHASE13 §3: binding CONSUMES a core, and which tier is the player's call when they
    // hold more than one. No core, no bind — but the never-zero law (hearth top-up)
    // means that state is always one rest away from fixed, and the line says so.
    const cores = heldCores();
    if (!cores.length) {
      this.log(
        ['You reach for a core and close your hand on nothing.',
          'Someone always leaves a few by a hearth. Not here.'],
        () => this.showMain()
      );
      return;
    }
    if (cores.length === 1) {
      this.throwCore(cores[0]);
      return;
    }
    this.showCoreChoice(cores);
  }

  showCoreChoice(cores) {
    this.state = 'menu';
    this.canBack = true;
    this.backFn = () => this.showMain();
    this.promptText.setText('Which core?');
    const opts = cores.map((id) => ({
      label: `${ITEMS[id].name}  ×${itemCount(id)}   ${Math.round(catchChance(this.enemy, ITEMS[id].bindMult) * 100)}% hold`,
      enabled: true,
      onSelect: () => this.throwCore(id),
    }));
    opts.push({ label: '‹ Back', enabled: true, onSelect: () => this.showMain() });
    this.setOptions(opts);
  }

  // Spend the core and throw it. Spent whether it holds or not (§3) — that is what
  // makes cores an economy instead of a button.
  throwCore(coreId) {
    const mult = ITEMS[coreId].bindMult;
    removeItem(coreId, 1);
    const enemy = this.enemy;
    const pct = Math.round(catchChance(enemy, mult) * 100);
    if (rollCatch(enemy, mult)) {
      // A successful bind resolves the encounter -> shared XP to the team that fought.
      // Award BEFORE the newcomer joins so it doesn't earn XP for its own capture.
      const xpLines = [];
      const steps = this.awardXp(xpLines);
      // Joins at full HP (§4.4). PHASE12 §4: it joins with the KIT IT FOUGHT YOU WITH —
      // the learnset-armed moveset, not a blank base kit. A Lv9 Sistern that just tolled
      // your team under does not forget how on the way into the core.
      const caught = armLearnset(makeCreature(enemy.species, enemy.level));
      const where = addCreature(caught);
      markCaught(enemy.species);
      this.refreshHP();
      const msg =
        where === 'box'
          ? `The core holds. The wild ${enemy.name} was bound! Your party is full — it was sent to the box.`
          : `The core holds. The wild ${enemy.name} was bound! It joins your party.`;
      this.log(
        [`You press the ${ITEMS[coreId].name.toLowerCase()} to the wild ${enemy.name}... (${pct}% hold)`, msg, ...xpLines],
        () => this.runSteps(steps, () => this.end({ type: 'caught' }))
      );
    } else {
      // The core is gone either way — §3's whole point. The line says so plainly.
      const lines = [
        `The ${ITEMS[coreId].name.toLowerCase()} flickers, strains — and the ${enemy.name} tears free. The core is spent. (${pct}% hold)`,
      ];
      this.enemyStrike(lines); // failed catch costs your turn (§4.4)
      if (this.active.hp > 0 && this.enemy.hp > 0) this.turnEndTicks(lines);
      this.refreshHP();
      this.log(lines, this.turnTerminal()); // the enemy can bleed out breaking free
    }
  }

  // ---- The bag in battle (PHASE13 §3) --------------------------------------
  // Using an item COSTS THE TURN, exactly like a swap: the enemy gets its free hit and
  // the turn-end ticks run. Battle items land on the ACTIVE numen — reaching the bench
  // mid-fight is what the field menu is for.
  showItems() {
    this.state = 'menu';
    this.canBack = true;
    this.backFn = () => this.showMain();
    this.promptText.setText(`${this.active.name} — use what?`);
    const opts = usableItems('battle').map((id) => {
      const it = ITEMS[id];
      const tag = it.kind === 'core' ? `bind ×${it.bindMult}`
        : it.kind === 'cleanse' ? 'cleanse'
        : `heal ${Math.round(it.healFrac * 100)}%`;
      return {
        label: `${it.name}  ×${itemCount(id)}   · ${tag}`,
        enabled: true,
        onSelect: () => (it.kind === 'core' ? this.throwCore(id) : this.useItemInBattle(id)),
      };
    });
    opts.push({ label: '‹ Back', enabled: true, onSelect: () => this.showMain() });
    this.setOptions(opts);
  }

  useItemInBattle(id) {
    const it = ITEMS[id];
    const me = this.active;
    const lines = [];
    if (!removeItem(id, 1)) return this.showMain(); // bag drifted; never spend what isn't there
    this.applyItemTo(it, me, lines);
    // The turn is spent. From here it is an ordinary exchange.
    if (this.enemy.hp > 0 && me.hp > 0) this.enemyStrike(lines);
    if (me.hp > 0 && this.enemy.hp > 0) this.turnEndTicks(lines);
    this.refreshHP();
    this.log(lines, this.turnTerminal());
  }

  // Shared by battle and field use so a salve means one thing everywhere. Healing
  // RECEIVED respects statuses (Rot halves it) — the Phase-7 framework, not a special
  // case for items.
  applyItemTo(it, target, lines) {
    if (it.healFrac) {
      const heal = Math.max(1, Math.floor(target.maxHp * it.healFrac * healingReceivedMod(target)));
      const before = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + heal);
      lines.push(`${target.name} takes the ${it.name.toLowerCase()} — +${target.hp - before} HP.`);
    }
    if (it.kind === 'cleanse') {
      const had = (target.statuses || []).length;
      clearStatuses(target);
      lines.push(had
        ? `You work the rag over ${target.name}. Whatever had hold of it lets go.`
        : `You wipe ${target.name} down. It was already clean.`);
    }
    // PHASE13 §6: the treat feeds Bond, once per battle-or-rest window. The heal always
    // lands; the loyalty does not stack.
    if (it.bond) {
      const fed = feedTreat(target, it.bond);
      if (fed) lines.push(`${target.name} takes it from your hand without being asked.`);
    }
    return lines;
  }

  resolveSwap(i) {
    const out = this.active;
    const target = GameState.party[i];
    const lines = [];
    this.tickAndLog(out, 'onAction', lines); // retreating is an action — Bleed bites on the way out
    cleanseControl(out); // PHASE11 ledger #18: the swap's turn-cost buys the escape hatch
    this.active = target;
    this.refreshHP();
    lines.push(`You send out ${target.name}.`);
    this.enemyStrike(lines); // swapping costs your turn — enemy's free hit (§4.3), + drain if boss
    if (this.active.hp > 0 && this.enemy.hp > 0) this.turnEndTicks(lines);
    this.refreshHP();
    this.log(lines, this.turnTerminal());
  }

  forcedSwap(i) {
    cleanseControl(this.active); // PHASE11: the fallen carry nothing off the field
    const target = GameState.party[i];
    this.active = target;
    this.refreshHP();
    this.log([`Go, ${target.name}!`], () => this.showMain());
  }

  activeFainted() {
    // PHASE13 §6 (ledger #25): the Wrath ramp — +3 the first time, then +5, +7, +9, +11.
    // Gentle once; cruel if you keep letting it fall. Silent: no number, no line. The
    // party panel's one muted word is the only place any of this surfaces.
    onFaint(this.active);
    const lines = [`${this.active.name} is down.`];
    if (aliveCount() > 0) {
      this.log(lines, () => this.showSwap(true));
    } else {
      lines.push('Your whole team has fallen.');
      // PHASE12 §2: a lost duel is recorded as faithfully as a won one (ledger #26 —
      // the world keeps your record either way), then the blackout runs as always.
      // PHASE13 §2: and it costs. A duel's STAKE (half the purse, min 10, capped by
      // what you carry) REPLACES the 10% wild-wipe law — the purse rides both ways.
      // Never items, never numens. One dry line.
      if (this.duel) {
        recordDuelLoss(this.duel);
        lines.push(...this.duel.lines.lose);
        const lost = duelWipeLoss(this.duel.purse);
        if (lost > 0) lines.push(`You count out the stake — ${lost} gilt. ${gilt()} left.`);
      } else {
        const lost = wildWipeLoss();
        if (lost > 0) lines.push(`Something came off you in the grass — ${lost} gilt, gone.`);
      }
      this.log(lines, () => this.end(this.duel ? { type: 'wipe', duel: this.duel.id } : { type: 'wipe' }));
    }
  }

  // PHASE5 shared XP: every NON-fainted party member gets the FULL award (not split), so a
  // diverse bench levels together. Resolves any level-ups and appends log lines describing
  // the gains + a one-time cap notice. Awards against the current GameState.party — call it
  // BEFORE a freshly-caught creature joins so the newcomer doesn't earn XP for its own catch.
  // PHASE6: returns the ordered post-battle steps (evolution beats, learned-move lines,
  // replace-or-skip prompts) for runSteps to play after the XP lines.
  awardXp(lines) {
    const steps = [];
    const amount = xpForDefeat(this.enemy.level);
    const cap = GameState.levelCap;
    const recipients = GameState.party.filter((c) => c.hp > 0);
    if (recipients.length === 0 || amount <= 0) return steps;
    lines.push(`The team draws power from the fallen — +${amount} XP to each standing member.`);
    for (const c of recipients) {
      const nameBefore = c.name; // narrate the level-up as the form that earned it
      const res = gainCreatureXp(c, amount, cap);
      if (res.levels > 0) {
        const g = res.gains;
        lines.push(
          `${nameBefore} grew to Lv${res.to}!  HP +${g.hp}, Atk +${g.atk}, Mag +${g.mag}, Def +${g.def}, Spd +${g.spd}.`
        );
        if (res.hitCap) lines.push(`${nameBefore} has reached the level cap (Lv${cap}).`);
      }
      for (const ev of res.events) {
        if (ev.kind === 'evolved') markCaught(ev.to); // the compendium knows the new form
        steps.push({ ...ev, creature: c });
      }
    }
    return steps;
  }

  // Play the PHASE6 post-battle steps in order, then `done` (the battle's terminal).
  // Anything that changed a creature (evolution, a learned or replaced move) sets
  // postDirty so the result is autosaved once, before the battle hands back to World.
  runSteps(steps, done) {
    if (steps.length === 0) {
      if (this.postDirty) {
        this.postDirty = false;
        saveGame();
      }
      done();
      return;
    }
    const s = steps.shift();
    const next = () => this.runSteps(steps, done);
    if (s.kind === 'evolved') {
      this.postDirty = true;
      this.playEvolution(s, next);
    } else if (s.kind === 'learned') {
      this.postDirty = true;
      this.log([`${s.creature.name} learned ${s.move.name}!  (${s.move.type} ${s.move.power})`], next);
    } else if (s.kind === 'pending') {
      this.showReplacePrompt(s, next);
    } else {
      next();
    }
  }

  // The evolution beat (PHASE6 §2.1): dim the field, pull the creature center-stage,
  // flicker, swap to the new form's sprite with a pop, then narrate the jump.
  playEvolution(s, next) {
    this.state = 'anim';
    this.clearOptions();
    const W = this.scale.width;
    const fromName = SPECIES[s.from].name;
    const toName = SPECIES[s.to].name;
    const dim = this.add.rectangle(W / 2, 300, W, 600, 0x000000, 0.55).setDepth(12);
    const spr = this.add.sprite(W / 2, 200, `creature-${s.from}`).setScale(3).setDepth(13);
    this.promptText.setText(`What's this? ${fromName} is evolving…`);
    this.tweens.add({
      targets: spr,
      alpha: 0.2,
      yoyo: true,
      repeat: 7,
      duration: 110,
      onComplete: () => {
        spr.setTexture(`creature-${s.to}`).setAlpha(1).setScale(2.4);
        this.cameras.main.flash(200, 46, 36, 24);
        this.tweens.add({
          targets: spr,
          scale: 3.4,
          duration: 300,
          ease: 'Back.Out',
          onComplete: () => {
            const g = s.gains;
            this.log(
              [
                `${fromName} has evolved into ${toName}!`,
                `Its frame surges — HP +${g.hp}, Atk +${g.atk}, Mag +${g.mag}, Def +${g.def}, Spd +${g.spd}. ` +
                  `It can now hold ${speciesSlots(s.to)} moves.`,
              ],
              () => {
                dim.destroy();
                spr.destroy();
                this.refreshHP(); // the active panel picks up the new name/sprite/stats
                next();
              }
            );
          },
        });
      },
    });
  }

  // Replace-or-skip prompt (PHASE6 §2.2): the moveset was full when an innate move came
  // due. Pokémon-style — forget one known move for it, or set it aside.
  showReplacePrompt(s, next) {
    const c = s.creature;
    const m = s.move;
    const slots = speciesSlots(c.species);
    // Defensive: queued state can drift (already known / a slot opened) — resolve quietly.
    if (c.moves.some((x) => x.name === m.name)) return next();
    if (c.moves.length < slots) {
      c.moves.push({ ...m });
      this.postDirty = true;
      this.log([`${c.name} learned ${m.name}!  (${m.type} ${m.power})`], next);
      return;
    }
    this.state = 'menu';
    this.canBack = false;
    this.promptText.setText(
      `${c.name} wants to learn ${m.name} (${m.type} ${m.power}) — but it already holds ${slots} moves.`
    );
    const opts = c.moves.map((old, i) => ({
      label: `Forget ${old.name}   · ${old.type} ${old.power}`,
      enabled: true,
      onSelect: () => {
        const oldName = old.name;
        c.moves[i] = { ...m };
        this.postDirty = true;
        this.log([`${c.name} lets ${oldName} fade — and learns ${m.name}!`], next);
      },
    }));
    opts.push({
      label: `Skip — keep its current moves`,
      enabled: true,
      onSelect: () => this.log([`${c.name} sets ${m.name} aside, unlearned.`], next),
    });
    this.setOptions(opts);
  }

  win() {
    const lines = [
      this.boss
        ? 'The Barrow-King shudders. The hunger goes out of it, and it folds down into still bone.'
        : this.duel
          ? `${this.enemy.name} folds. ${this.duel.name} has nothing left on the belt.`
          : `The wild ${this.enemy.name} collapses into rust and quiet.`,
    ];
    const steps = this.awardXp(lines);
    // PHASE13 §5: loot rolls on a WILD win only. Not on duels — the purse is the reward,
    // and paying twice would make the grind pointless. Not on the boss — the opened
    // threshold IS his drop.
    if (this.isWild()) {
      const enc = this.enemy.encounter || { rarity: 'common', mapId: GameState.position.mapId };
      // PHASE14 §2: a CULL ticks off the event point that already existed — the wild win
      // itself. Duels and the boss never count: a cull is thinning the grass, not
      // settling a score.
      tickWildWin(enc.mapId || GameState.position.mapId, this.enemy);
      const drop = rollLoot(enc);
      applyLoot(drop.awards);
      lines.push(...drop.lines);
    }
    // PHASE12 §2 — the record, then the purse. `duels[id]` is what P13 reads to pay
    // these retroactively and what P15 reads for reputation; write it before anything
    // can go wrong downstream, and persist it here because a plain battle win has
    // never autosaved on its own.
    if (this.duel) {
      recordDuelWin(this.duel);
      // PHASE13 §2: and it PAYS. P12 wrote this path before gilt existed, so the purse
      // was only ever spoken — a duel won after v5 would have said "30 gilt" and handed
      // over nothing. (Caught in the P14 browser pass; the sims never ran the scene.)
      // The retro payout cannot double up: its latch is already set by New Game or by
      // the migration long before any live duel can be won.
      addGilt(this.duel.purse);
      lines.push(...this.duel.lines.win, purseLine(this.duel.purse));
      saveGame();
    }
    this.refreshHP(); // reflect any level-up (grown HP pool / new Lv) on the active's panel
    this.log(lines, () =>
      this.runSteps(steps, () =>
        this.end(
          this.boss
            ? { type: 'win', boss: true }
            : this.duel
              ? { type: 'win', duel: this.duel.id }
              : { type: 'win' }
        )
      )
    );
  }

  resolveRun() {
    if (this.duel) {
      // PHASE12 §2: you agreed to this. No turn cost — the door simply isn't there.
      this.log([DUEL_NO_FLEE], () => this.showMain());
      return;
    }
    this.log(['You slip back through the grass and get away clean.'], () =>
      this.end({ type: 'run' })
    );
  }

  end(result) {
    this.state = 'done';
    // PHASE13 §6: a battle resolved in your favour by numens that were still standing
    // at the end of it. Bond +2 each, and the faint streak resets — the ramp measures a
    // RUN of neglect, not a lifetime total. A creature that fell during the fight gets
    // neither; it is at 0 HP and already took its Wrath.
    if (result.type === 'win' || result.type === 'caught') {
      for (const c of GameState.party) {
        if (c.hp > 0) {
          onWinStanding(c);
          onSurvivedBattle(c);
        }
      }
    }
    // PHASE7: statuses are battle-only — clear every combatant on the way out (win,
    // catch, run, or wipe alike), so nothing lingers into the world or the save.
    for (const c of GameState.party) clearStatuses(c);
    for (const c of this.enemyTeam) clearStatuses(c); // PHASE12: the whole bench, not just the one on the field
    this.onEnd(result);
    this.scene.resume('World');
    this.scene.stop();
  }

  // ---- Message queue -----------------------------------------------------
  log(lines, after) {
    this.msgQueue = [...lines];
    this.afterMsg = after || null;
    this.state = 'message';
    this.clearOptions();
    this.showNextMsg();
  }

  showNextMsg() {
    if (this.msgQueue.length === 0) {
      const cb = this.afterMsg;
      this.afterMsg = null;
      if (cb) cb();
      return;
    }
    this.promptText.setText(this.msgQueue.shift());
  }

  // ---- Input -------------------------------------------------------------
  justInteract() {
    return (
      Phaser.Input.Keyboard.JustDown(this.keys.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.enter)
    );
  }
  justUp() {
    return Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w);
  }
  justDown() {
    return (
      Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s)
    );
  }
  justBack() {
    return (
      Phaser.Input.Keyboard.JustDown(this.keys.esc) || Phaser.Input.Keyboard.JustDown(this.keys.back)
    );
  }

  update() {
    if (this.state === 'done' || this.state === 'anim') return; // anim: evolution beat owns the stage
    if (this.state === 'message') {
      if (this.justInteract()) this.showNextMsg();
      return;
    }
    // menu-like state
    if (this.justUp()) this.moveSel(-1);
    else if (this.justDown()) this.moveSel(1);
    else if (this.justInteract()) this.confirm();
    else if (this.justBack() && this.canBack) this.backFn && this.backFn();
  }
}
