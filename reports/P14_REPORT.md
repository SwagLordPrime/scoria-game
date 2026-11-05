# P14 REPORT — THE CONTRACT BOARD (shipped, tagged `p14`)

*Written by Claude Code at phase close, per the reports law (ledger #30).
Leg 3 of 3 of the 2026-08-10 mega-day.*

## Outcome

Built, verified, tagged. The merc loop closes: take a job, do it, get paid. A general
quest-flag framework ships underneath it, rumor barks land, and every completion records
its faction tag for P15. `scripts/sim-phase14.mjs` is green and so is the whole suite —
**ten sims, phase5 → phase14, zero failures.**

The Barrow-King was not touched. And a live browser session drove the whole loop end to
end, which is how the two real defects below were caught.

## Acceptance (§6)

| | Criterion |
| --- | --- |
| ✅ | Board live with the 7 notices; cap 3; Contracts panel; turn-ins pay |
| ✅ | All four types work off existing event points; repeatable resets |
| ✅ | repLedger records faction tags, effect-free; rumor barks fire per rules |
| ✅ | Sims green incl. the economy-with-contracts band; `reports/P14_REPORT.md`; tag `p14` |

## What shipped

**The framework** (`src/systems/contracts.js`). Four states, four types, cap 3. All of it
rides `flags`, which the save layer already serializes wholesale — so contracts and the
rep ledger are **v5-additive with no version bump at all**.

Two of the four types keep a counter and two read the world, which is the design decision
worth naming: a DUEL contract can never disagree with `flags.duels`, and a SALVAGE job can
never claim materials you have since spent. `syncContracts()` re-derives `active ↔ done`
so the stored state stays truthful — spend your bone-shards and the kiln job quietly drops
back to unfinished rather than staying claimable.

**The board** (§3). Seven notices at the §3 payouts verbatim. P9's Hollow notice is finally
completable and **retro-completes** for anyone who already put the King down. The deep-end
scout only goes up once there is a way down. Progress ticks off event points that already
existed — a wild win, a tile step — with no new systems and no polling.

**Rumor barks** (§4). Five keyed barks, nine lines, priority-ordered, one per visit to the
tavern, never the same one twice running.

**The rep ledger** (ledger #26). Tallied per completion, and grep-proven inert: **zero
readers** across every system and scene, and the only operation performed on it anywhere
is `+= 1`.

## Findings for the record

**1. A live duel win paid nothing. Caught in the browser, not by the sims.**
P12 wrote the duel-win path before gilt existed, so it recorded the flag and *spoke* the
line — "The purse is yours — 30 gilt" — and handed over nothing. P13 then added the
retroactive payout for wins recorded *before* v5, which made the gap invisible: migration
paid correctly, so the economy sim passed, while any duel won in normal play paid zero.
A seam between two legs that neither leg's tests could see, because **no sim can
instantiate a Phaser scene**. Fixed (`addGilt(this.duel.purse)` in `win()`), verified live
(75 → 105 gilt on beating Brann), and covered by a structural regression row. The retro
payout cannot double up — its latch is set by New Game or by migration long before any
live duel can be won.

**2. A shadowed variable crashed the Contracts panel the moment it had anything in it.**
`slateLines` declared `const state = contractState(...)` inside its map callback, shadowing
the `state` parameter used on the line above — a TDZ throw on every non-empty slate. The
sim missed it because the only row exercising `slateLines` asked for an **empty** slate and
returned before the loop. Fixed, and the sim now renders a populated slate too. The lesson
is the general one: a row that only tests the early-return path is not testing the function.

**3. The bark rules starve the tail of the list.** "Priority-ordered" plus "never
back-to-back" means that with several conditions true, the top **two** alternate forever and
the lower keys never fire. That is a faithful reading of §4 and it ships as specced — but if
Shane wants the whole table heard, the rule wants to be *least-recently-said among eligible*
instead of *highest-priority-not-last*. One line in `systems/barks.js`. Noted, not changed.

**4. The economy-with-board band holds, but §5's yardstick was the wrong number.** The
worry was "a single lap trivially funds forge-tier spending" — measured against the
forge-sealed core's 90g, one lap (94.4g) fails. But 90g is a **sell** value on a
**drop-only** item: no amount of grinding buys one, which is the entire point of it being
drop-only. Measured against the top of what the locker actually *sells* (60g), a lap comes
to **1.57×** — the locker stays a real decision. Reported both ways.

**5. The Hollow notice is deliberately untagged.** §3's table tags four notices and leaves
the standing Hollow one blank, so it ships blank — but its own P9 text says "Payment on the
Bone's word." One word from Shane if it should record `bone`. Left alone rather than guessed
at, since a wrong tag seeds wrong reputation in P15.

## Numbers of record

**Economy with board income** (3000 laps × 7 wild wins):

| | gilt/lap | salves |
| --- | --- | --- |
| drops alone (P13 baseline) | 59.4 | 2.37 |
| + the standing cull, run continuously | 94.4 | 3.77 |
| the one-shot board, run once end to end | **370 gilt** | ≈ 4 laps |

One lap buys **1.57×** the priciest thing the locker sells — comfortably funds salves and
cores, does not make the locker irrelevant.

**The live session** (dev server, scenes driven directly): New Game → bind → board → three
notices taken → the fourth refused by the cap → Brann's ambush → both duel refusals
verbatim → loss → blackout → Wrath ramp +3 and streak 1 → wild wins dropping loot and
ticking the cull 3/8 → 8/8 → turn-in paying 40 and the standing job returning to the plank
blank → locker buy/sell lists → bark on entering the tavern, none on a second patron the
same visit, a *different* bark on the next visit → duel won, purse paid, evolution to
Ossclad. **Zero console errors throughout.**

## ⚠ Working names awaiting veto

- The seven notice titles and all their prose — new this phase, and the most tone-sensitive
  text in the build. §3 says Shane tone-reviews at playtest.
- The nine bark lines, same.
- Standing: Gloam · hearth-berry · Ruel · Kest · the item and material names · Marga ·
  Brann · Vess · Tam · Undertoll · Lull · Concuss.

## What P15 wants

- `flags.repLedger` is populated and read by nothing: `{ forge: n, wayfarer: n, bone: n }`.
- `flags.duels` + `flags.duelRecord` carry the who / result / times from P12.
- `flags.contractsTurned` is the running total the board bark already keys off.
- The bark table is the natural home for rep-flavoured lines — it already takes flags and
  a party, and finding #3 above is worth settling first.
