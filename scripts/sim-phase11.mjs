// PHASE11 verification sim — THE CONTROL SEAM. Reuses the REAL game modules.
// Jobs (build plan §6):
//
//   (A) Data integrity — the control set is EXACTLY {Stunned, Sleep, Shock, Charmed};
//       Braced + every DoT/statMod carries no control flag; carriers are exactly
//       Undertoll/Lull → Sleep and Concuss → Stunned; Shock/Charmed/Hasted/Drowning
//       wired to NO move (dark); learnsets landed (Sistern@8, Fenlight@7, Borck@8).
//   (B) onAct law — Stunned denies exactly one action, spends itself, leaves Braced;
//       Braced blocks re-stun for EXACTLY 2 turns (no chains either direction); Sleep
//       denies until damage; Shock fizzles 25% with a /14 DoT; Charmed coin-flips
//       50/50 between a half-power self-strike and a hesitation.
//   (C) onDamaged law — any damage wakes a sleeper (attack or DoT tick alike); a
//       damage-less tick (Slowed) does NOT wake it. Ordering: wake fires after damage,
//       before drain/recoil bookkeeping (asserted through the battle harness).
//   (D) Swap cleanse — exactly the control set leaves with the swapper; DoTs, statMods
//       and Braced persist.
//   (E) Boss law — isBoss refuses control ('immune'), takes DoTs/statMods as always.
//   (F) Bind bonus — catchChance ×1.5 under Sleep, 0.9 cap intact; the curve printed.
//   (G) Cunning policy — kill-first, control-over-statMod fishing, greedy fallback;
//       Fenlight is the ONLY flagged species.
//   (H) The FULL Phase-10 Barrow-King suite re-run — every locked bar re-asserts
//       EXACTLY (control statuses never touch those teams). Twin rows prove Undertoll-
//       Sistern and Concuss-Borck change NOTHING against the immune King, and a global
//       counter proves no control status EVER lands on him.
//   (I) The misery check — cunning wild Fenlight vs each solo starter at route levels
//       (real wild kit), plus the hypothetical Lull-carrier for Shane's seam decision.
//
// Run:  node scripts/sim-phase11.mjs

import { SPECIES, makeCreature } from '../src/data/creatures.js';
import { MOVES, mv } from '../src/data/moves.js';
import { STATUSES } from '../src/data/statuses.js';
import { makeBoss } from '../src/data/bosses.js';
import {
  computeDamage, playerActsFirst, chooseEnemyMove, catchChance, charmSelfDamage,
} from '../src/systems/combat.js';
import {
  applyStatus, tryApplyStatus, resolveApplyTarget, resolveAction, wakeIfDamaged,
  cleanseControl, tickStatuses, clearStatuses, hasStatus, healingReceivedMod, bindBonusOf,
} from '../src/systems/status.js';
import { statAtLevel } from '../src/systems/progression.js';

let failures = 0;
function check(label, cond) {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failures++;
}
const seq = (vals) => { let i = 0; return () => vals[Math.min(i++, vals.length - 1)]; };

// ---- (A) data integrity -----------------------------------------------------------
function dataTest() {
  console.log('=== (A) WAVE-2 DATA — the control set, its carriers, the dark pair ===');
  const CONTROL = ['Stunned', 'Sleep', 'Shock', 'Charmed'];
  const NOT_CONTROL = ['Burn', 'Poison', 'Bleed', 'Rot', 'Slowed', 'Calcified', 'Hasted', 'Drowning', 'Braced'];
  check('control:true on exactly {Stunned, Sleep, Shock, Charmed}',
    CONTROL.every((id) => STATUSES[id]?.control === true) &&
    NOT_CONTROL.every((id) => !STATUSES[id]?.control));
  check('Braced exists: beneficial, 2-turn turnEnd countdown, never control',
    STATUSES.Braced.beneficial === true && STATUSES.Braced.duration === 2 &&
    STATUSES.Braced.trigger === 'turnEnd' && !STATUSES.Braced.control);
  check('Stunned: denyAct + consumeOnDeny + braceAfter Braced, NO tick trigger',
    STATUSES.Stunned.denyAct && STATUSES.Stunned.consumeOnDeny &&
    STATUSES.Stunned.braceAfter === 'Braced' && STATUSES.Stunned.trigger === undefined);
  check('Sleep: denyAct + wakeOnDamage + bindBonus 1.5 + 3-turn countdown',
    STATUSES.Sleep.denyAct && STATUSES.Sleep.wakeOnDamage && STATUSES.Sleep.bindBonus === 1.5 &&
    STATUSES.Sleep.duration === 3 && STATUSES.Sleep.trigger === 'turnEnd');
  check('Shock: fizzle 25% + DoT 1/14 ×3 turns (Gale)', STATUSES.Shock.fizzleChance === 0.25 &&
    STATUSES.Shock.tickFrac === 1 / 14 && STATUSES.Shock.duration === 3 && STATUSES.Shock.flavorType === 'Gale');
  check('Charmed: the charm flag, 2 turns', STATUSES.Charmed.charm === true && STATUSES.Charmed.duration === 2);

  const carriers = {};
  for (const [name, d] of Object.entries(MOVES)) {
    if (d.applies) (carriers[d.applies.status] ??= []).push(name);
  }
  check('Sleep carriers exactly {Undertoll, Lull}; Stunned exactly {Concuss}',
    JSON.stringify((carriers.Sleep || []).sort()) === JSON.stringify(['Lull', 'Undertoll']) &&
    JSON.stringify(carriers.Stunned || []) === JSON.stringify(['Concuss']));
  // P11 shipped all four of these dark. PHASE12 §5 wired Charmed to exactly ONE carrier
  // — Gloam, which lives only on the Ledger collector's Murkmaw override (ledger #29).
  // Shock, Hasted and Drowning are still dark, and the row now guards that Charmed has
  // gained exactly one carrier and no more.
  check('Shock + Hasted + Drowning still dark; Charmed has exactly one carrier (Gloam, P12)',
    !carriers.Shock && !carriers.Hasted && !carriers.Drowning &&
    JSON.stringify(carriers.Charmed || []) === JSON.stringify(['Gloam']));
  check('move specs: Undertoll Tide·magic·4·30% / Lull Neutral·magic·3·30% / Concuss Neutral·physical·4·20%',
    MOVES.Undertoll.type === 'Tide' && MOVES.Undertoll.kind === 'magic' && MOVES.Undertoll.power === 4 && MOVES.Undertoll.applies.chance === 0.3 &&
    MOVES.Lull.type === 'Neutral' && MOVES.Lull.kind === 'magic' && MOVES.Lull.power === 3 && MOVES.Lull.applies.chance === 0.3 &&
    MOVES.Concuss.type === 'Neutral' && MOVES.Concuss.kind === 'physical' && MOVES.Concuss.power === 4 && MOVES.Concuss.applies.chance === 0.2);
  // Starter discipline: no CONTROL status enters a starter kit or learnset. (Marrowling's
  // Clatter has carried Bleed — a DoT — since Phase 7; the locked bars bake it in.)
  const controlFree = (moveNames) =>
    moveNames.every((m) => !MOVES[m].applies || !STATUSES[MOVES[m].applies.status].control);
  // Lull shipped at Lv7 in P11 and dropped to Lv6 in P12 (§4, ledger #27) so the route's
  // rare actually carries it — the whole point of the wild-learnset change.
  check('learnsets: Sistern Undertoll@8 · Fenlight Lull@6 (P12: was 7) · Borck Concuss@8; starter kits/learnsets control-free',
    SPECIES.Sistern.learnset.some((e) => e.level === 8 && e.move === 'Undertoll') &&
    SPECIES.Fenlight.learnset.some((e) => e.level === 6 && e.move === 'Lull') &&
    SPECIES.Borck.learnset.some((e) => e.level === 8 && e.move === 'Concuss') &&
    ['Slagling', 'Staticur', 'Marrowling'].every((k) =>
      controlFree(SPECIES[k].moves) && controlFree((SPECIES[k].learnset || []).map((e) => e.move))));
  check('Fenlight is the ONLY cunning species; instances carry the flag',
    Object.entries(SPECIES).filter(([, s]) => s.ai).map(([k]) => k).join() === 'Fenlight' &&
    makeCreature('Fenlight', 5).ai === 'cunning' && makeCreature('Mireling', 5).ai === undefined);
}

// ---- (B) the onAct law ------------------------------------------------------------
function onActTest() {
  console.log('\n=== (B) ONACT — deny, the Braced window, the Charmed coin ===');
  const c = makeCreature('Slagling', 10);

  // Stunned: exactly one denied action, then Braced for exactly 2 turns.
  applyStatus(c, 'Stunned');
  const a1 = resolveAction(c);
  check('Stunned denies the action, spends itself, leaves Braced',
    a1.outcome === 'deny' && a1.id === 'Stunned' && !hasStatus(c, 'Stunned') && hasStatus(c, 'Braced'));
  check('a second action proceeds (Stunned is one action, never two)', resolveAction(c).outcome === 'act');
  check('re-stun is BLOCKED while braced (same turn as the deny)', tryApplyStatus(c, { status: 'Stunned', chance: 1 }).result === 'blocked');
  tickStatuses(c, 'turnEnd'); // the deny turn's own end — the GRACE tick (verify-pass fix)
  check("the deny turn's end-tick is grace: the window still holds 2 real turns",
    c.statuses.find((s) => s.id === 'Braced')?.turnsLeft === 2);
  tickStatuses(c, 'turnEnd'); // immune turn 1
  check('...still blocked after immune turn 1', tryApplyStatus(c, { status: 'Stunned', chance: 1 }).result === 'blocked');
  tickStatuses(c, 'turnEnd'); // immune turn 2 — expires
  check('after two REAL turns the brace lifts and Stunned lands again',
    !hasStatus(c, 'Braced') && tryApplyStatus(c, { status: 'Stunned', chance: 1 }).result === 'applied');
  clearStatuses(c);

  // Sleep: denies every action while held.
  applyStatus(c, 'Sleep');
  check('Sleep denies (and keeps denying)', resolveAction(c).outcome === 'deny' && resolveAction(c).outcome === 'deny' && hasStatus(c, 'Sleep'));
  clearStatuses(c);

  // Shock: 25% fizzle per action, deterministic via injected rand.
  applyStatus(c, 'Shock');
  check('Shock: rand .24 fizzles, rand .25 acts',
    resolveAction(c, seq([0.24])).outcome === 'deny' && resolveAction(c, seq([0.25])).outcome === 'act');
  let fizz = 0;
  for (let i = 0; i < 20000; i++) if (resolveAction(c, Math.random).outcome === 'deny') fizz++;
  const fizzPct = (fizz / 20000) * 100;
  check(`Shock fizzle distribution ≈ 25% (${fizzPct.toFixed(1)}%)`, Math.abs(fizzPct - 25) < 1.5);
  clearStatuses(c);

  // Charmed: the coin — .49 self, .5 hesitate; distribution ~50/50.
  applyStatus(c, 'Charmed');
  check('Charmed: rand .49 → self-strike, rand .50 → hesitates',
    resolveAction(c, seq([0.49])).outcome === 'self' && resolveAction(c, seq([0.5])).outcome === 'deny');
  let selfs = 0;
  for (let i = 0; i < 20000; i++) if (resolveAction(c, Math.random).outcome === 'self') selfs++;
  const selfPct = (selfs / 20000) * 100;
  check(`Charmed coin ≈ 50/50 (${selfPct.toFixed(1)}% self)`, Math.abs(selfPct - 50) < 1.5);
  clearStatuses(c);

  // The half-power self-hit math, against hand arithmetic (same-type = neutral ×1).
  const stat = makeCreature('Staticur', 10); // atk 24, def 13 at Lv10
  const lash = stat.moves.find((m) => m.name === 'Static Lash'); // Gale phys 6
  const want = Math.max(1, Math.floor((stat.atk * 3) / stat.def)); // power 6 → 3, Gale-vs-Gale ×1
  check(`charmSelfDamage = floor(atk·(p/2)/own def · ×1) = ${want} (got ${charmSelfDamage(stat, lash)})`,
    charmSelfDamage(stat, lash) === want);
}

// ---- (B2) the Braced cadence — scene-faithful, both initiative orders -------------
// The verify-pass finding: a brace set mid-turn must not lose a window turn to the
// same turn's end-tick. Full turn loops in both orders; the anti-stunlock law reads
// "skip one action, then 2 turns of immunity" — denies can never come closer than
// every 3rd turn, whoever moves first.
function stunCadenceTest() {
  console.log('\n=== (B2) THE BRACED CADENCE — no chains, either initiative order ===');
  const cadence = (aggressorFirst) => {
    const victim = { name: 'victim', hp: 500, maxHp: 500, statuses: [] };
    const denies = [];
    for (let t = 1; t <= 12; t++) {
      const attempt = () => tryApplyStatus(victim, { status: 'Stunned', chance: 1 });
      const act = () => { if (resolveAction(victim).outcome === 'deny') denies.push(t); };
      if (aggressorFirst) { attempt(); act(); } else { act(); attempt(); }
      tickStatuses(victim, 'turnEnd');
    }
    return denies;
  };
  const dA = cadence(true);
  const dV = cadence(false);
  const gaps = (d) => d.slice(1).map((x, i) => x - d[i]);
  check(`aggressor-first: denies on turns [${dA.join(', ')}] — every 3rd exactly (was every 2nd before the fix)`,
    dA.length >= 3 && gaps(dA).every((g) => g === 3));
  check(`victim-first: denies on turns [${dV.join(', ')}] — never closer than 3 (the same-turn block is real protection here)`,
    dV.length >= 2 && gaps(dV).every((g) => g >= 3));
}

// ---- (C) the onDamaged law --------------------------------------------------------
function onDamagedTest() {
  console.log('\n=== (C) ONDAMAGED — any damage wakes; damage-less ticks do not ===');
  const c = makeCreature('Mireling', 10);

  applyStatus(c, 'Sleep');
  check('direct damage wakes the sleeper', wakeIfDamaged(c, 1)?.woke === true && !hasStatus(c, 'Sleep'));
  applyStatus(c, 'Sleep');
  check('zero damage does NOT wake', wakeIfDamaged(c, 0) === null && hasStatus(c, 'Sleep'));
  // The verify-pass fix: the blow that FELLS a sleeper never wakes the corpse —
  // the hp-0 law the tick path already enforced now holds on the direct path too.
  const ko = makeCreature('Fenmoth', 5);
  applyStatus(ko, 'Sleep');
  ko.hp = 0; // the scene clamps hp before calling
  check('a killing blow does NOT wake the corpse (hp-0 law, both wake paths)',
    wakeIfDamaged(ko, 9) === null && hasStatus(ko, 'Sleep'));

  // A DoT tick wakes; a pure statMod tick does not.
  applyStatus(c, 'Burn');
  const evs = tickStatuses(c, 'turnEnd');
  check('a Burn tick (real damage) wakes the sleeper in the same round',
    evs.some((e) => e.id === 'Burn' && e.dmg > 0) && evs.some((e) => e.woke) && !hasStatus(c, 'Sleep'));
  clearStatuses(c);

  applyStatus(c, 'Sleep');
  applyStatus(c, 'Slowed');
  const evs2 = tickStatuses(c, 'turnEnd');
  check('a Slowed tick (no damage) leaves it sleeping — the countdown just runs',
    !evs2.some((e) => e.woke) && hasStatus(c, 'Sleep'));
  clearStatuses(c);

  // Natural expiry narrates as expiry, not as a wake.
  applyStatus(c, 'Sleep');
  tickStatuses(c, 'turnEnd');
  tickStatuses(c, 'turnEnd');
  const evs3 = tickStatuses(c, 'turnEnd');
  check('the third quiet turn expires Sleep naturally (no wake event)',
    evs3.some((e) => e.id === 'Sleep' && e.expired) && !evs3.some((e) => e.woke) && !hasStatus(c, 'Sleep'));
}

// ---- (D) swap cleanse -------------------------------------------------------------
function cleanseTest() {
  console.log('\n=== (D) SWAP CLEANSE — exactly the control set leaves the field ===');
  const c = makeCreature('Sistern', 10);
  for (const id of ['Stunned', 'Sleep', 'Shock', 'Charmed', 'Burn', 'Rot', 'Slowed', 'Calcified']) applyStatus(c, id);
  const removed = cleanseControl(c).sort();
  check(`cleanse removes exactly [Charmed, Shock, Sleep, Stunned] (got [${removed.join(', ')}])`,
    JSON.stringify(removed) === JSON.stringify(['Charmed', 'Shock', 'Sleep', 'Stunned']));
  check('Burn/Rot/Slowed/Calcified persist through the swap',
    ['Burn', 'Rot', 'Slowed', 'Calcified'].every((id) => hasStatus(c, id)));
  clearStatuses(c);
  applyStatus(c, 'Stunned');
  resolveAction(c); // consume → Braced
  cleanseControl(c);
  check('Braced survives a swap (it is the bearer\'s own stance, not control)', hasStatus(c, 'Braced'));
}

// ---- (E) the boss law -------------------------------------------------------------
function bossLawTest() {
  console.log('\n=== (E) BOSS LAW — control refused, DoTs land, the dry lines exist ===');
  const king = makeBoss('BarrowKing');
  king.statuses = [];
  const results = ['Stunned', 'Sleep', 'Shock', 'Charmed'].map(
    (id) => tryApplyStatus(king, { status: id, chance: 1 }).result
  );
  check('all four control applies come back immune', results.every((r) => r === 'immune'));
  check('the King carries nothing afterward', (king.statuses || []).length === 0);
  check('Rot still lands (healingMod bites the drain as in Phase 7)',
    tryApplyStatus(king, { status: 'Rot', chance: 1 }).result === 'applied' && healingReceivedMod(king) === 0.5);
  clearStatuses(king);
  check('Slowed (a statMod, not control) still lands',
    tryApplyStatus(king, { status: 'Slowed', chance: 1 }).result === 'applied');
  check('every control status carries an immune line ("does not sleep" register)',
    ['Stunned', 'Sleep', 'Shock', 'Charmed'].every((id) => typeof STATUSES[id].lines.immune === 'string'));
}

// ---- (F) the bind bonus + curve ---------------------------------------------------
function bindTest() {
  console.log('\n=== (F) BIND — ×1.5 asleep, the 0.9 cap stands, the curve ===');
  const t = makeCreature('Fenmoth', 8);
  const at = (frac) => { t.hp = Math.max(1, Math.round(t.maxHp * frac)); };
  at(0.5);
  const base = 1 - t.hp / t.maxHp + 0.05;
  check(`awake at 50% HP: ${catchChance(t).toFixed(3)} = base ${base.toFixed(3)}`, Math.abs(catchChance(t) - base) < 1e-9);
  applyStatus(t, 'Sleep');
  check(`asleep at 50% HP: ${catchChance(t).toFixed(3)} = base ×1.5`, Math.abs(catchChance(t) - base * 1.5) < 1e-9);
  at(0.1);
  check('the 0.9 cap holds over the product', catchChance(t) === 0.9);
  check('bindBonusOf: 1.5 asleep, 1 awake', bindBonusOf(t) === 1.5 && (clearStatuses(t), bindBonusOf(t) === 1));

  console.log('  the catch curve (HP remaining → awake / ASLEEP):');
  for (const frac of [1.0, 0.75, 0.6, 0.5, 0.4, 0.25, 0.1]) {
    at(frac);
    clearStatuses(t);
    const awake = catchChance(t);
    applyStatus(t, 'Sleep');
    const slept = catchChance(t);
    console.log(`    ${String(Math.round(frac * 100)).padStart(3)}% HP   ${(awake * 100).toFixed(1).padStart(5)}%  →  ${(slept * 100).toFixed(1).padStart(5)}%${slept === 0.9 ? '  (capped)' : ''}`);
  }
  clearStatuses(t);
}

// ---- (G) the cunning policy -------------------------------------------------------
function cunningTest() {
  console.log('\n=== (G) CUNNING — kill first, fish control over statMod, else greedy ===');
  const fen = makeCreature('Fenlight', 5);
  const slag = makeCreature('Slagling', 5);
  check('wild-kit Fenlight opens by fishing Slowed (Coldlight) vs a clean target',
    chooseEnemyMove(fen, slag).name === 'Coldlight');
  applyStatus(slag, 'Slowed');
  check('once Slowed holds it goes greedy (Coldlight is also its damage-max)',
    chooseEnemyMove(fen, slag).name === 'Coldlight');
  clearStatuses(slag);
  slag.hp = 3;
  check('a kill on the table is taken, never fished past', chooseEnemyMove(fen, slag).name === 'Coldlight');
  slag.hp = slag.maxHp;

  const fen7 = makeCreature('Fenlight', 7);
  fen7.moves.push(mv('Lull'));
  check('a Lull-carrier opens with Lull (control outranks a statMod fish)',
    chooseEnemyMove(fen7, makeCreature('Slagling', 7)).name === 'Lull');
  const king = makeBoss('BarrowKing');
  king.statuses = [];
  check('cunning never fishes control at an immune boss',
    chooseEnemyMove(fen7, king).name !== 'Lull');
  const braced = makeCreature('Slagling', 7);
  applyStatus(braced, 'Braced');
  const borck = makeCreature('Borck', 8);
  borck.moves.push(mv('Concuss'));
  borck.ai = 'cunning'; // hypothetical, policy-only check
  check('cunning never throws Stunned at a braced target',
    chooseEnemyMove(borck, braced).name !== 'Concuss');
}

// ---- battle harness (P10 harness + the P11 control laws) --------------------------
let bossControlLanded = 0; // any control status that ever APPLIES to an isBoss target
let bossImmuneFires = 0; // immunity actually exercised somewhere in the suite

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

function simBattle(team, boss, policy) {
  const enemy = { ...boss, hp: boss.maxHp, moves: boss.moves.map((m) => ({ ...m })), statuses: [] };
  for (const c of team) c.statuses = [];
  let active = team[0];
  let turns = 0;
  const alive = () => team.filter((c) => c.hp > 0).length;
  const teamHpLeft = () => team.reduce((s, c) => s + Math.max(0, c.hp), 0);

  const tickFor = (c, trigger) => { tickStatuses(c, trigger); };
  const hitEffects = (user, move, dmg, target) => {
    if (move.recoil && dmg > 0) user.hp = Math.max(0, user.hp - Math.max(1, Math.floor(move.recoil * dmg)));
    const tgt = resolveApplyTarget(user, target, move.applies);
    const ev = tryApplyStatus(tgt, move.applies);
    if (ev && tgt.isBoss) {
      if (ev.result === 'immune') bossImmuneFires++;
      else if (ev.result === 'applied' || ev.result === 'refreshed') {
        if (STATUSES[ev.id].control) bossControlLanded++;
      }
    }
  };
  // PHASE11: both sides pass the onAct gate; wake fires after damage, before
  // drain/recoil — the same ordering the scene uses.
  const strike = (user, move, target, isBossStrike) => {
    const act = resolveAction(user);
    if (act.outcome === 'deny') return;
    if (act.outcome === 'self') {
      const d = charmSelfDamage(user, move);
      user.hp = Math.max(0, user.hp - d);
      wakeIfDamaged(user, d);
      tickFor(user, 'onAction');
      return;
    }
    const d = computeDamage(user, move, target);
    target.hp = Math.max(0, target.hp - d);
    wakeIfDamaged(target, d);
    if (isBossStrike && d > 0) {
      const belowHalf = user.hp <= user.maxHp * user.drain.threshold;
      const healed = Math.floor((belowHalf ? user.drain.below : user.drain.above) * d * healingReceivedMod(user));
      user.hp = Math.min(user.maxHp, user.hp + healed);
    }
    hitEffects(user, move, d, target);
    tickFor(user, 'onAction');
  };

  while (true) {
    turns++;
    if (turns > 500) return { win: false, turns, aliveLeft: alive(), teamHpLeft: 0, stall: true };
    const move = policy(active, enemy);
    if (playerActsFirst(active, enemy)) {
      strike(active, move, enemy, false);
      if (enemy.hp <= 0) break;
      if (active.hp > 0) strike(enemy, chooseEnemyMove(enemy, active), active, !!enemy.isBoss);
    } else {
      strike(enemy, chooseEnemyMove(enemy, active), active, !!enemy.isBoss);
      if (active.hp > 0 && enemy.hp > 0) strike(active, move, enemy, false);
    }
    if (enemy.hp <= 0) break;
    if (active.hp > 0) {
      tickFor(active, 'turnEnd');
      tickFor(enemy, 'turnEnd');
      if (enemy.hp <= 0) break;
    }
    if (active.hp <= 0) {
      cleanseControl(active); // forced-out per the scene
      const idx = team.findIndex((c) => c.hp > 0);
      if (idx < 0) return { win: false, turns, aliveLeft: 0, teamHpLeft: 0 };
      active = team[idx];
    }
  }
  return { win: true, turns, aliveLeft: alive(), teamHpLeft: teamHpLeft() };
}

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
function undertollSistern(level) {
  const c = makeCreature('Sistern', level);
  if (level >= 8) c.moves.push(mv('Undertoll'));
  return c;
}
function concussBorck(level) {
  const c = makeCreature('Borck', level);
  if (level >= 8) c.moves.push(mv('Concuss'));
  return c;
}

// The LOCKED Phase-10 teams, verbatim, plus the P11 twin rows.
const TEAMS = {
  'Ember-only: Slagling Lv8': () => [makeCreature('Slagling', 8)],
  'Ember-only: Forgewrought Lv9': () => [makeCreature('Forgewrought', 9)],
  'Ember-only: Forgewrought Lv10': () => [makeCreature('Forgewrought', 10)],
  'Bloom/Gale lead Mireling Lv10': () => [raisedMireling(10), makeCreature('Fenmoth', 10)],
  'Bloom/Gale lead Fenmoth Lv10': () => [makeCreature('Fenmoth', 10), raisedMireling(10)],
  'Diverse 4 Lv8': () => [raisedMireling(8), makeCreature('Fenmoth', 8), makeCreature('Marrowling', 8), makeCreature('Sistern', 8)],
  'Diverse 4 Lv10': () => [raisedMireling(10), makeCreature('Fenmoth', 10), makeCreature('Marrowling', 10), makeCreature('Sistern', 10)],
  'Ossclad solo Lv10': () => [makeCreature('Ossclad', 10)],
  'Forgewrought+Ossclad Lv10': () => [makeCreature('Forgewrought', 10), makeCreature('Ossclad', 10)],
  'Borck solo Lv10 (the wall)': () => [makeCreature('Borck', 10)],
  'Snarebriar+Mireling Lv10': () => [makeCreature('Snarebriar', 10), raisedMireling(10)],
  'Snarebriar+Fenmoth Lv10': () => [makeCreature('Snarebriar', 10), makeCreature('Fenmoth', 10)],
  'Fenlight+Mireling Lv10': () => [makeCreature('Fenlight', 10), raisedMireling(10)],
  'Marrowling BASE solo Lv10 (§8 row)': () => [makeCreature('Marrowling', 10)],
  'Staticur solo Lv10 (the easy gate)': () => [raisedStaticur(10)],
  'Staticur+Mireling Lv10': () => [raisedStaticur(10), raisedMireling(10)],
  'Staticur+Fenmoth Lv10': () => [raisedStaticur(10), makeCreature('Fenmoth', 10)],
  // ---- PHASE11 twin rows — the immune King shrugs the control kits ---------------
  'Diverse 4 Lv10 + Undertoll Sistern': () => [raisedMireling(10), makeCreature('Fenmoth', 10), makeCreature('Marrowling', 10), undertollSistern(10)],
  'Borck solo Lv10 + Concuss': () => [concussBorck(10)],
};

const TRIALS = 2000;
function suite(policyName, policy) {
  const boss = makeBoss('BarrowKing');
  console.log(`\n=== BARROW-KING (HP${boss.maxHp} Atk${boss.atk} Def${boss.def} — UNCHANGED) — ${policyName} ===`);
  const results = {};
  for (const name of Object.keys(TEAMS)) {
    let wins = 0, sumTeam = 0, sumTurns = 0, sumAlive = 0, teamSize = 0, stalls = 0;
    for (let i = 0; i < TRIALS; i++) {
      const t = TEAMS[name]();
      teamSize = t.length;
      const r = simBattle(t, boss, policy);
      if (r.stall) stalls++;
      if (r.win) { wins++; sumTeam += r.teamHpLeft; sumTurns += r.turns; sumAlive += r.aliveLeft; }
    }
    const wr = (wins / TRIALS) * 100;
    results[name] = {
      wr,
      avgTeam: wins ? +(sumTeam / wins).toFixed(1) : '-',
      avgTurns: wins ? +(sumTurns / wins).toFixed(1) : '-',
      stalls,
    };
    const r = results[name];
    console.log(
      `  ${name.padEnd(37)} win ${String(r.wr.toFixed(1)).padStart(5)}%  teamHPleft ${String(r.avgTeam).padStart(5)}  ` +
      `turns ${String(r.avgTurns).padStart(4)}  aliveLeft ${(wins ? (sumAlive / wins).toFixed(2) : '-')}/${teamSize}` +
      (stalls ? `  (${stalls} stalls)` : '')
    );
  }
  return results;
}

// The Phase-10 published bars these rows must re-assert EXACTLY.
function bossAssertions(canon, seeker) {
  console.log('\n=== BOSS ASSERTIONS — every P10 bar re-asserts; immunity holds by construction ===');
  const b = makeBoss('BarrowKing');
  check('boss numbers untouched: HP105 Atk15 Def12 Spd4, drain .33/.43 @ .5 — LOCKED',
    b.maxHp === 105 && b.atk === 15 && b.def === 12 && b.spd === 4 &&
    b.drain.above === 0.33 && b.drain.below === 0.43 && b.drain.threshold === 0.5);
  check('HARD — Slagling path 0% at every level ≤ cap (both policies)',
    ['Ember-only: Slagling Lv8', 'Ember-only: Forgewrought Lv9', 'Ember-only: Forgewrought Lv10']
      .every((n) => canon[n].wr === 0 && seeker[n].wr === 0));
  check(`Bloom/Gale duo bars hold (100% tense: ${canon['Bloom/Gale lead Mireling Lv10'].avgTeam} / ${canon['Bloom/Gale lead Fenmoth Lv10'].avgTeam})`,
    canon['Bloom/Gale lead Mireling Lv10'].wr === 100 && canon['Bloom/Gale lead Fenmoth Lv10'].wr === 100 &&
    canon['Bloom/Gale lead Mireling Lv10'].avgTeam <= 25 && canon['Bloom/Gale lead Fenmoth Lv10'].avgTeam <= 25);
  check('Ossclad solo 100% both policies; Diverse 4 Lv10 100%',
    canon['Ossclad solo Lv10'].wr === 100 && seeker['Ossclad solo Lv10'].wr === 100 && canon['Diverse 4 Lv10'].wr === 100);
  check('Borck solo still a stall-LOSS both ways',
    canon['Borck solo Lv10 (the wall)'].wr === 0 && seeker['Borck solo Lv10 (the wall)'].wr === 0);
  check('MEDIUM — Marrowling BASE solo < 25% both policies',
    canon['Marrowling BASE solo Lv10 (§8 row)'].wr < 25 && seeker['Marrowling BASE solo Lv10 (§8 row)'].wr < 25);
  check(`EASY — Staticur solo wins limping (${canon['Staticur solo Lv10 (the easy gate)'].wr}% at ${canon['Staticur solo Lv10 (the easy gate)'].avgTeam} HP)`,
    canon['Staticur solo Lv10 (the easy gate)'].wr === 100 && canon['Staticur solo Lv10 (the easy gate)'].avgTeam <= 14);
  check('Staticur duos still clear the bar',
    canon['Staticur+Mireling Lv10'].wr === 100 && canon['Staticur+Fenmoth Lv10'].wr === 100);

  // The P11 twins: Undertoll/Concuss change NOTHING against the immune King.
  check('CANONICAL twin: Diverse-4 with Undertoll Sistern is numerically IDENTICAL (max-damage play never picks it)',
    canon['Diverse 4 Lv10 + Undertoll Sistern'].wr === canon['Diverse 4 Lv10'].wr &&
    canon['Diverse 4 Lv10 + Undertoll Sistern'].avgTeam === canon['Diverse 4 Lv10'].avgTeam &&
    canon['Diverse 4 Lv10 + Undertoll Sistern'].avgTurns === canon['Diverse 4 Lv10'].avgTurns);
  check('CANONICAL twin: Concuss-Borck identical to the wall (still 0%)',
    canon['Borck solo Lv10 + Concuss'].wr === 0);
  check(`SEEKER Concuss-Borck fishes an immune King and still stalls out 0% (${seeker['Borck solo Lv10 + Concuss'].wr}%)`,
    seeker['Borck solo Lv10 + Concuss'].wr === 0);
  check(`NO control status EVER landed on the boss (${bossControlLanded} landed / ${bossImmuneFires} immune fizzles exercised)`,
    bossControlLanded === 0 && bossImmuneFires > 0);
}

// ---- (I) the misery check ---------------------------------------------------------
function wildDuel(starter, wild) {
  const r = simBattle([starter], { ...wild, isBoss: false, drain: { above: 0, below: 0, threshold: 0.5 }, maxHp: wild.maxHp }, CANONICAL);
  return r.win;
}

function miseryCheck() {
  console.log('\n=== (I) THE MISERY CHECK — cunning Fenlight vs each solo starter (loss rate) ===');
  const N = 2000;
  const rows = [
    ['REAL wild Fenlight Lv5 (Coldlight fish)', () => makeCreature('Fenlight', 5), 5],
    ['REAL wild Fenlight Lv6 (Coldlight fish)', () => makeCreature('Fenlight', 6), 7],
    ['HYPOTHETICAL Lull-carrier Fenlight Lv7', () => { const f = makeCreature('Fenlight', 7); f.moves.push(mv('Lull')); return f; }, 7],
  ];
  const starters = {
    Slagling: (lv) => makeCreature('Slagling', lv),
    Staticur: (lv) => raisedStaticur(lv),
    Marrowling: (lv) => makeCreature('Marrowling', lv),
  };
  let flagged = [];
  for (const [label, wildMake, starterLv] of rows) {
    const cells = [];
    for (const [name, make] of Object.entries(starters)) {
      let losses = 0;
      for (let i = 0; i < N; i++) if (!wildDuel(make(starterLv), wildMake())) losses++;
      const pct = (losses / N) * 100;
      cells.push(`${name} Lv${starterLv}: ${pct.toFixed(1)}%`);
      if (pct > 25) flagged.push(`${label} → ${name} Lv${starterLv} loses ${pct.toFixed(1)}%`);
    }
    console.log(`  ${label.padEnd(42)} ${cells.join('   ')}`);
  }
  if (flagged.length) {
    console.log('  ⚠ FLAGGED (>25% loss — report to Shane, no tuning authority this phase):');
    for (const f of flagged) console.log('    ' + f);
  } else {
    console.log('  all starters within the band (<25% loss)');
  }
  return flagged;
}

// ---- run --------------------------------------------------------------------------
dataTest();
onActTest();
stunCadenceTest();
onDamagedTest();
cleanseTest();
bossLawTest();
bindTest();
cunningTest();
console.log(failures ? `\n  *** ${failures} FAILURE(S) so far ***` : '\n  all unit checks pass');
const canon = suite('CANONICAL max-damage play', CANONICAL);
const seeker = suite('SEEKER status-fishing play', SEEKER);
bossAssertions(canon, seeker);
const misery = miseryCheck();
console.log(`\nmisery flags: ${misery.length} (reported, not failed — no tuning authority over species this phase)`);
console.log(failures ? `\n*** ${failures} TOTAL FAILURE(S) ***` : '\nALL CHECKS PASS');
process.exit(failures ? 1 : 0);
