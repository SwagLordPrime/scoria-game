# P13 REPORT — GILT, THE FIELD KIT & TEMPER v0 (shipped, tagged `p13`)

*Written by Claude Code at phase close, per the reports law (ledger #30).
Leg 2 of 3 of the 2026-08-10 mega-day.*

## Outcome

Built, verified, tagged. The merc economy breathes: gilt, a lean field kit, the innkeep's
locker, tiered cores that binding now consumes, the five-tier loot engine, Temper v0, and
the wipe laws. `scripts/sim-phase13.mjs` is green and so is the whole suite (phase5 →
phase13). P12's recorded purses pay out retroactively, exactly once.

The Barrow-King's numbers are untouched and his **0-budget bars reproduce P12's exactly**.
Items at a budget do move three of his locked rows — which §7 predicted and told me to
flag rather than fix. See *Findings 2* and `MEGA_BLOCKERS.md` **B-6**.

## Acceptance (§8)

| | Criterion |
| --- | --- |
| ✅ | Gilt live with all sources/sinks; retro purses pay once; wipe laws per ledger |
| ✅ | Field kit + Item battle action + the locker; binding consumes tiered cores; never-zero law holds at locker and hearth |
| ✅ | Loot engine rolls five tiers; reserved classes fall back with the line; berry feeds Bond |
| ✅ | Temper v0 accrues per spec; the word shows; **zero** combat effect; persists v5 |
| ⚠ | All §7 rows reported; **0-budget boss bars identical**; economy lap in band — with **8 item-law flags** (B-6) |
| ✅ | `reports/P13_REPORT.md` written; committed per §; tagged `p13` |

## What shipped

**Gilt** (`src/systems/economy.js`). One int, two ways it bleeds. A wild-battle wipe costs
10% of what you carry (ledger #10), floored at zero; a lost **duel** costs the stake —
half the purse, minimum 10, capped by your purse — and that **replaces** the 10% (ledger
#26). Never items, never numens, one dry line each.

**The retro payout.** P12 recorded its purses as flags because gilt did not exist. The
first v5 load settles the debt and latches on a flag, so it can never pay twice — verified
across migration, three reloads, and a v5 blob saved after the fact.

**The field kit** (`src/data/items.js`). Six carried items, four salvage materials, one
treat, at the §3 prices verbatim. Binding **consumes a core**, spent whether it holds or
not; tier is the player's choice at the throw when they hold more than one, and the throw
menu shows each tier's real hold chance. The never-zero law (ledger #9) is satisfied twice
over: the locker's stock is a constant so roughs can never sell out, and a hearth rest tops
you back up to three — logged only on a rest that actually left cores, so it never becomes
wallpaper. No revive. Fainted stays fainted until a hearth.

**The locker** (§4). Maren keeps it behind the bar — no new NPC; she is the innkeep the
board already told you to ask for the mark. Her lines run first and the menu is the second
branch, so you always get the room's voice before you get a shop.

**The loot engine** (§5, ledger #24). Rolls on every wild win — not on duels (the purse is
the reward) and not on the boss (the opened threshold is his drop). Keyed by the encounter's
rarity tier and the map: you strip bone in the barrow-fields and fused glass in the wastes.
The three **reserved payload classes** exist in the schema now with their drop rates already
tuned, and every one of them resolves to a rich salvage bundle and a line that promises
without explaining. Their host systems were not built, as instructed.

**Temper v0** (§6, ledger #25). Bond, Wrath and a hidden faint streak on every creature,
persisted in v5. The ramp is Shane's spec exactly — **3, 5, 7, 9, 11, 11…** — and a battle
survived resets the streak, so it measures a *run* of neglect rather than a lifetime total.
One muted word in the party panel is the only place any of it surfaces. Grep-proven to have
**no teeth**: `combat.js`, `status.js` and `progression.js` do not contain the word.

## Findings for the record

**1. The economy lands mid-band.** A seven-win route lap nets **59.7 gilt-equivalent =
2.39 salves** (8.5 per win), against §7's 1.5–3 band. The faucet is real but not rich: a
lap cannot buy a trued core outright. Loot weights were left at their authored values —
no tuning was needed.

**2. Two salves break the Ember wall, and price is not the lever.** The item-budget rows
flip three locked design statements: Ember-only Forgewrought goes 0% → 100% (at Lv10, on
**one** salve), the Bloom/Gale knife-edge goes from 12 HP left to 42–60, and Borck-solo
stops being a stall-loss on two deep salves. §7 named price/stock as the lever, and the
measurement says **price cannot reach this**: price changes how many laps precede the
fight, never the fight. The 1-salve row (added beyond §7's three budgets precisely to ask
this) also rules out a per-battle cap of 1. Recommended fix is an **item-lock on the gate
chamber** — one flag, thematically strong, every bar survives. Shane's call:
`MEGA_BLOCKERS.md` **B-6**, with the full table.

**3. Temper's first word is exactly 25 clean wins away.** Bond +2 per clean win against a
50-point threshold. The scripted 25-battle session (19 wins, 5 faints, 2 berries, a rest)
ends at **bond 42 / wrath 22 — still "steady."** Probably correct for v0, but it means a
full demo playthrough may never see the word change. Calibration note for P20 in **B-7**;
the accrual constants were in this session's authority and were deliberately left at spec.

**4. Rot bites items too, for free.** Item healing goes through `healingReceivedMod`, so
the Phase-7 framework halves a salve on a rotted numen with no special case — the same
line that already halved the King's Lifedrain. Verified: 8 HP instead of 16.

**5. The catch curve is now three curves.** Trued + Sleep at 50% HP computes 0.999 and
lands on the 0.9 cap — the multiplier stacks *before* the cap and the cap still rules,
exactly as ledger #16 wrote it. A full-HP target remains a bad bet even forge-sealed
(8% awake, 12% asleep).

**6. Two stale fixtures updated, both genuine P13 consequences** (not drift): sim-phase10's
"the initial save is v4" is now v5, and sim-phase12's battle-menu row now expects
`Fight/Bind/Item/Swap/Run`. Both rows kept their real invariant — the menu row still asserts
a **closed** set with no save door.

## Numbers of record

**Catch curve** (Fenmoth Lv8, rough / trued / forge-sealed):

| HP left | awake | asleep |
| --- | --- | --- |
| 100% | 5.0 / 6.3 / 8.0 | 7.5 / 9.4 / 12.0 |
| 75% | 29.1 / 36.4 / 46.6 | 43.7 / 54.6 / 69.9 |
| 50% | 53.3 / 66.6 / 85.2 | 79.9 / **90.0** / **90.0** |
| 25% | 80.9 / **90.0** / **90.0** | 90.0 / 90.0 / 90.0 |

**Loot distribution** — 10,000 rolls per tier, observed vs table weight: common χ²=0.43,
uncommon χ²=1.02, rare χ²=2.90, epic χ²=0.20, mythic χ²=0.98. **0 dead drops in 50,000
rolls.** 6,990 reserved rolls, all three classes reached, **0 malformed fallbacks.**

**Barrow-King, four budgets** (2000 trials, canonical). The 0-item column is byte-identical
to P12's on win rate and within ±1 HP on the averages (the residual is Marrow Spikes' 30%
Rot roll, which halves the drain):

| team | 0 items | 1 salve | 2 salves | 2 deep |
| --- | --- | --- | --- | --- |
| Ember-only Slagling Lv8 | 0% | 0% | 0% | 0% |
| Ember-only Forgewrought Lv9 | 0% | 0% | 100% @7 | 100% @43 |
| Ember-only Forgewrought Lv10 | 0% | 100% @1 | 100% @12 | 100% @46 |
| Bloom/Gale lead Mireling Lv10 | 100% @12 | 100% @32 | 100% @42 | 100% @60 |
| Bloom/Gale lead Fenmoth Lv10 | 100% @8 | 100% @8 | 100% @3 | 100% @13 |
| Diverse 4 Lv10 | 100% @112 | 100% @132 | 100% @142 | 100% @160 |
| Ossclad solo Lv10 | 100% @38.3 | 100% @41.5 | 100% @41.7 | 100% @43.7 |
| Borck solo Lv10 (the wall) | 0% | 0% | 0% | 100% @13 |
| Marrowling BASE solo Lv10 | 0% | 0% | 0% | 0% |
| Staticur solo Lv10 | 100% @3 | 100% @10 | 100% @17 | 100% @21 |
| Staticur+Mireling Lv10 | 100% @51 | 100% @58 | 100% @65 | 100% @69 |
| Staticur+Fenmoth Lv10 | 100% @35 | 100% @42 | 100% @49 | 100% @53 |

## ⚠ Working names awaiting veto

- **Hearth-berry** (the treat) — new this phase.
- Item names (Salve · Deep salve · Clean rag · Rough/Trued/Forge-sealed core) and the four
  materials (Bone-shard · Wire-spool · Spore-leather · Ash-glass) — all new, all one-line
  changes in `data/items.js`.
- Standing: Gloam · Ruel · Kest · Marga · Brann · Vess · Tam · Undertoll · Lull · Concuss.

## What P14 wants

- `flags.duels` is read by DUEL contracts; the outrider's id is `outrider`.
- Materials exist for SALVAGE contracts: `boneShard` (4g) and `wireSpool` (7g) are the two
  the board asks for, and both are on the route/cave drop tables.
- Save v5 is the additive baseline; `contracts` and `repLedger` slot in the same way.
- The economy baseline to re-measure with board income: **59.7 gilt/lap, 2.39 salves.**
