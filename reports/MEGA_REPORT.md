# MEGA-DAY REPORT — P12 → P13 → P14 (2026-08-10)

*Three phases, one Claude Code session, per `PHASE14_BUILD_PLAN.md` §7.
Read this first; the per-phase reports have the detail.*

---

## The headline

**All three legs shipped, gated and tagged: `p12`, `p13`, `p14`.** The demo is complete and
Arc B's spine is in: human opposition, an economy, and a loop that pays.

**Ten sims green** — `sim-phase5` through `sim-phase14`, zero failures. Three of those rows
had been quietly red since P10/P11 before this session started and were repaired on the way
through. The Barrow-King was never touched: his numbers are byte-identical and his locked
bars re-assert to the decimal across every leg.

A live browser pass at the end drove the whole loop — bind, board, ambush, duel, loss,
blackout, grind, turn-in, bark, duel win — and caught **two real defects that no sim could
see**, because no sim can instantiate a Phaser scene. Both fixed, both now covered.

| Leg | Tag | Ships |
| --- | --- | --- |
| **P12 — Corelocks** | `p12` | Five placed duels · wilds arm their learnsets · Charmed debuts on the Ledger collector's Murkmaw |
| **P13 — Gilt & Temper v0** | `p13` | Gilt + wipe laws · field kit with tiered consumable cores · the locker · five-tier loot · Temper meters |
| **P14 — Contracts** | `p14` | Quest-flag framework · seven notices · four contract types · rumor barks · the effect-free rep ledger |

---

## Every sim band against its target

| Band (source) | Target | Measured | |
| --- | --- | --- | --- |
| Rival A, at-level (P12 §6) | 55–85% | **66.7%** | ✅ |
| Rival B, at-level (P12 §6) | 55–85% | **76.2%** | ✅ |
| The sellsword (P12 §6) | 55–85% | 97.7% | ⚠ **B-1** — needs +3, authority was ±1 |
| The outrider (P12 §6) | 35–65% | 66.7% | ⚠ **B-2** — needs +2 |
| The collector (P12 §6) | 30–55% | 62.4% | ⚠ **B-3** — needs +2 |
| Misery re-run, no cell crueler (P12 §6) | 0 crueler | **0** | ✅ Slagling trap gentled 100% → 21.3% |
| Charm coin, live fire (P12 §6) | ~50% | **49.5%** over 3,423 charmed actions | ✅ |
| Charmed never hits its charmer (P12 §6) | 0 HP | **0 HP** across 600 duels | ✅ |
| Boss control immunity (P12 §6) | 0 landed | **0 / 4,747 immune fizzles** | ✅ |
| Route lap, drops only (P13 §7) | 1.5–3 salves | **2.39 salves** (59.7 g) | ✅ |
| Trued + Sleep at 50% HP (P13 §7) | ≈ but ≤ 0.9 | **0.999 → capped 0.9** | ✅ |
| Loot distribution, 10k/tier (P13 §7) | χ² sane | **0.20 – 2.90** across five tiers | ✅ |
| Never a dead drop (P13 §7) | 0 | **0 in 50,000 rolls** | ✅ |
| Reserved-class fallbacks (P13 §7) | always | **6,990 rolls, 0 malformed** | ✅ |
| 0-budget boss bars vs P12 (P13 §7) | identical | **identical** on win rate, ±1 HP on averages | ✅ |
| Item-budget boss rows (P13 §7) | flag flips | **8 flags** | ⚠ **B-6** — two salves break the Ember wall |
| Temper 25-battle accrual (P13 §7) | per §6 | ramp 3,5,7,9,11 exact; ends bond 42 / wrath 22 | ✅ (velocity note **B-7**) |
| Temper has zero teeth (P13 §6) | 0 readers | **0** in combat/status/progression | ✅ |
| Economy with the board (P14 §5) | no trivial forge-tier | **1.57×** the locker's top item | ✅ |
| repLedger effect-free (P14 §5) | 0 readers | **0**, and only ever `+= 1` | ✅ |
| Bark priority + no repeat (P14 §5) | both | **both**, all five keys reachable | ✅ |

**Score: 18 bands hit, 5 flagged** — and every flag has a measured fix waiting on one word
from Shane.

---

## ⚠ Open decisions — `MEGA_BLOCKERS.md`

Eight entries, none of them guesses. Where a number was measurable it was measured, and the
recommendation carries the measurement.

| # | What | Costs |
| --- | --- | --- |
| **B-1** | The sellsword needs **+3** levels to reach his band (74.2%) | one word |
| **B-2** | The outrider needs **+2** (62.4%) — cheapest of the three | one word |
| **B-3** | The collector needs **+2** (45.9%); §6 granted ±1 and ±1 is not enough | one word |
| **B-4** | **The bands assume a stochastic engine.** Combat is near-deterministic — every fight cell is 0% or 100% unless a status roll fires. Three readings offered | a design call |
| **B-5** | The reference-party ladder (solo Lv6 → duo Lv8 → trio Lv10) has a missing rung; a mid-route corelock straddles it | one sim line |
| **B-6** | **Two salves break the Ember wall**, one flips it at Lv10, two deep salves beat Borck-solo. Price is *not* the lever — it changes how many laps precede the fight, never the fight. A per-battle cap of 1 also fails (measured). Recommend an item-lock on the gate chamber | a design call |
| **B-7** | Temper's first word is **exactly 25 clean wins** out; a demo playthrough may never see it change | calibration |
| **B-8** | **The friend build will not run by double-clicking** — ES-module bundle, `file://` CORS. Mitigated with a RUN-ME; the real fix is one line of vite config | one line + a re-verify |

**If Shane only reads two: B-4 and B-6.** Both are "the design says X, and the measurement
says X cannot be true as written" — and both were anticipated by the plans themselves, which
is why they were flagged rather than improvised around.

---

## ⚠ Working names awaiting veto

**New this session:** Gloam (the move) · hearth-berry (the treat) · Ruel (the sellsword) ·
Kest (the Wayfarer outrider) · the six item names and four material names · the seven
contract titles and all their prose · the nine bark lines.

The Ledger collector is deliberately **unnamed** — the Ledger does not introduce itself.

**Standing from earlier phases:** Marga · Brann · Vess · Tam · Undertoll · Lull · Concuss.

The contract and bark prose is the most tone-sensitive text in the build and P14 §3 says
Shane tone-reviews it at playtest. All of it is one-line data changes.

---

## The two defects the browser caught

Worth their own section, because they are the argument for keeping a live pass in the
close-out of every future mega-day.

1. **A duel won live paid no gilt.** P12 wrote the win path before gilt existed, so it
   recorded the flag and *spoke* "The purse is yours — 30 gilt" while handing over nothing.
   P13 then added the retroactive payout for wins recorded *before* v5 — which made the gap
   invisible, because migration paid correctly and the economy sim only ever tested
   migration. A seam **between two legs**, where neither leg's tests looked.
2. **The Contracts panel crashed on any non-empty slate** — a variable shadowing its own
   enclosing parameter, throwing a TDZ error. The sim missed it because the single row
   exercising that function asked for an *empty* slate and returned before the loop ran.

Both are the same lesson in different clothes: **the sims verify the modules, and they
verify them well — but nothing was verifying the wiring between the modules and the
scenes.** Ten green sims and a clean build said the game was fine; five minutes of driving
it said otherwise.

---

## The friend build

`builds/scoria-mercloop-2026-08-10.zip` — 0.36 MB, three files (bundle, `index.html`,
`RUN-ME.txt`). Built from the tagged `p14` tree, boots clean over http with zero console
errors. **Read B-8 before sending it to anyone**: it needs to be served, not double-clicked,
and the RUN-ME says so in three different ways.

---

## What P15 wants

**P15 is Reputation v1, and this session built its whole substrate.** Everything it needs is
populated, persisted, and grep-proven to be read by nothing:

- `flags.repLedger` — `{ forge, wayfarer, bone }`, tallied per contract completion.
- `flags.duels` + `flags.duelRecord` — who, result, and how many times, per corelock.
- `flags.contractsTurned` — the running total the board bark already keys off.
- `flags.duelLossCount` — total duel losses.

Three things to settle before or during the design session (F3):

1. **B-4 first.** The rep model will want difficulty bands too, and if the band metric is
   unsound the next phase inherits the same problem.
2. **The bark table is the natural home for rep-flavoured lines** — it already takes flags
   and a party. Settle B-7's starvation question (`P14_REPORT.md` finding 3) first, or
   rep barks will never fire past the top two.
3. **The Hollow notice is untagged** and its own P9 text says "Payment on the Bone's word."
   One word if it should record `bone` — left alone rather than guessed at, since a wrong
   tag seeds wrong reputation.

And the standing hygiene note: the README body still describes the Phase 3–5 slice. The
banner is current; the body sweep is queued and now four phases further behind.
