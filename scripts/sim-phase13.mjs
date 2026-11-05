// PHASE13 verification sim — GILT, THE FIELD KIT & TEMPER v0. Reuses the REAL modules.
// Jobs (build plan §7):
//
//   (A) The kit as data — six carried items, four materials, one treat; the locker's
//       stock; the drop-only core; the never-zero law's constants.
//   (B) Gilt & the wipe laws — 10% on a wild wipe, the duel STAKE that replaces it,
//       never below zero, never items, never numens.
//   (C) Catch curves — the P11 sleep-bind table re-emitted × {rough, trued, forge-sealed},
//       the cap holding over the product, and trued+Sleep at half HP pinned to 0.9.
//   (D) The loot engine — 10k rolls per tier against the table weights (χ²), never a
//       dead drop, and every reserved-class roll resolving to the fallback bundle.
//   (E) The economy loop — a scripted route lap in salves, against the §7 band.
//   (F) Temper v0 — a scripted 25-battle session traced meter by meter, the escalating
//       faint ramp, streak resets, the treat window, and the four temperament words.
//       Plus the one that matters: NOTHING reads any of it.
//   (G) The item-budget boss rows — the Barrow-King at budgets {0, 2 salves, 2 deep
//       salves}. His numbers are LOCKED: the 0-budget bars must reproduce P12's, and if
//       items flip a locked row the lever is price/stock, never his stats.
//   (H) Saves — v4→v5 migration granting the kit and paying P12's purses EXACTLY once,
//       Continue clean, New Game reset.
//   (I) Session hygiene — buy / sell / throw / eat, console-clean.
//
// Run:  node scripts/sim-phase13.mjs

import { SPECIES, makeCreature, armLearnset, rollEncounter, gainCreatureXp } from '../src/data/creatures.js';
import { MOVES, mv } from '../src/data/moves.js';
import { STATUSES } from '../src/data/statuses.js';
import { makeBoss } from '../src/data/bosses.js';
import { MAPS } from '../src/data/maps/index.js';
import {
  ITEMS, ITEM_IDS, LOCKER_STOCK, CORE_IDS, MATERIAL_IDS, STARTING_KIT,
  BASELINE_CORE, HEARTH_CORE_FLOOR, coresByTier,
} from '../src/data/items.js';
import { LOOT_TABLES, RESERVED_CLASSES, RESERVED_FALLBACK, MAP_MATERIALS } from '../src/data/loot.js';
import { CORELOCK_BY_ID } from '../src/data/corelocks.js';
import { computeDamage, playerActsFirst, chooseEnemyMove, charmSelfDamage, catchChance } from '../src/systems/combat.js';
import {
  applyStatus, tryApplyStatus, resolveApplyTarget, resolveAction, wakeIfDamaged,
  cleanseControl, tickStatuses, clearStatuses, hasStatus, healingReceivedMod,
} from '../src/systems/status.js';
import { xpToNext } from '../src/systems/progression.js';
import {
  onFaint, onWinStanding, onSurvivedBattle, feedTreat, openTreatWindow, hearthRest,
  temperamentWord, freshTemper, ensureTemper,
} from '../src/systems/temper.js';
import { rollLoot, applyLoot, awardsWorth, materialsFor } from '../src/systems/loot.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const src = (p) => readFileSync(join(HERE, '..', 'src', p), 'utf8');

let failures = 0;
function check(label, cond) {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failures++;
}
const pct = (n, d) => (d ? (n / d) * 100 : 0);

let noise = 0;
const realWarn = console.warn, realError = console.error;
console.warn = (...a) => { noise++; realWarn('  [console.warn]', ...a); };
console.error = (...a) => { noise++; realError('  [console.error]', ...a); };

// A detached state object, so the pure systems can be driven without touching the
// singleton the save layer owns.
const bag = () => ({ gilt: 0, inventory: {}, flags: {} });

// ---- (A) the kit as data ------------------------------------------------------------
async function kitTest() {
  const { addItem, itemCount, removeItem, heldCores, topUpHearthCores, grantStartingKit, usableItems } =
    await import('../src/systems/inventory.js');
  console.log('=== (A) THE FIELD KIT — lean by decision, and the never-zero law ===');

  check('§3 prices verbatim: salve 25/8 · deep 60/20 · rag 40/12 · rough 20/6 · trued 60/20 · forge-sealed —/90',
    ITEMS.salve.buy === 25 && ITEMS.salve.sell === 8 &&
    ITEMS.deepSalve.buy === 60 && ITEMS.deepSalve.sell === 20 &&
    ITEMS.cleanRag.buy === 40 && ITEMS.cleanRag.sell === 12 &&
    ITEMS.roughCore.buy === 20 && ITEMS.roughCore.sell === 6 &&
    ITEMS.truedCore.buy === 60 && ITEMS.truedCore.sell === 20 &&
    ITEMS.forgeSealedCore.buy === null && ITEMS.forgeSealedCore.sell === 90);
  check('§3 effects: salve 35% · deep salve 70% · berry 25% + Bond 3 · rag cleanses',
    ITEMS.salve.healFrac === 0.35 && ITEMS.deepSalve.healFrac === 0.70 &&
    ITEMS.hearthBerry.healFrac === 0.25 && ITEMS.hearthBerry.bond === 3 &&
    ITEMS.cleanRag.kind === 'cleanse');
  check('core tiers: rough ×1.0 · trued ×1.25 · forge-sealed ×1.6, cheapest-first ordering',
    ITEMS.roughCore.bindMult === 1.0 && ITEMS.truedCore.bindMult === 1.25 &&
    ITEMS.forgeSealedCore.bindMult === 1.6 &&
    coresByTier().join() === 'roughCore,truedCore,forgeSealedCore');
  check('the forge-sealed core is DROP-ONLY — never in the locker, never buyable anywhere',
    !LOCKER_STOCK.includes('forgeSealedCore') &&
    ITEM_IDS.filter((id) => ITEMS[id].buy !== null).every((id) => LOCKER_STOCK.includes(id)));
  check('the locker stocks exactly both salves, the rag, and rough + trued cores',
    LOCKER_STOCK.join() === 'salve,deepSalve,cleanRag,roughCore,truedCore');
  check('four salvage materials, all sell-only, all inside the §5 3-12 band',
    MATERIAL_IDS.length === 4 &&
    MATERIAL_IDS.every((id) => ITEMS[id].buy === null && ITEMS[id].sell >= 3 && ITEMS[id].sell <= 12 &&
      ITEMS[id].where === null));
  check('no revive exists — fainted stays fainted until a hearth (the V1 law)',
    !ITEM_IDS.some((id) => /reviv|resurrect|phoenix/i.test(id + ITEMS[id].name)));

  // The bag itself.
  const s = bag();
  check('New Game grant is 5 roughs + 2 salves',
    (grantStartingKit(s), itemCount('roughCore', s) === 5 && itemCount('salve', s) === 2));
  check('spending what you do not have changes nothing and returns false',
    removeItem('deepSalve', 1, s) === false && itemCount('deepSalve', s) === 0);
  check('an emptied stack leaves the bag entirely (no zero-count ghosts)',
    (removeItem('salve', 2, s), s.inventory.salve === undefined));
  check('materials are carried but never "usable" in either context',
    (addItem('boneShard', 3, s), !usableItems('field', s).includes('boneShard') &&
      !usableItems('battle', s).includes('boneShard')));
  check('a core is battle-only; a salve is both',
    ITEMS.roughCore.where === 'battle' && ITEMS.salve.where === 'both');

  // Ledger #9 — the never-zero law.
  const broke = bag();
  check(`hearth rest tops an empty bag up to ${HEARTH_CORE_FLOOR} roughs`,
    topUpHearthCores(broke) === 3 && itemCount(BASELINE_CORE, broke) === 3);
  check('a rest with 3+ roughs gives nothing and says nothing',
    topUpHearthCores(broke) === 0 && itemCount(BASELINE_CORE, broke) === 3);
  addItem(BASELINE_CORE, 5, broke);
  check('a rest never takes cores away',
    topUpHearthCores(broke) === 0 && itemCount(BASELINE_CORE, broke) === 8);
  const one = bag();
  addItem(BASELINE_CORE, 1, one);
  check('a rest tops up the SHORTFALL only', topUpHearthCores(one) === 2 && itemCount(BASELINE_CORE, one) === 3);
}

// ---- (B) gilt & the wipe laws --------------------------------------------------------
async function giltTest() {
  const { addGilt, spendGilt, takeGilt, gilt, wildWipeLoss, duelWipeLoss, duelStakeFor, payRetroPurses } =
    await import('../src/systems/economy.js');
  console.log('\n=== (B) GILT — the purse, and the two ways it bleeds ===');

  const s = bag();
  addGilt(100, s);
  check('gilt adds and spends', gilt(s) === 100 && spendGilt(40, s) === true && gilt(s) === 60);
  check('spending more than you hold changes nothing', spendGilt(999, s) === false && gilt(s) === 60);
  check('gilt can never go negative', (takeGilt(9999, s), gilt(s) === 0));

  // Ledger #10 — the wild wipe.
  const w = bag();
  addGilt(250, w);
  check('a wild wipe costs 10% of carried gilt (250 → 25 lost)',
    wildWipeLoss(w) === 25 && gilt(w) === 225);
  const poor = bag();
  addGilt(4, poor);
  check('a wild wipe with 4 gilt costs 0 — floored, never negative',
    wildWipeLoss(poor) === 0 && gilt(poor) === 4);
  const broke = bag();
  check('a wild wipe with an empty purse costs nothing at all',
    wildWipeLoss(broke) === 0 && gilt(broke) === 0);

  // Ledger #26 — the duel stake REPLACES the 10%.
  check('the stake is half the purse, minimum 10 (30→15 · 40→20 · 45→22 · 60→30 · 90→45)',
    duelStakeFor(30) === 15 && duelStakeFor(40) === 20 && duelStakeFor(45) === 22 &&
    duelStakeFor(60) === 30 && duelStakeFor(90) === 45);
  check('the minimum bites on a small purse (a purse of 4 still stakes 10)', duelStakeFor(4) === 10);
  const d = bag();
  addGilt(200, d);
  check('a lost duel takes the STAKE, not 10% (200 gilt, 90-purse duel → 45)',
    duelWipeLoss(90, d) === 45 && gilt(d) === 155);
  const thin = bag();
  addGilt(12, thin);
  check('the stake is capped by what you carry — it can never overdraw you',
    duelWipeLoss(90, thin) === 12 && gilt(thin) === 0);

  // The retro payout.
  const r = bag();
  r.flags.duels = { rivalA: 'won', sellsword: 'lost', outrider: 'won', collector: 'won' };
  const first = payRetroPurses(r);
  check(`the first v5 load pays every WON purse and no lost one (30+60+90 = ${first.paid})`,
    first.paid === 180 && first.count === 3 && gilt(r) === 180);
  const second = payRetroPurses(r);
  check('it can never pay twice — not on reload, not on re-migration',
    second.paid === 0 && second.count === 0 && gilt(r) === 180);
  const none = bag();
  none.flags.duels = {};
  check('a player who fought nobody is paid nothing and gets no line',
    payRetroPurses(none).count === 0);
  const junk = bag();
  junk.flags.duels = { someRemovedCorelock: 'won' };
  check('an unknown corelock id in an old save is skipped, not crashed on',
    payRetroPurses(junk).paid === 0);
}

// ---- (C) the catch curves ------------------------------------------------------------
function catchTest() {
  console.log('\n=== (C) CATCH CURVES — the P11 table × the three core tiers ===');
  const t = makeCreature('Fenmoth', 8);
  const at = (frac) => { t.hp = Math.max(1, Math.round(t.maxHp * frac)); };
  const tiers = coresByTier();

  at(0.5);
  clearStatuses(t);
  const base = 1 - t.hp / t.maxHp + 0.05;
  check(`a rough core is the Phase-3 formula unchanged (${catchChance(t, 1.0).toFixed(3)} = ${base.toFixed(3)})`,
    Math.abs(catchChance(t, 1.0) - base) < 1e-9);
  check('trued ×1.25 and forge-sealed ×1.6 multiply the base awake',
    Math.abs(catchChance(t, 1.25) - base * 1.25) < 1e-9 &&
    Math.abs(catchChance(t, 1.6) - base * 1.6) < 1e-9);

  applyStatus(t, 'Sleep');
  const product = base * 1.5 * 1.25;
  check(`trued + Sleep at 50% HP computes ${product.toFixed(3)} and LANDS ON the 0.9 cap`,
    product > 0.9 && catchChance(t, 1.25) === 0.9);
  check('the cap rules over the product for every tier, asleep',
    catchChance(t, 1.0) <= 0.9 && catchChance(t, 1.25) === 0.9 && catchChance(t, 1.6) === 0.9);
  clearStatuses(t);

  console.log('  HP left →   rough / trued / forge-sealed        (awake  ·  ASLEEP)');
  for (const frac of [1.0, 0.75, 0.6, 0.5, 0.4, 0.25, 0.1]) {
    at(frac);
    clearStatuses(t);
    const awake = tiers.map((id) => (catchChance(t, ITEMS[id].bindMult) * 100).toFixed(1).padStart(5));
    applyStatus(t, 'Sleep');
    const slept = tiers.map((id) => (catchChance(t, ITEMS[id].bindMult) * 100).toFixed(1).padStart(5));
    console.log(`    ${String(Math.round(frac * 100)).padStart(3)}%      ${awake.join(' /')}   ·   ${slept.join(' /')}`);
  }
  clearStatuses(t);
  check('a full-HP target is still a bad bet even forge-sealed (< 10%)',
    (at(1.0), catchChance(t, 1.6) < 0.1));
}

// ---- (D) the loot engine --------------------------------------------------------------
function lootTest() {
  console.log('\n=== (D) THE LOOT ENGINE — five tiers, χ² against the table, no dead drops ===');
  check('every tier sums to 100 (a weight reads as its percentage)',
    Object.values(LOOT_TABLES).every((rows) => rows.reduce((s, r) => s + r.w, 0) === 100));
  check('every loot row names a real item and a real reserved class',
    Object.values(LOOT_TABLES).flat().every((r) =>
      (r.kind !== 'item' || !!ITEMS[r.id]) && (r.kind !== 'reserved' || RESERVED_CLASSES.includes(r.cls))));
  check('common/uncommon never roll a reserved class; rare+ do (§5)',
    !LOOT_TABLES.common.some((r) => r.kind === 'reserved') &&
    !LOOT_TABLES.uncommon.some((r) => r.kind === 'reserved') &&
    LOOT_TABLES.rare.some((r) => r.kind === 'reserved') &&
    LOOT_TABLES.epic.some((r) => r.kind === 'reserved'));
  check('forge-sealed cores exist only at epic/mythic — the good stuff stays rare',
    !['common', 'uncommon', 'rare'].some((t) => LOOT_TABLES[t].some((r) => r.id === 'forgeSealedCore')) &&
    LOOT_TABLES.epic.some((r) => r.id === 'forgeSealedCore'));
  check('all three reserved classes are reachable somewhere in the tables',
    RESERVED_CLASSES.every((c) => Object.values(LOOT_TABLES).flat().some((r) => r.cls === c)));

  const N = 10000;
  let deadDrops = 0, reservedSeen = 0, badFallback = 0;
  const seenClasses = new Set();
  console.log(`  ${N} rolls per tier — observed % vs table weight:`);
  for (const [tier, rows] of Object.entries(LOOT_TABLES)) {
    const counts = new Array(rows.length).fill(0);
    for (let i = 0; i < N; i++) {
      const r = rollLoot({ rarity: tier, mapId: 'route' });
      counts[rows.indexOf(r.row)]++;
      if (!r.awards.length) deadDrops++;
      if (r.reserved) {
        reservedSeen++;
        seenClasses.add(r.reserved);
        const mats = r.awards.filter((a) => a.kind === 'item' && ITEMS[a.id].kind === 'material')
          .reduce((s, a) => s + a.n, 0);
        const g = r.awards.find((a) => a.kind === 'gilt');
        if (mats < RESERVED_FALLBACK.materials || !g || !r.lines.includes(RESERVED_FALLBACK.line)) badFallback++;
      }
    }
    // χ² against the declared weights.
    const chi = rows.reduce((s, row, i) => {
      const e = (N * row.w) / 100;
      return s + ((counts[i] - e) ** 2) / e;
    }, 0);
    const obs = rows.map((row, i) => `${(pct(counts[i], N)).toFixed(1)}/${row.w}`).join('  ');
    console.log(`    ${tier.padEnd(9)} ${obs.padEnd(46)} χ²=${chi.toFixed(2)} (df ${rows.length - 1})`);
    check(`${tier}: observed distribution matches the table (χ²=${chi.toFixed(2)} < 20)`, chi < 20);
  }
  check(`never a dead drop across ${N * 5} rolls (${deadDrops} found)`, deadDrops === 0);
  check(`every reserved roll paid the fallback bundle + its line (${reservedSeen} rolls, ${badFallback} malformed)`,
    reservedSeen > 0 && badFallback === 0);
  check(`the reserved classes actually fire in play (${[...seenClasses].sort().join(', ')})`,
    seenClasses.size >= 2);
  check('NO reserved roll ever yields a gear/technique/cosmetic payload — the systems do not exist yet',
    !Object.values(LOOT_TABLES).flat().some((r) => r.kind === 'item' && RESERVED_CLASSES.includes(ITEMS[r.id]?.kind)));

  // Map flavour.
  check('salvage is keyed by place: bone in the barrow-fields, fused glass in the wastes',
    materialsFor('deephollow').includes('boneShard') && materialsFor('wastes').includes('ashGlass') &&
    materialsFor('route').includes('sporeLeather'));
  check('every encounter map has a salvage list (no map drops the default by accident)',
    Object.entries(MAPS).filter(([, m]) => m.encounters).every(([id]) => !!MAP_MATERIALS[id]));
}

// ---- (E) the economy loop --------------------------------------------------------------
function economyTest() {
  console.log('\n=== (E) THE ECONOMY LOOP — what a route lap is actually worth ===');
  const LAPS = 4000;
  const WINS = 7; // §7's "6-8 wild wins"
  let total = 0;
  for (let i = 0; i < LAPS; i++) {
    for (let w = 0; w < WINS; w++) {
      const wild = rollEncounter(MAPS.route.encounters.table, Math.random, 'route');
      total += awardsWorth(rollLoot({ rarity: wild.encounter.rarity, mapId: 'route' }).awards);
    }
  }
  const perLap = total / LAPS;
  const salves = perLap / ITEMS.salve.buy;
  console.log(`  a ${WINS}-win route lap nets ${perLap.toFixed(1)} gilt-equivalent = ${salves.toFixed(2)} salves ` +
    `(${(perLap / WINS).toFixed(1)} per win)`);
  check(`§7 band: a route lap is worth 1.5-3 salves (${salves.toFixed(2)})`, salves >= 1.5 && salves <= 3.0);
  check('the faucet is real but not rich — a lap cannot buy a trued core outright',
    perLap < ITEMS.truedCore.buy);
}

// ---- (F) Temper v0 -----------------------------------------------------------------------
function temperTest() {
  console.log('\n=== (F) TEMPER v0 — meters and words, and nothing reads them ===');
  const c = makeCreature('Mireling', 10);
  check('every instance is born with zeroed meters', c.temper.bond === 0 && c.temper.wrath === 0 && c.temper.faintStreak === 0);

  // The ramp — Shane's spec: 3, 5, 7, 9, 11, then 11 forever.
  const ramp = [];
  for (let i = 0; i < 7; i++) ramp.push(onFaint(c));
  check(`the faint ramp is 3,5,7,9,11,11,11 — gentle first, cruel if you keep letting it fall (${ramp.join(',')})`,
    ramp.join() === '3,5,7,9,11,11,11');
  check('wrath is the sum of the ramp and the streak counted every fall',
    c.temper.wrath === 57 && c.temper.faintStreak === 7);
  check('a battle it survives resets the STREAK but never the wrath already earned',
    onSurvivedBattle(c) === 7 && c.temper.faintStreak === 0 && c.temper.wrath === 57);
  check('after a reset the ramp starts gentle again', onFaint(c) === 3);

  // Bond sources.
  const b = makeCreature('Fenmoth', 10);
  onWinStanding(b);
  onWinStanding(b);
  check('a win it was standing at the end of is Bond +2', b.temper.bond === 4);
  openTreatWindow(b);
  check('a hearth-berry feeds Bond +3', feedTreat(b, 3) === 3 && b.temper.bond === 7);
  check('a SECOND berry in the same window heals but feeds nothing', feedTreat(b, 3) === 0 && b.temper.bond === 7);
  openTreatWindow(b);
  check('the next battle opens a fresh window', feedTreat(b, 3) === 3 && b.temper.bond === 10);
  b.temper.wrath = 20;
  hearthRest(b);
  check('rest soothes: Bond +1, Wrath −1, and it opens a treat window',
    b.temper.bond === 11 && b.temper.wrath === 19 && feedTreat(b, 3) === 3);

  // Clamps.
  const x = makeCreature('Borck', 10);
  x.temper.bond = 99; x.temper.wrath = 0;
  onWinStanding(x); onWinStanding(x);
  hearthRest(x);
  check('meters clamp to 0-100 in both directions', x.temper.bond === 100 && x.temper.wrath === 0);

  // The four words.
  const word = (bond, wrath) => {
    const w = makeCreature('Sistern', 10);
    w.temper.bond = bond; w.temper.wrath = wrath;
    return temperamentWord(w);
  };
  check('the four words land on their thresholds: steady · devoted · rancorous · fervent',
    word(0, 0) === 'steady' && word(49, 49) === 'steady' &&
    word(50, 0) === 'devoted' && word(80, 20) === 'devoted' &&
    word(0, 50) === 'rancorous' && word(20, 80) === 'rancorous' &&
    word(50, 50) === 'fervent' && word(100, 100) === 'fervent');
  check('a loyal berserker is FERVENT, not one or the other — the meters are independent',
    word(90, 90) === 'fervent');

  // The scripted 25-battle session (§7).
  console.log('  a scripted 25-battle session — the trace:');
  const hero = makeCreature('Slagling', 8);
  const script = [
    ...Array(6).fill('win'), 'faint', 'faint', 'faint', ...Array(4).fill('win'),
    'berry', ...Array(3).fill('win'), 'faint', 'faint', 'rest',
    ...Array(5).fill('win'), 'berry', 'win',
  ].slice(0, 25);
  const transitions = [];
  let prevWord = temperamentWord(hero);
  script.forEach((beat, i) => {
    openTreatWindow(hero);
    if (beat === 'win') { onWinStanding(hero); onSurvivedBattle(hero); }
    else if (beat === 'faint') onFaint(hero);
    else if (beat === 'berry') { feedTreat(hero, ITEMS.hearthBerry.bond); onWinStanding(hero); onSurvivedBattle(hero); }
    else if (beat === 'rest') hearthRest(hero);
    const w = temperamentWord(hero);
    if (w !== prevWord) { transitions.push(`#${i + 1} ${beat}: ${prevWord} → ${w}`); prevWord = w; }
  });
  console.log(`    final: bond ${hero.temper.bond} · wrath ${hero.temper.wrath} · streak ${hero.temper.faintStreak} · "${temperamentWord(hero)}"`);
  console.log(`    transitions: ${transitions.length ? transitions.join(' | ') : '(none — stayed steady)'}`);
  check('the 25-battle trace accrues both meters and the streak resets after each recovery',
    hero.temper.bond > 0 && hero.temper.wrath > 0 && hero.temper.faintStreak === 0);
  check('mostly-wins reads Bond-forward, and five faints did not out-run it',
    hero.temper.bond > hero.temper.wrath);
  // METER VELOCITY, for P20 to tune against real numbers rather than a guess: Bond moves
  // +2 per clean win, so the 50-point word threshold is ~25 clean wins away. A 25-battle
  // session with five faints in it lands at 42 and stays STEADY — the words are meant to
  // be slow, and this is how slow. Reported in P13_REPORT §findings.
  let cleanWins = 0;
  const pace = makeCreature('Slagling', 8);
  while (temperamentWord(pace) === 'steady' && cleanWins < 200) { onWinStanding(pace); cleanWins++; }
  console.log(`    velocity: ${cleanWins} clean wins to cross from steady → ${temperamentWord(pace)}`);
  check(`the 25-battle session stays STEADY at bond ${hero.temper.bond} — the first word is ~${cleanWins} clean wins out`,
    temperamentWord(hero) === 'steady' && cleanWins === 25);

  // ZERO TEETH — the whole point of v0. Combat, status and progression must not so much
  // as mention the meters; creatures.js is allowed to STAMP one and nothing more.
  const teeth = ['systems/combat.js', 'systems/status.js', 'systems/progression.js']
    .filter((p) => /temper|bond|wrath/i.test(src(p)));
  check(`combat, status and progression never mention Temper at all — v0 has NO teeth (${teeth.length})`,
    teeth.length === 0);
  check('data/creatures.js only STAMPS a fresh temper; it never reads a meter',
    /freshTemper\(\)/.test(src('data/creatures.js')) &&
    !/temper\.(bond|wrath|faintStreak)/.test(src('data/creatures.js')));
  check('the scenes touch Temper only to ACCRUE and to print one word',
    !/temper\.(bond|wrath)\s*[<>=]/.test(src('scenes/BattleScene.js') + src('scenes/WorldScene.js')));
}

// ---- the battle harness (P12's, plus an item budget) --------------------------------------
function bestMove(attacker, defender) {
  let best = attacker.moves[0], bestDmg = -1;
  for (const m of attacker.moves) {
    const d = computeDamage(attacker, m, defender);
    if (d > bestDmg) { best = m; bestDmg = d; }
  }
  return best;
}
const CANONICAL = (active, enemy) => bestMove(active, enemy);
const SEEKER = (active, enemy) => {
  const fish = active.moves.filter((m) => m.applies &&
    !hasStatus(resolveApplyTarget(active, enemy, m.applies), m.applies.status));
  if (fish.length) return fish.reduce((a, b) => (computeDamage(active, a, enemy) >= computeDamage(active, b, enemy) ? a : b));
  return bestMove(active, enemy);
};

// `budget` is { [itemId]: count } the player will drink. The policy is the obvious one:
// when the active drops below half and a heal remains, spend the turn on it. Items are
// counted so the 0-budget rows can PROVE nothing was drunk.
function simFight(team, foes, policy, budget = null) {
  for (const c of team) c.statuses = [];
  for (const f of foes) f.statuses = [];
  const purse = budget ? { ...budget } : null;
  let used = 0;
  let active = team.find((c) => c.hp > 0);
  let fi = 0, enemy = foes[0], turns = 0;
  const teamHpLeft = () => team.reduce((s, c) => s + Math.max(0, c.hp), 0);

  const strike = (u, mo, tg, isBossStrike) => {
    const act = resolveAction(u);
    if (act.outcome === 'deny') return;
    if (act.outcome === 'self') {
      const d = charmSelfDamage(u, mo);
      u.hp = Math.max(0, u.hp - d); wakeIfDamaged(u, d); tickStatuses(u, 'onAction');
      return;
    }
    const d = computeDamage(u, mo, tg);
    tg.hp = Math.max(0, tg.hp - d);
    wakeIfDamaged(tg, d);
    if (isBossStrike && d > 0) {
      const below = u.hp <= u.maxHp * u.drain.threshold;
      u.hp = Math.min(u.maxHp, u.hp + Math.floor((below ? u.drain.below : u.drain.above) * d * healingReceivedMod(u)));
    }
    if (mo.recoil && d > 0) u.hp = Math.max(0, u.hp - Math.max(1, Math.floor(mo.recoil * d)));
    tryApplyStatus(resolveApplyTarget(u, tg, mo.applies), mo.applies);
    tickStatuses(u, 'onAction');
  };

  const drink = () => {
    if (!purse || active.hp > active.maxHp * 0.5) return false;
    const id = Object.keys(purse).find((k) => purse[k] > 0);
    if (!id) return false;
    purse[id]--;
    used++;
    const heal = Math.max(1, Math.floor(active.maxHp * ITEMS[id].healFrac * healingReceivedMod(active)));
    active.hp = Math.min(active.maxHp, active.hp + heal);
    return true; // the turn is spent
  };

  while (true) {
    if (++turns > 500) return { win: false, turns, teamHpLeft: 0, used, stall: true };
    const drank = drink();
    const move = drank ? null : policy(active, enemy);
    if (!drank && playerActsFirst(active, enemy)) {
      strike(active, move, enemy, false);
      if (enemy.hp > 0 && active.hp > 0) strike(enemy, chooseEnemyMove(enemy, active), active, !!enemy.isBoss);
    } else {
      strike(enemy, chooseEnemyMove(enemy, active), active, !!enemy.isBoss);
      if (!drank && active.hp > 0 && enemy.hp > 0) strike(active, move, enemy, false);
    }
    if (active.hp > 0 && enemy.hp > 0) { tickStatuses(active, 'turnEnd'); tickStatuses(enemy, 'turnEnd'); }
    if (enemy.hp <= 0) {
      cleanseControl(enemy);
      const n = foes.findIndex((f, i) => i > fi && f.hp > 0);
      if (n < 0) return { win: true, turns, teamHpLeft: teamHpLeft(), used };
      fi = n; enemy = foes[fi];
    }
    if (active.hp <= 0) {
      cleanseControl(active);
      const i = team.findIndex((c) => c.hp > 0);
      if (i < 0) return { win: false, turns, teamHpLeft: 0, used };
      active = team[i];
    }
  }
}

// ---- (G) the item-budget boss rows -------------------------------------------------------
function raisedMireling(level) {
  const c = makeCreature('Mireling', level);
  if (level >= 7) c.moves.push(mv('Blightspore'));
  return c;
}
function raisedStaticur(level) {
  const c = makeCreature('Staticur', level);
  if (level >= 7) c.moves.push(mv('Gust'));
  return c;
}
const TEAMS = {
  'Ember-only: Slagling Lv8': () => [makeCreature('Slagling', 8)],
  'Ember-only: Forgewrought Lv9': () => [makeCreature('Forgewrought', 9)],
  'Ember-only: Forgewrought Lv10': () => [makeCreature('Forgewrought', 10)],
  'Bloom/Gale lead Mireling Lv10': () => [raisedMireling(10), makeCreature('Fenmoth', 10)],
  'Bloom/Gale lead Fenmoth Lv10': () => [makeCreature('Fenmoth', 10), raisedMireling(10)],
  'Diverse 4 Lv10': () => [raisedMireling(10), makeCreature('Fenmoth', 10), makeCreature('Marrowling', 10), makeCreature('Sistern', 10)],
  'Ossclad solo Lv10': () => [makeCreature('Ossclad', 10)],
  'Borck solo Lv10 (the wall)': () => [makeCreature('Borck', 10)],
  'Marrowling BASE solo Lv10': () => [makeCreature('Marrowling', 10)],
  'Staticur solo Lv10 (the easy gate)': () => [raisedStaticur(10)],
  'Staticur+Mireling Lv10': () => [raisedStaticur(10), raisedMireling(10)],
  'Staticur+Fenmoth Lv10': () => [raisedStaticur(10), makeCreature('Fenmoth', 10)],
};

// P12's published canonical bars — the baseline §7 demands the 0-budget rows reproduce.
const P12_BARS = {
  'Ember-only: Slagling Lv8': { wr: 0 },
  'Ember-only: Forgewrought Lv9': { wr: 0 },
  'Ember-only: Forgewrought Lv10': { wr: 0 },
  'Bloom/Gale lead Mireling Lv10': { wr: 100, team: 12 },
  'Bloom/Gale lead Fenmoth Lv10': { wr: 100, team: 8 },
  'Diverse 4 Lv10': { wr: 100, team: 112 },
  'Ossclad solo Lv10': { wr: 100, team: 38.7 },
  'Borck solo Lv10 (the wall)': { wr: 0 },
  'Marrowling BASE solo Lv10': { wr: 0 },
  'Staticur solo Lv10 (the easy gate)': { wr: 100, team: 3 },
  'Staticur+Mireling Lv10': { wr: 100, team: 51 },
  'Staticur+Fenmoth Lv10': { wr: 100, team: 35 },
};

// §7 asks for {0, 2 salves, 2 deep salves}. The 1-salve row is added because it is the
// question Shane will actually ask when he reads the flags below: does a per-battle item
// CAP hold the Ember wall where price cannot? (MEGA_BLOCKERS B-6.)
const BUDGETS = [
  ['0 items', null],
  ['1 salve', { salve: 1 }],
  ['2 salves', { salve: 2 }],
  ['2 deep salves', { deepSalve: 2 }],
];

function bossBudgetSuite() {
  const boss = makeBoss('BarrowKing');
  console.log(`\n=== (G) THE ITEM LAW — Barrow-King (HP${boss.maxHp} Atk${boss.atk} Def${boss.def}) at three budgets ===`);
  check('boss numbers UNTOUCHED by the economy: HP105 Atk15 Def12 Spd4, drain .33/.43 @ .5',
    boss.maxHp === 105 && boss.atk === 15 && boss.def === 12 && boss.spd === 4 &&
    boss.drain.above === 0.33 && boss.drain.below === 0.43 && boss.drain.threshold === 0.5);

  const N = 2000;
  const rows = {};
  console.log(`  ${'team'.padEnd(37)}${BUDGETS.map(([n]) => (n + ' win%').padStart(16)).join('')}`);
  for (const name of Object.keys(TEAMS)) {
    rows[name] = {};
    const cells = [];
    for (const [label, budget] of BUDGETS) {
      let wins = 0, sumTeam = 0, sumTurns = 0, itemsUsed = 0;
      for (let i = 0; i < N; i++) {
        const r = simFight(TEAMS[name](), [{ ...boss, hp: boss.maxHp, moves: boss.moves.map((m) => ({ ...m })) }], CANONICAL, budget);
        itemsUsed += r.used;
        if (r.win) { wins++; sumTeam += r.teamHpLeft; sumTurns += r.turns; }
      }
      rows[name][label] = {
        wr: pct(wins, N),
        team: wins ? +(sumTeam / wins).toFixed(1) : 0,
        turns: wins ? +(sumTurns / wins).toFixed(1) : 0,
        itemsUsed,
      };
      const r = rows[name][label];
      cells.push(`${r.wr.toFixed(1)}%@${r.team}`.padStart(16));
    }
    console.log(`  ${name.padEnd(37)}${cells.join('')}`);
  }

  // The 0-budget rows must reproduce P12. Win rates are byte-identical (they are 0 or
  // 100); the HP/turn averages carry status-roll sampling noise (Marrow Spikes' Rot at
  // 30% halves the drain), so those are asserted within a stated tolerance.
  const drift = [];
  for (const [name, want] of Object.entries(P12_BARS)) {
    const got = rows[name]['0 items'];
    if (got.wr !== want.wr) drift.push(`${name}: win ${got.wr}% vs P12 ${want.wr}%`);
    if (want.team !== undefined && Math.abs(got.team - want.team) > 1.0) drift.push(`${name}: teamHP ${got.team} vs P12 ${want.team}`);
  }
  check(`0-budget bars reproduce P12 EXACTLY on win rate, within ±1 HP on the averages${drift.length ? ' — ' + drift.join('; ') : ''}`,
    drift.length === 0);
  check('nothing was drunk at the 0 budget — the item path is genuinely off, not merely unused',
    Object.values(rows).every((r) => r['0 items'].itemsUsed === 0));
  check('items were actually spent at the other two budgets (the harness is real)',
    Object.values(rows).some((r) => r['2 salves'].itemsUsed > 0) &&
    Object.values(rows).some((r) => r['2 deep salves'].itemsUsed > 0));

  // The item law: if a budget flips a LOCKED row, the lever is price/stock, never his stats.
  const flips = [];
  for (const name of Object.keys(TEAMS)) {
    const zero = rows[name]['0 items'];
    for (const [label] of BUDGETS.slice(1)) {
      const r = rows[name][label];
      if (zero.wr === 0 && r.wr > 0) flips.push(`${label} FLIPS "${name}" from 0% to ${r.wr.toFixed(1)}%`);
      if (zero.wr === 100 && zero.team <= 25 && r.team > 40) {
        flips.push(`${label} makes "${name}" safe-comfortable (${zero.team} → ${r.team} HP left)`);
      }
    }
  }
  if (flips.length) {
    console.log('  ⚠ ITEM-LAW FLAGS (the lever is price/stock — never his stats):');
    for (const f of flips) console.log(`    ${f}`);
  } else {
    console.log('  no budget flipped a locked row: the Ember wall holds and the duo stays a knife-edge.');
  }
  return { rows, flips };
}

// ---- (H) saves ---------------------------------------------------------------------------
async function saveTest() {
  console.log('\n=== (H) SAVES — the v5 migration, and paying P12 exactly once ===');
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const KEY = 'creature-collector.save';
  const { newGame, saveGame, loadGame } = await import('../src/systems/save.js');
  const { GameState } = await import('../src/systems/state.js');
  const { itemCount } = await import('../src/systems/inventory.js');
  const { gilt, addGilt } = await import('../src/systems/economy.js');

  newGame();
  check('New Game writes a v5 blob', JSON.parse(store.get(KEY)).version === 5);
  check('New Game starts broke but equipped: 0 gilt, 5 roughs, 2 salves',
    gilt() === 0 && itemCount('roughCore') === 5 && itemCount('salve') === 2);
  check('a fresh world has no P12 debts to settle', GameState.flags.retroPursesPaid === true);

  // A v4 save: post-boss, three duels won, no economy at all.
  const v4 = {
    version: 4,
    party: [{ species: 'Forgewrought', level: 10, xp: 5, hp: 30, moves: ['Emberlash', 'Ram', 'Cinderclad'] }],
    box: [],
    position: { mapId: 'cave', x: 9, y: 3 },
    facing: 'up',
    flags: {
      respawn: { mapId: 'tavern', x: 2, y: 5 },
      starterChoice: 'Slagling',
      rivals: { a: 'Staticur', b: 'Marrowling' },
      barrowKingDefeated: true,
      duels: { rivalA: 'won', outrider: 'won', collector: 'lost' },
    },
    seen: ['Slagling'], caught: ['Slagling'],
  };
  store.set(KEY, JSON.stringify(v4));
  loadGame();
  check('a v4 save loads: party, position and flags all intact',
    GameState.party.length === 1 && GameState.party[0].species === 'Forgewrought' &&
    GameState.position.mapId === 'cave' && GameState.levelCap === 15);
  check('the v5 migration grants the starting kit (cores only became finite this phase)',
    itemCount('roughCore') === 5 && itemCount('salve') === 2);
  check(`the retro payout pays rivalA 30 + outrider 60 = 90, and NOT the lost collector (${gilt()})`,
    gilt() === 90);
  check('a pre-v5 creature arrives with zeroed meters, not missing ones',
    GameState.party[0].temper.bond === 0 && GameState.party[0].temper.wrath === 0 &&
    GameState.party[0].temper.faintStreak === 0);

  // Re-load the SAME v4 blob: the latch lives in the flags, which the blob still lacks —
  // so this is a fresh migration and pays once again, correctly. What must never happen
  // is a v5 blob paying twice.
  saveGame();
  const migrated = JSON.parse(store.get(KEY));
  check('the migrated blob is v5 and carries gilt, the bag and the paid latch',
    migrated.version === 5 && migrated.gilt === 90 && migrated.inventory.roughCore === 5 &&
    migrated.flags.retroPursesPaid === true);
  addGilt(10);
  saveGame();
  loadGame();
  check('Continue on a v5 blob pays NOTHING again — the purse survives untouched', gilt() === 100);
  loadGame();
  loadGame();
  check('and it still pays nothing on the third and fourth load', gilt() === 100);

  // Round-trip: Temper, gilt and the bag all survive a save/load cycle.
  GameState.party[0].temper = { bond: 61, wrath: 12, faintStreak: 3 };
  saveGame();
  loadGame();
  const t = GameState.party[0].temper;
  check('Temper round-trips through the save layer, faintStreak included',
    t.bond === 61 && t.wrath === 12 && t.faintStreak === 3 && temperamentWord(GameState.party[0]) === 'devoted');
  check('the bag round-trips', itemCount('roughCore') === 5 && itemCount('salve') === 2);

  newGame();
  check('New Game resets the economy to zero', gilt() === 0 && Object.keys(GameState.inventory).join() === 'roughCore,salve');
}

// ---- (I) session hygiene ------------------------------------------------------------------
async function sessionTest() {
  const { addItem, itemCount, removeItem, bagSellValue } = await import('../src/systems/inventory.js');
  const { addGilt, spendGilt, gilt } = await import('../src/systems/economy.js');
  console.log('\n=== (I) SESSION — buy, sell, throw, eat ===');

  const s = bag();
  addGilt(200, s);
  // BUY
  const price = ITEMS.truedCore.buy;
  check('buy: gilt out, item in', spendGilt(price, s) && (addItem('truedCore', 1, s), itemCount('truedCore', s) === 1 && gilt(s) === 140));
  check('buy refuses when short', (spendGilt(9999, s) === false) && gilt(s) === 140);
  // SELL
  check('sell: item out, gilt in at the sell column',
    removeItem('truedCore', 1, s) && (addGilt(ITEMS.truedCore.sell, s), gilt(s) === 160 && itemCount('truedCore', s) === 0));
  check('the sell column is always below the buy column (no arbitrage loop)',
    LOCKER_STOCK.every((id) => ITEMS[id].sell < ITEMS[id].buy));
  // THROW
  addItem('roughCore', 2, s);
  const target = makeCreature('Fenmoth', 6);
  target.hp = 3;
  const before = itemCount('roughCore', s);
  removeItem('roughCore', 1, s);
  check('throw: the core is spent whether it holds or not', itemCount('roughCore', s) === before - 1);
  check('a spent throw still computes a real chance', catchChance(target, ITEMS.roughCore.bindMult) > 0.5);
  // EAT
  const eater = makeCreature('Mireling', 10);
  eater.hp = 10;
  openTreatWindow(eater);
  const heal = Math.max(1, Math.floor(eater.maxHp * ITEMS.hearthBerry.healFrac));
  eater.hp = Math.min(eater.maxHp, eater.hp + heal);
  feedTreat(eater, ITEMS.hearthBerry.bond);
  check(`eat: the berry heals ${heal} and feeds Bond 3`, eater.hp === 10 + heal && eater.temper.bond === 3);
  // Rot halves healing RECEIVED — items ride the Phase-7 framework, not a special case.
  const rotted = makeCreature('Mireling', 10);
  rotted.hp = 1;
  applyStatus(rotted, 'Rot');
  const rotHeal = Math.max(1, Math.floor(rotted.maxHp * ITEMS.salve.healFrac * healingReceivedMod(rotted)));
  check(`Rot halves an item heal too (${rotHeal} vs ${Math.floor(rotted.maxHp * ITEMS.salve.healFrac)})`,
    rotHeal === Math.floor(rotted.maxHp * ITEMS.salve.healFrac * 0.5));
  clearStatuses(rotted);
  check('bagSellValue prices the whole bag at the sell column', bagSellValue(s) === itemCount('roughCore', s) * ITEMS.roughCore.sell);
}

// ---- run -------------------------------------------------------------------------------
await kitTest();
await giltTest();
catchTest();
lootTest();
economyTest();
temperTest();
await sessionTest();
console.log(failures ? `\n  *** ${failures} FAILURE(S) in the unit pass ***` : '\n  all unit checks pass');
const bossRows = bossBudgetSuite();
await saveTest();

console.log('\n=== SUMMARY ===');
console.log(`  item-law flags : ${bossRows.flips.length}`);
check(`console-clean session (${noise} warnings/errors from shipped modules)`, noise === 0);
console.log(failures ? `\n*** ${failures} TOTAL FAILURE(S) ***` : '\nALL CHECKS PASS');
process.exit(failures ? 1 : 0);
