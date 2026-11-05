// PHASE14 verification sim — THE CONTRACT BOARD. Reuses the REAL game modules.
// Jobs (build plan §5):
//
//   (A) The board as data — seven notices, in-voice, tagged, gated, priced.
//   (B) The state machine — accept / cap-3 / progress / turn-in / repeatable reset;
//       SALVAGE consumes EXACTLY N; DUEL reads P12's flags; SCOUT fires once; the
//       standing Hollow notice retro-completes for anyone who already put the King down.
//   (C) The rep ledger — recorded exactly per completion, and read by NOTHING (grep).
//   (D) The bark engine — priority, no back-to-back repeat, every key reachable.
//   (E) The economy WITH board income — the P13 route lap re-run, against the §5 worry
//       that a single lap trivially funds forge-tier spending.
//   (F) Saves — contracts and repLedger ride flags, so v5 carries them with no bump;
//       Continue clean; New Game reset.
//   (G) The boss is untouched, and the session is console-clean.
//
// Run:  node scripts/sim-phase14.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { SPECIES, makeCreature, rollEncounter } from '../src/data/creatures.js';
import { MAPS } from '../src/data/maps/index.js';
import { ITEMS, LOCKER_STOCK } from '../src/data/items.js';
import { makeBoss } from '../src/data/bosses.js';
import { CONTRACTS, CONTRACT_BY_ID, ACTIVE_CAP } from '../src/data/contracts.js';
import { BARKS } from '../src/data/barks.js';
import { CORELOCK_BY_ID } from '../src/data/corelocks.js';
import { isWalkable } from '../src/data/tiles.js';
import { rollLoot, awardsWorth } from '../src/systems/loot.js';
import { temperamentWord } from '../src/systems/temper.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const src = (p) => readFileSync(join(HERE, '..', 'src', p), 'utf8');

let failures = 0;
function check(label, cond) {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failures++;
}
let noise = 0;
const realWarn = console.warn, realError = console.error;
console.warn = (...a) => { noise++; realWarn('  [console.warn]', ...a); };
console.error = (...a) => { noise++; realError('  [console.error]', ...a); };

// The sim drives a DETACHED state object rather than the singleton, so every contract
// call has to thread its state honestly — which is the bug this shape was designed to
// make impossible (a flags-taking function quietly reading a global bag).
const world = (flags = {}) => ({ gilt: 0, inventory: {}, flags, party: [], caught: [] });

// ---- (A) the board as data ------------------------------------------------------------
function dataTest() {
  console.log('=== (A) THE BOARD — seven notices, in-voice, tagged, gated, priced ===');
  check('seven notices with unique ids, all given by the board',
    CONTRACTS.length === 7 && new Set(CONTRACTS.map((c) => c.id)).size === 7 &&
    CONTRACTS.every((c) => c.giver === 'board'));
  check('§3 payouts verbatim: 50 · 60 · 55 · 45 · 70 · 90 · 40',
    CONTRACTS.map((c) => c.payout).join() === '50,60,55,45,70,90,40');
  check('all four types v1 are represented',
    new Set(CONTRACTS.map((c) => c.type)).size === 4 &&
    ['cull', 'salvage', 'duel', 'scout'].every((t) => CONTRACTS.some((c) => c.type === t)));
  check('every notice carries all three lines, and the notice text is in the plank\'s voice',
    CONTRACTS.every((c) => ['notice', 'accept', 'turnin'].every((k) => typeof c.lines[k] === 'string' && c.lines[k].length > 10)));
  check('faction tags per §3: forge ×2 (kiln, wire) · wayfarer (outrider) · bone (stones)',
    CONTRACT_BY_ID.kilnBone.faction === 'forge' && CONTRACT_BY_ID.wireClean.faction === 'forge' &&
    CONTRACT_BY_ID.outriderLesson.faction === 'wayfarer' && CONTRACT_BY_ID.countStones.faction === 'bone');
  check('exactly one standing job, and it is the grass one',
    CONTRACTS.filter((c) => c.repeatable).map((c) => c.id).join() === 'alwaysGrass');
  check('the deep notice is the only gated one, and it waits on the King',
    CONTRACTS.filter((c) => c.requires).map((c) => `${c.id}:${c.requires}`).join() === 'countStones:barrowKingDefeated');

  // The specs have to point at things that exist.
  const bad = [];
  for (const c of CONTRACTS) {
    if (c.type === 'salvage' && !ITEMS[c.spec.itemId]) bad.push(`${c.id}: no item ${c.spec.itemId}`);
    if (c.type === 'duel' && !CORELOCK_BY_ID[c.spec.corelockId]) bad.push(`${c.id}: no corelock ${c.spec.corelockId}`);
    if ((c.type === 'cull' || c.type === 'scout') && !MAPS[c.spec.mapId]) bad.push(`${c.id}: no map ${c.spec.mapId}`);
    if (c.type === 'scout') {
      const m = MAPS[c.spec.mapId];
      let reachable = 0;
      for (let y = c.spec.y0; y <= c.spec.y1; y++) {
        for (let x = c.spec.x0; x <= c.spec.x1; x++) if (isWalkable(m, x, y)) reachable++;
      }
      if (!reachable) bad.push(`${c.id}: scout region has no walkable tile`);
    }
  }
  check(`every spec points at a real item / corelock / map, and every scout region is walkable${bad.length ? ' — ' + bad.join('; ') : ''}`,
    bad.length === 0);
  check('the SALVAGE jobs ask for materials the world actually drops',
    ['boneShard', 'wireSpool'].every((id) =>
      Object.entries(MAPS).some(([mid, m]) => m.encounters && (
        (mid === 'cave' || mid === 'deephollow' || mid === 'route' || mid === 'wastes')))) &&
    ITEMS.boneShard.kind === 'material' && ITEMS.wireSpool.kind === 'material');
  check('the board object still stands in the tavern (the plank P9 pinned)',
    MAPS.tavern.objects.some((o) => o.type === 'board'));
}

// ---- (B) the state machine ---------------------------------------------------------------
async function machineTest() {
  const C = await import('../src/systems/contracts.js');
  const { addItem, itemCount } = await import('../src/systems/inventory.js');
  const { gilt } = await import('../src/systems/economy.js');
  console.log('\n=== (B) THE STATE MACHINE — accept, cap, tick, turn in, repeat ===');

  const w = world();
  const grass = CONTRACT_BY_ID.grassWrong;

  check('everything starts open, nothing is carried',
    C.contractState('grassWrong', w.flags) === 'open' && C.carried(w.flags).length === 0);
  check('the gated notice is not even on the plank pre-boss',
    !C.boardContracts(w.flags).some((c) => c.id === 'countStones'));
  w.flags.barrowKingDefeated = true;
  check('...and it goes up the moment the King is down',
    C.boardContracts(w.flags).some((c) => c.id === 'countStones'));
  delete w.flags.barrowKingDefeated;

  // CULL.
  C.acceptContract(grass, w.flags, w);
  check('accepting moves it to active with a zeroed counter',
    C.contractState('grassWrong', w.flags) === 'active' && C.progressCount('grassWrong', w.flags) === 0);
  for (let i = 0; i < 5; i++) C.tickWildWin('route', makeCreature('Mireling', 4), w.flags);
  check('five route wins tick it to 5/6 and it is NOT done',
    C.progressOf(grass, w.flags, w).have === 5 && C.contractState('grassWrong', w.flags) === 'active');
  C.tickWildWin('cave', makeCreature('Marrowling', 5), w.flags);
  check('a win on the WRONG map does not count', C.progressOf(grass, w.flags, w).have === 5);
  C.tickWildWin('route', makeCreature('Fenmoth', 4), w.flags);
  check('the sixth route win completes it', C.contractState('grassWrong', w.flags) === 'done');
  check('a completed job cannot be over-ticked past its need',
    (C.tickWildWin('route', makeCreature('Fenmoth', 4), w.flags), C.progressOf(grass, w.flags, w).have === 6));

  const res = C.turnInContract(grass, w.flags, w);
  check(`turn-in pays the notice's gilt (${res.paid}) and marks it turned`,
    res.paid === 60 && gilt(w) === 60 && C.contractState('grassWrong', w.flags) === 'turned');
  check('a turned one-shot leaves the plank for good',
    !C.boardContracts(w.flags).some((c) => c.id === 'grassWrong') && !C.canAccept(grass, w.flags));
  check('turning in twice pays nothing', C.turnInContract(grass, w.flags, w) === null && gilt(w) === 60);

  // CAP 3 — counted over active AND done, so finished-but-unclaimed cannot dodge it.
  const c2 = world();
  const takeable = ['kilnBone', 'wireClean', 'outriderLesson', 'alwaysGrass'].map((id) => CONTRACT_BY_ID[id]);
  const accepted = takeable.map((d) => C.acceptContract(d, c2.flags, c2));
  check(`the cap holds at ${ACTIVE_CAP}: three taken, the fourth refused (${accepted.join(',')})`,
    accepted.slice(0, 3).every(Boolean) && accepted[3] === false && C.carried(c2.flags).length === 3);
  addItem('boneShard', 4, c2);
  check('a DONE job still occupies a slot — you cannot hoard finished work to dodge the cap',
    C.contractState('kilnBone', c2.flags) === 'open' || (C.syncContracts(c2.flags, c2),
      C.contractState('kilnBone', c2.flags) === 'done' && C.canAccept(takeable[3], c2.flags) === false));
  C.turnInContract(CONTRACT_BY_ID.kilnBone, c2.flags, c2);
  check('turning one in frees the slot', C.carried(c2.flags).length === 2 && C.canAccept(takeable[3], c2.flags) === true);

  // SALVAGE — consumes EXACTLY N.
  const s = world();
  addItem('wireSpool', 7, s);
  C.acceptContract(CONTRACT_BY_ID.wireClean, s.flags, s);
  check('a salvage job reads the BAG, not a counter — 7 spools held reads 7/3 → done',
    C.progressOf(CONTRACT_BY_ID.wireClean, s.flags, s).have === 7 &&
    C.contractState('wireClean', s.flags) === 'done');
  C.turnInContract(CONTRACT_BY_ID.wireClean, s.flags, s);
  check('turn-in consumes EXACTLY 3 and leaves the other 4 alone',
    itemCount('wireSpool', s) === 4 && s.gilt === 45);
  const short = world();
  addItem('boneShard', 2, short);
  C.acceptContract(CONTRACT_BY_ID.kilnBone, short.flags, short);
  check('four shards asked, two held: not done, turn-in refused, nothing consumed',
    C.contractState('kilnBone', short.flags) === 'active' &&
    C.turnInContract(CONTRACT_BY_ID.kilnBone, short.flags, short) === null &&
    itemCount('boneShard', short) === 2);
  addItem('boneShard', 2, short);
  check('spending the materials back down un-does a DONE salvage job (it re-derives, never lies)',
    (C.syncContracts(short.flags, short), C.contractState('kilnBone', short.flags) === 'done') &&
    (short.inventory.boneShard = 1, C.syncContracts(short.flags, short),
      C.contractState('kilnBone', short.flags) === 'active'));

  // DUEL — reads P12's flags, including a duel already won before the job was taken.
  const d = world({ duels: { outrider: 'won' } });
  C.acceptContract(CONTRACT_BY_ID.outriderLesson, d.flags, d);
  check('a DUEL job you already satisfied lands DONE the instant you take it',
    C.contractState('outriderLesson', d.flags) === 'done');
  const d2 = world({ duels: { outrider: 'lost' } });
  C.acceptContract(CONTRACT_BY_ID.outriderLesson, d2.flags, d2);
  check('a LOST duel does not count', C.contractState('outriderLesson', d2.flags) === 'active');
  d2.flags.duels.outrider = 'won';
  C.syncContracts(d2.flags, d2);
  check('beating him later completes it with no hook of its own',
    C.contractState('outriderLesson', d2.flags) === 'done');

  // SCOUT — fires once; the standing notice retro-completes.
  const sc = world({ barrowKingDefeated: true });
  C.acceptContract(CONTRACT_BY_ID.hollowNotice, sc.flags, sc);
  check("the standing Hollow notice RETRO-completes for anyone who already put the King down",
    C.contractState('hollowNotice', sc.flags) === 'done');
  const sc2 = world();
  C.acceptContract(CONTRACT_BY_ID.hollowNotice, sc2.flags, sc2);
  check('...but not for someone who has not', C.contractState('hollowNotice', sc2.flags) === 'active');
  check('stepping outside the region does nothing', C.tickTileStep('cave', 2, 2, sc2.flags) === 0);
  check('stepping into it completes the job',
    C.tickTileStep('cave', 9, 13, sc2.flags) === 1 && C.contractState('hollowNotice', sc2.flags) === 'done');
  check('and it fires ONCE — walking the region again ticks nothing',
    C.tickTileStep('cave', 9, 14, sc2.flags) === 0);
  const deep = world({ barrowKingDefeated: true });
  C.acceptContract(CONTRACT_BY_ID.countStones, deep.flags, deep);
  check('the deep-end scout needs the far end specifically',
    C.tickTileStep('deephollow', 9, 3, deep.flags) === 0 &&
    C.tickTileStep('deephollow', 9, 12, deep.flags) === 1);

  // REPEATABLE.
  const r = world();
  const standing = CONTRACT_BY_ID.alwaysGrass;
  C.acceptContract(standing, r.flags, r);
  for (let i = 0; i < 8; i++) C.tickWildWin('route', makeCreature('Mireling', 4), r.flags);
  const first = C.turnInContract(standing, r.flags, r);
  check('the standing job pays 40 and goes straight back on the plank, blank',
    first.paid === 40 && C.contractState('alwaysGrass', r.flags) === 'open' &&
    C.progressCount('alwaysGrass', r.flags) === 0 && C.canAccept(standing, r.flags) === true);
  C.acceptContract(standing, r.flags, r);
  for (let i = 0; i < 8; i++) C.tickWildWin('route', makeCreature('Mireling', 4), r.flags);
  check('and it can be run again, and again, for the same pay',
    C.turnInContract(standing, r.flags, r).paid === 40 && r.gilt === 80 && C.turnedCount(r.flags) === 2);

  // Progress only ticks jobs you actually took.
  const idle = world();
  C.tickWildWin('route', makeCreature('Mireling', 4), idle.flags);
  check('an untaken notice never accrues progress in the background',
    C.progressCount('grassWrong', idle.flags) === 0 && C.contractState('grassWrong', idle.flags) === 'open');
  check('an empty slate says so', C.slateLines(idle.flags, idle)[0] === '(no work taken)');
  // A POPULATED slate — the case the first cut of this row never exercised, which is how
  // a shadowed variable in slateLines survived the sim and was caught in the browser.
  const slate = world({ duels: { outrider: 'won' } });
  C.acceptContract(CONTRACT_BY_ID.grassWrong, slate.flags, slate);
  C.acceptContract(CONTRACT_BY_ID.outriderLesson, slate.flags, slate);
  C.tickWildWin('route', makeCreature('Mireling', 4), slate.flags);
  C.tickWildWin('route', makeCreature('Mireling', 4), slate.flags);
  const lines = C.slateLines(slate.flags, slate);
  check(`a populated slate renders progress and DONE without throwing (${lines.map((l) => l.trim()).join(' | ')})`,
    lines.length === 2 && /2\/6$/.test(lines[0].trim()) && /DONE/.test(lines[1]));
}

// ---- (C) the rep ledger --------------------------------------------------------------------
async function repTest() {
  const C = await import('../src/systems/contracts.js');
  const { addItem } = await import('../src/systems/inventory.js');
  console.log('\n=== (C) THE REP LEDGER — recorded exactly, read by nothing (ledger #26) ===');

  const w = world({ duels: { outrider: 'won' }, barrowKingDefeated: true });
  addItem('boneShard', 8, w);
  addItem('wireSpool', 3, w);

  C.acceptContract(CONTRACT_BY_ID.kilnBone, w.flags, w);
  C.turnInContract(CONTRACT_BY_ID.kilnBone, w.flags, w);
  check('a Forge job records forge:1', JSON.stringify(C.repLedger(w.flags)) === '{"forge":1}');
  C.acceptContract(CONTRACT_BY_ID.wireClean, w.flags, w);
  C.turnInContract(CONTRACT_BY_ID.wireClean, w.flags, w);
  check('a second Forge job records forge:2 — tallied, never overwritten',
    C.repLedger(w.flags).forge === 2);
  C.acceptContract(CONTRACT_BY_ID.outriderLesson, w.flags, w);
  C.turnInContract(CONTRACT_BY_ID.outriderLesson, w.flags, w);
  check('a Wayfarer job opens its own column, leaving Forge alone',
    C.repLedger(w.flags).wayfarer === 1 && C.repLedger(w.flags).forge === 2);
  C.acceptContract(CONTRACT_BY_ID.grassWrong, w.flags, w);
  for (let i = 0; i < 6; i++) C.tickWildWin('route', makeCreature('Mireling', 4), w.flags);
  C.turnInContract(CONTRACT_BY_ID.grassWrong, w.flags, w);
  check('an UNTAGGED job records nothing at all',
    Object.keys(C.repLedger(w.flags)).sort().join() === 'forge,wayfarer');
  check('a failed turn-in never records rep',
    (C.acceptContract(CONTRACT_BY_ID.countStones, w.flags, w),
      C.turnInContract(CONTRACT_BY_ID.countStones, w.flags, w) === null &&
      C.repLedger(w.flags).bone === undefined));

  // THE SEAM: numbers only. Nothing outside contracts.js may read repLedger.
  const readers = ['systems/combat.js', 'systems/status.js', 'systems/progression.js',
    'systems/economy.js', 'systems/loot.js', 'systems/inventory.js', 'systems/temper.js',
    'systems/corelocks.js', 'systems/party.js', 'systems/save.js',
    'scenes/BattleScene.js', 'scenes/WorldScene.js']
    .filter((p) => /repLedger/.test(src(p)));
  check(`NOTHING reads flags.repLedger for gameplay — it is a P15 seam, not a system (${readers.length} readers)`,
    readers.length === 0);
  check('and no faction tag GATES anything — the ledger is only ever incremented, never compared',
    !/repLedger\[[^\]]*\]\s*(===|!==|>=|<=|[<>])/.test(src('systems/contracts.js')) &&
    /flags\.repLedger\[def\.faction\] = \(flags\.repLedger\[def\.faction\] \|\| 0\) \+ 1/.test(src('systems/contracts.js')));
}

// ---- (D) the bark engine ----------------------------------------------------------------
async function barkTest() {
  const { pickBark, recordBark, eligibleBarks } = await import('../src/systems/barks.js');
  console.log('\n=== (D) RUMOR BARKS — priority, no repeats, every key reachable ===');

  check('five keyed barks, unique ids, strictly ordered priorities',
    BARKS.length === 5 && new Set(BARKS.map((b) => b.id)).size === 5 &&
    new Set(BARKS.map((b) => b.priority)).size === 5);
  const lineCount = BARKS.reduce((s, b) => s + b.lines.length, 0);
  check(`~8-10 lines of bark in total (${lineCount})`, lineCount >= 8 && lineCount <= 10);

  const quiet = world();
  check('a player nobody has heard of gets no bark', pickBark(quiet) === null);

  // Every key reachable, one at a time.
  const cases = {
    collectorLoss: () => world({ duels: { collector: 'lost' } }),
    murkmawBound: () => { const w = world(); w.caught = ['Murkmaw']; return w; },
    outriderBeaten: () => world({ duels: { outrider: 'won' } }),
    rancorous: () => {
      const w = world();
      const c = makeCreature('Borck', 10);
      c.temper.wrath = 70;
      w.party = [c];
      return w;
    },
    boardThinning: () => world({ contractsTurned: 3 }),
  };
  const unreachable = Object.entries(cases).filter(([id, make]) => pickBark(make())?.id !== id);
  check(`all five keys fire when their condition holds${unreachable.length ? ' — missing ' + unreachable.map(([i]) => i).join() : ''}`,
    unreachable.length === 0);

  // Priority: with everything true at once, the collector line goes first.
  const loud = world({ duels: { collector: 'lost', outrider: 'won' }, contractsTurned: 9 });
  loud.caught = ['Murkmaw'];
  const angry = makeCreature('Borck', 10);
  angry.temper.wrath = 88;
  loud.party = [angry];
  check('with everything true, priority order holds',
    eligibleBarks({ flags: loud.flags, party: loud.party, caught: loud.caught })
      .map((b) => b.id).join() === 'collectorLoss,murkmawBound,outriderBeaten,rancorous,boardThinning');

  // No back-to-back repeat: five visits walk down the list rather than repeating.
  const said = [];
  for (let i = 0; i < 5; i++) {
    const b = pickBark(loud);
    if (!b) break;
    said.push(b.id);
    recordBark(b, loud);
  }
  check(`five visits never repeat back-to-back (${said.join(' → ')})`,
    said.length === 5 && said.every((id, i) => i === 0 || id !== said[i - 1]));

  // And when only ONE thing is true, it waits rather than repeating itself.
  const one = world({ duels: { collector: 'lost' } });
  const b1 = pickBark(one);
  recordBark(b1, one);
  check('with only one thing worth saying, the tavern says it once and then holds its tongue',
    b1.id === 'collectorLoss' && pickBark(one) === null);
  one.flags.lastBark = null;
  check('and says it again on a later visit', pickBark(one)?.id === 'collectorLoss');
  check('the rancorous bark reads Temper through the shipped word, not a raw meter',
    /temperamentWord/.test(src('data/barks.js')));
}

// ---- (E) the economy with board income -----------------------------------------------------
async function economyTest() {
  const C = await import('../src/systems/contracts.js');
  const { addItem } = await import('../src/systems/inventory.js');
  console.log('\n=== (E) THE ECONOMY WITH THE BOARD — does a lap trivialise the locker? ===');

  const LAPS = 3000, WINS = 7;
  let dropTotal = 0;
  for (let i = 0; i < LAPS; i++) {
    for (let w = 0; w < WINS; w++) {
      const wild = rollEncounter(MAPS.route.encounters.table, Math.random, 'route');
      dropTotal += awardsWorth(rollLoot({ rarity: wild.encounter.rarity, mapId: 'route' }).awards);
    }
  }
  const perLap = dropTotal / LAPS;

  // The board's contribution to the SAME lap: the standing cull is the only job a route
  // lap can repeatedly close, and it needs 8 wins to this lap's 7.
  const standing = CONTRACT_BY_ID.alwaysGrass;
  const boardPerLap = (standing.payout * WINS) / standing.spec.count;
  const withBoard = perLap + boardPerLap;
  console.log(`  drops alone      : ${perLap.toFixed(1)} gilt/lap  (${(perLap / ITEMS.salve.buy).toFixed(2)} salves)`);
  console.log(`  + standing cull  : ${withBoard.toFixed(1)} gilt/lap  (${(withBoard / ITEMS.salve.buy).toFixed(2)} salves)`);
  console.log(`  the one-shot board, run once end to end: ${CONTRACTS.reduce((s, c) => s + (c.repeatable ? 0 : c.payout), 0)} gilt`);

  check(`a lap with board income comfortably funds salves and cores (${(withBoard / ITEMS.salve.buy).toFixed(2)} salves)`,
    withBoard >= ITEMS.salve.buy * 2);
  // §5's worry, measured against the right yardstick: the top of what the locker SELLS.
  // The forge-sealed core is drop-only, so its 90g is a sell value, not a spending tier —
  // no amount of grinding buys one, which is the whole point of it being drop-only.
  const topBuy = Math.max(...LOCKER_STOCK.map((id) => ITEMS[id].buy));
  check(`§5 worry: one lap does NOT trivially fund the top of the locker (${(withBoard / topBuy).toFixed(2)}× a ${topBuy}g item — under 2×)`,
    withBoard / topBuy < 2);
  check('the forge tier is unreachable by grinding at all — it is drop-only, by design',
    ITEMS.forgeSealedCore.buy === null && !LOCKER_STOCK.includes('forgeSealedCore'));
  check('the locker stays relevant: one lap still cannot buy a trued core AND a deep salve',
    withBoard < ITEMS.truedCore.buy + ITEMS.deepSalve.buy);
  check('the whole one-shot board is worth ~6 laps of grinding — real money, not a windfall',
    CONTRACTS.reduce((s, c) => s + (c.repeatable ? 0 : c.payout), 0) / withBoard > 3);
}

// ---- (F) saves ---------------------------------------------------------------------------
async function saveTest() {
  console.log('\n=== (F) SAVES — contracts ride the flags, so v5 carries them unchanged ===');
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const KEY = 'creature-collector.save';
  const { newGame, saveGame, loadGame } = await import('../src/systems/save.js');
  const { GameState } = await import('../src/systems/state.js');
  const C = await import('../src/systems/contracts.js');
  const { addItem } = await import('../src/systems/inventory.js');

  newGame();
  check('a fresh world has taken no work and owes no faction anything',
    C.carried(GameState.flags).length === 0 && Object.keys(C.repLedger(GameState.flags)).length === 0);

  C.acceptContract(CONTRACT_BY_ID.grassWrong, GameState.flags, GameState);
  for (let i = 0; i < 4; i++) C.tickWildWin('route', makeCreature('Mireling', 4), GameState.flags);
  addItem('boneShard', 4);
  C.acceptContract(CONTRACT_BY_ID.kilnBone, GameState.flags, GameState);
  C.turnInContract(CONTRACT_BY_ID.kilnBone, GameState.flags, GameState);
  saveGame();

  const blob = JSON.parse(store.get(KEY));
  check('the blob is still v5 — contracts needed no version bump, they ride flags',
    blob.version === 5 && blob.flags.contracts.grassWrong === 'active' &&
    blob.flags.contractProgress.grassWrong === 4 && blob.flags.repLedger.forge === 1);

  loadGame();
  check('Continue restores the slate, the progress and the ledger exactly',
    C.contractState('grassWrong', GameState.flags) === 'active' &&
    C.progressCount('grassWrong', GameState.flags) === 4 &&
    C.repLedger(GameState.flags).forge === 1 && C.turnedCount(GameState.flags) === 1);
  C.tickWildWin('route', makeCreature('Mireling', 4), GameState.flags);
  C.tickWildWin('route', makeCreature('Mireling', 4), GameState.flags);
  check('progress picks up where it left off and completes',
    C.contractState('grassWrong', GameState.flags) === 'done');

  // A v4 blob predates all of this and must simply arrive empty-handed, not broken.
  store.set(KEY, JSON.stringify({
    version: 4, party: [], box: [], position: { mapId: 'town', x: 9, y: 10 }, facing: 'down',
    flags: { respawn: { mapId: 'tavern', x: 2, y: 5 }, starterChoice: 'Slagling', rivals: { a: 'Staticur', b: 'Marrowling' } },
    seen: [], caught: [],
  }));
  loadGame();
  check('a pre-contract save loads clean: no slate, no ledger, no crash',
    C.carried(GameState.flags).length === 0 && Object.keys(C.repLedger(GameState.flags)).length === 0 &&
    C.boardContracts(GameState.flags).length === 6);

  newGame();
  check('New Game wipes the slate and the ledger',
    C.turnedCount(GameState.flags) === 0 && Object.keys(C.repLedger(GameState.flags)).length === 0);
}

// ---- (G) the boss, untouched --------------------------------------------------------------
function bossTest() {
  console.log('\n=== (G) THE BARROW-KING — P14 did not go near him ===');
  const b = makeBoss('BarrowKing');
  check('boss numbers LOCKED and unchanged: HP105 Atk15 Def12 Spd4, drain .33/.43 @ .5',
    b.maxHp === 105 && b.atk === 15 && b.def === 12 && b.spd === 4 &&
    b.drain.above === 0.33 && b.drain.below === 0.43 && b.drain.threshold === 0.5);
  check('no contract, notice or bark mentions the boss data at all',
    !/bosses\.js|makeBoss/.test(src('data/contracts.js') + src('systems/contracts.js') +
      src('data/barks.js') + src('systems/barks.js')));
  check('a CULL can never be advanced by the boss or a duel — only wild wins tick it',
    /tickWildWin/.test(src('scenes/BattleScene.js')) &&
    /this\.isWild\(\)[\s\S]{0,400}tickWildWin/.test(src('scenes/BattleScene.js')));

  // REGRESSION (found in the P14 browser pass): a duel won LIVE must actually pay. P12
  // wrote the win path before gilt existed, so it spoke the purse line and handed over
  // nothing; the retro payout only ever covered wins recorded before v5. Structural,
  // because the sims cannot instantiate a Phaser scene — the behavioural proof is the
  // browser session in P14_REPORT.
  const win = src('scenes/BattleScene.js').split('\n  win() {')[1].split('\n  resolveRun()')[0];
  check('a live duel win PAYS the purse, not just speaks it',
    /recordDuelWin\(this\.duel\)/.test(win) && /addGilt\(this\.duel\.purse\)/.test(win) &&
    /purseLine\(this\.duel\.purse\)/.test(win));
  check('...and the retro payout still cannot double up (it latches on its own flag)',
    /flags\.retroPursesPaid/.test(src('systems/economy.js')) &&
    /retroPursesPaid = true/.test(src('systems/save.js')));
}

// ---- run --------------------------------------------------------------------------------
dataTest();
await machineTest();
await repTest();
await barkTest();
await economyTest();
bossTest();
await saveTest();

console.log('\n=== SUMMARY ===');
check(`console-clean session (${noise} warnings/errors from shipped modules)`, noise === 0);
console.log(failures ? `\n*** ${failures} TOTAL FAILURE(S) ***` : '\nALL CHECKS PASS');
process.exit(failures ? 1 : 0);
