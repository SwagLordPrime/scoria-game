# P12 REPORT — CORELOCKS: THE FIRST DUELS (shipped, tagged `p12`)

*Written by Claude Code at phase close, per the reports law (ROADMAP §9 ledger #30).
Leg 1 of 3 of the 2026-08-10 mega-day.*

## Outcome

Built, verified, tagged. Human opposition exists: five placed corelock duels, the wilds
arm their learnsets, and Charmed has its first carrier in the world. `scripts/sim-phase12.mjs`
is green, and so is **every prior sim (phase5 → phase11)** — two of which had been red
since P10 and were repaired on the way through (see *Stale-fixture repair* below).

The Barrow-King is provably untouched: every locked bar re-asserts to the decimal, and
**0 control statuses landed on him across 4,747 immune fizzles**.

## Acceptance (§7)

| | Criterion | |
| --- | --- | --- |
| ✅ | Five duels live, placed, in-voice; rivals derive from flags; collector post-boss-gated with the Murkmaw whisper intact | |
| ✅ | No-bind / no-flee laws + duel flags recorded (the P15 rep seam) | |
| ✅ | Wild learnsets live; Lull@6; misery table reported | |
| ✅ | Gloam/Charmed live on the collector; scene-proven coin + cleanse | |
| ⚠ | Sim bands hit **or flagged** — 2 of 5 hit, **3 flagged** with measured fixes | `MEGA_BLOCKERS.md` B-1/B-2/B-3 |
| ✅ | Boss bars green; reports law satisfied; tagged `p12` | |

## What shipped

**The duel rule set** (`src/systems/corelocks.js`, `src/data/corelocks.js`). A duel is the
Phase-3 battle with three laws bolted on — no binding (*"Its core answers to another."*),
no fleeing (*"You signed the duel."*), and a **team** on the other side that sends out its
next numen when one falls. Neither refusal costs the turn. Nothing in `combat.js` or
`status.js` changed to make it work; `chooseEnemyMove` gained one name in a set.

**The cast.** Brann on the route's first bend (ambushes once, then waits — a loss can never
trap a spent party in a re-challenge loop), Ruel mid-route, Kest at the town gate, Vess at
the Hollow's mouth, and — post-boss only, in the room the King was standing in — the Ledger
collector, measuring the opened seam with knotted cord. Rival benches derive from
`flags.rivals`; no corelock def names a starter species literally (grep-asserted).

**The record.** `flags.duels[id]` is `'won' | 'lost'` — what P13 reads to pay these purses
retroactively and what P15 reads for reputation. `flags.duelRecord[id]` keeps the *times*
(ledger #26 asked for who / result / times). A win stands a corelock down (`rematch: false`);
a **loss leaves them standing**, so a beaten party can heal and come back. The seam is
grep-proven inert: **0 gameplay readers** outside the corelock modules.

**Wilds arm their learnsets** (ledger #27). A creature the *world* fields now knows its base
kit plus every learnset entry at or below its level, clamped to the slot cap — highest level
wins, earliest seat breaks the tie. Three wilds actually changed: route Fenlight@6 (Lull),
Deep Hollow Sistern@8-9 (Undertoll), Deep Hollow Borck@8-9 (Concuss). The deep got scarier
on purpose.

**Gloam** — Umbra · magic · 4 · Charmed 30%. The only Charmed carrier in the game, and it
lives on one man's Murkmaw. Wild Murkmaw is untouched: base kit, no learnset, still a pure
epic chase. Grep-asserted that no encounter table at any level can roll a Gloam.

## Findings for the record

**1. The misery trap gentled exactly as P11 predicted.** Wild Fenlight Lv6 vs a solo Slagling
Lv7 went **100% → 21.3% loss** the moment the wild started carrying Lull — control trades
away damage tempo, precisely the P11 finding. No route or cave cell got crueler than its
predecessor. The Deep Hollow rose (allowed, by design) but a Lv10 solo still clears its
Lv9 denizens; the only deep loss is **Staticur vs Murkmaw Lv10 at 100%**, which is the epic
chase eating a Gale striker and is working as intended.

**2. Combat is near-deterministic, and the §6 bands assume it isn't.** Every fight cell is
0.0% or 100.0% unless a status roll is in play — no damage variance, no crit, no accuracy
in the Phase-3 model. A "55–85%" band therefore cannot describe one matchup, only a
population; this phase read it as the mean across the three starter picks. **Rival A is
"in band" at 66.7% while being a hard 100/0/100** — Staticur loses every time, because Gale
into Ember is ×0.66 and Ember into Gale is ×1.5. That is the type wheel doing its job on
the very first duel of the game, and the duel is declinable, so it ships. Full write-up and
three options in `MEGA_BLOCKERS.md` **B-4**.

**3. Three bands need authority this phase didn't have.** The sweep was run (levels −1 → +3,
600 trials/cell) and the answers are known, not guessed:

| Fight | Band | Shipped (+1) | Lands in band at |
| --- | --- | --- | --- |
| sellsword vs duo Lv8 | 55–85% | 97.7% | **+3** → 74.2% |
| outrider vs duo Lv8 | 35–65% | 66.7% | **+2** → 62.4% |
| collector vs trio Lv10 | 30–55% | 62.4% | **+2** → 45.9% |

§6 granted ±1 on the collector's levels expecting it to be enough; it isn't. All three are
one word from Shane (`MEGA_BLOCKERS.md` B-1/B-2/B-3). The sim **flags** rather than fails
these — the P11 convention for a number outside its target that the phase cannot close —
but asserts the flagged set is *exactly* those three, so a new drift still fails.

**4. The +1 on the outrider paid for itself.** Lv8 crosses the Sistern's Undertoll entry, so
he stopped being a stat-check and started tolling numens under: 100% → 66.7% on one level.
Worth noting for P15's rematch tuning — a level that crosses a learnset entry is worth far
more than a level that doesn't.

**5. Binding now keeps the kit.** A wild joins your party with the moveset it *fought you
with*, not a blank base kit. Before P12 those were identical, so nothing regressed; now a
Lv9 Sistern would otherwise have forgotten Undertoll on the way into the core. Judgment
call, not specified by the plan — flagged here because it is a small power gain for the
player (it is also the only way to obtain an above-learn-level move on a caught numen).

**6. Stale-fixture repair — three sim rows had been red before this session started.**
Verified against a clean HEAD worktree, so none of these were P12's doing:
`sim-phase8` froze "exactly one magic move ships" (P11 broke it with Undertoll/Lull);
`sim-phase9` froze the magic roster, "18 species" (P10's wolf line made 20), and "New Game
wakes holding a Slagling" (P10's choice-at-the-table removed the auto-grant). Each row kept
its real invariant and dropped its frozen snapshot. Bookkeeping, never behaviour — but the
suite had been quietly lying for two phases.

## Numbers of record

**The five fights** (player win %, 1000 trials/cell, canonical max-damage play):

| corelock | pick | fresh Lv6 | duo Lv8 | trio Lv10 |
| --- | --- | --- | --- | --- |
| rivalA | Slagling / Staticur / Marrowling | 100.0 / 0.0 / 100.0 | 100.0 / 100.0 / 100.0 | 100 / 100 / 100 |
| sellsword | " | 100.0 / 0.0 / 0.0 | 100.0 / 100.0 / 93.1 | 100 / 100 / 100 |
| outrider | " | 0.0 / 0.0 / 0.0 | 0.0 / 100.0 / 100.0 | 100 / 100 / 100 |
| rivalB | " | 0.0 / 0.0 / 0.0 | 77.4 / 100.0 / 51.3 | 100 / 100 / 100 |
| collector | " | 0.0 / 0.0 / 0.0 | 0.0 / 0.0 / 0.0 | 89.2 / 10.1 / 87.9 |

**Charm live-fire** (600 collector duels): Gloam landed 1,738×; 3,423 charmed actions split
1,694 self-strikes / 1,729 hesitations = **49.5% self**; every self-hit matched the
half-power formula exactly; **0 HP was ever dealt to the charmer**; swap cleanses Charmed
and leaves DoTs.

**Barrow-King, both policies — every bar identical to P11.** These are the rows P13 §7 must
re-assert byte-identical at the 0-item budget:

| team | canonical | seeker |
| --- | --- | --- |
| Ember-only Slagling Lv8 / Forgewrought Lv9 / Lv10 | 0.0% | 0.0% |
| Bloom/Gale lead Mireling Lv10 | 100.0% @ 12 HP, 13 turns | 98.4% @ 38.9 HP |
| Bloom/Gale lead Fenmoth Lv10 | 100.0% @ 8 HP, 13 turns | 97.9% @ 19.6 HP |
| Diverse 4 Lv10 | 100.0% @ 112 HP, 13 turns | 100.0% @ 137.7 HP |
| Ossclad solo Lv10 | 100.0% @ 38.7 HP | 100.0% @ 36.7 HP |
| Borck solo Lv10 (the wall) | 0.0% | 0.0% |
| Marrowling BASE solo Lv10 | 0.0% | 0.0% |
| Staticur solo Lv10 (the easy gate) | 100.0% @ 3 HP, 7 turns | 100.0% @ 3 HP |
| Staticur+Mireling / +Fenmoth Lv10 | 100.0% @ 51 / 35 HP | 100.0% @ 51 / 35 HP |
| twins: Diverse-4+Undertoll · Borck+Concuss | identical to twin · 0.0% | identical · 0.0% |

## ⚠ Working names awaiting veto

- **Gloam** (the move) — new this phase.
- **Ruel** (the sellsword), **Kest** (the Wayfarer outrider) — new NPC names; `NAMES.md`
  defers NPCs by design. The Ledger collector is deliberately **unnamed** (STORY §8).
- Standing from P10/P11: Marga · Brann · Vess · Tam · Undertoll · Lull · Concuss.

## What P13 wants

- `flags.duels` is populated and waiting: pay every `'won'` purse **exactly once** on the
  first v5 load. Purses are 30 / 40 / 45 / 60 / 90.
- Duel *stakes* (ledger #26: half the purse, min 10) replace the 10% wipe law — the loss
  path already records `duelLossCount`.
- The 0-budget Barrow-King rows above are the byte-identical baseline P13 §7 must reproduce.
- `MEGA_BLOCKERS.md` B-1/B-2/B-3 are still open and cost one word each.
