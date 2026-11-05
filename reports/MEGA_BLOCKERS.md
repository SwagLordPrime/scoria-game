# MEGA-DAY BLOCKERS — questions for Shane

Opened 2026-08-10 during the P12 → P13 → P14 mega-session. Each entry is something the
build could not settle inside its own authority. Nothing here was guessed at; where a
number was measurable, it was measured, and the recommendation carries the measurement.

Standing authority this session: **corelock levels ±1 · loot weights · Temper accrual
constants.** Species stats, the Barrow-King's numbers, `design/`, and battle-only status
semantics are NOT this session's to move.

---

## B-1 · The sellsword cannot reach his band inside ±1 (P12 §6)

**Band:** "sellsword ≈ rivals" → player win **55–85%** vs the route-built duo Lv8.
**Shipped:** Mireling Lv7 + Fenmoth Lv7 (the §3 bid was Lv6/Lv6; +1 is the whole
authority). **Measured mean: 97.7%** [picks 93.1–100.0].

Level sweep against duo Lv8 (600 trials/cell, mean of the three starter picks):

| delta | Lv | mean win% | |
| --- | --- | --- | --- |
| 0 (the §3 bid) | 6/6 | 100.0 | |
| **+1 (shipped)** | **7/7** | **97.7** | the whole of P12's authority |
| +2 | 8/8 | 97.4 | |
| **+3** | **9/9** | **74.2** | **IN BAND** — needs your say-so |

**The question:** raise him to Lv9/Lv9, or accept that he is a soft fight? Note his
purse (40) sits between Brann's 30 and Vess's 45, and he is placed mid-route — i.e.
between the two reference rungs, not on either. See B-4: the ladder may be the problem,
not the man.

---

## B-2 · The outrider is 1.7 points outside his band (P12 §6)

**Band:** **35–65%** vs the duo Lv8. **Shipped:** Sistern Lv8 + Ashwhelp Lv7 (bid was
Lv7/Lv6). **Measured mean: 66.7%** [picks 0.0–100.0].

The +1 was worth taking on its own merits: at Lv8 the Sistern crosses its **Undertoll**
learnset entry, so the outrider stopped being a stat-check and started putting numens to
sleep — 100% → 66.7% in one level. +2 (Lv9/Lv8) measures **62.4%, IN BAND**.

**The question:** take the second level, or call 66.7% close enough? This is the cheapest
of the three to close.

---

## B-3 · The collector needs +2, and §6 only granted ±1 (P12 §6)

**Band:** **30–55%** vs the pre-boss trio Lv10 — "he's meant to sting."
**Shipped:** Murkmaw Lv13 + Fenlight Lv11 (bid was Lv12/Lv10). **Measured mean: 62.4%**
[picks 10.1–89.2].

| delta | Murkmaw/Fenlight | mean win% | |
| --- | --- | --- | --- |
| 0 (the §3 bid) | 12/10 | 71.8 | |
| **+1 (shipped)** | **13/11** | **63.3** | the ±1 §6 granted |
| **+2** | **14/12** | **45.9** | **IN BAND** |
| +3 | 15/13 | 45.9 | no further movement |

§6 said "tune HIS levels within ±1 to hit bands" — the ±1 is simply not enough, so the
plan's own escape hatch does not reach. **+2 is the answer and it is one word from you.**
Neither numen crosses a learnset entry anywhere in 12→15, so this is a pure stat nudge:
the fight's shape, his override kit (Drag Under + Gloam), and the whisper are unchanged.

---

## B-4 · The bands assume a stochastic engine; combat is near-deterministic (P12 §6)

The finding underneath B-1/B-2/B-3, and the one worth an actual decision.

Every cell in the §6 fight table is **0.0% or 100.0%** unless a control status is in play.
That is not a sim artifact — it is the Phase-3 damage model doing what it was built to do:
no damage variance, no crit, no accuracy roll. Two fixed teams at fixed levels produce one
fixed outcome. Randomness enters combat **only** through status rolls (Undertoll 30%,
Concuss 20%, Gloam 30%) and AI tie-breaks.

So a band like "player win 55–85%" cannot describe a single matchup. It can only describe
a **population**. This phase read it as *the mean across the three starter picks*, which
is defensible — "two of three builds beat him" is a real difficulty statement — but it
means a fight can sit "in band" while being a coin that always lands the same way for any
given player. Rival A is exactly this: **66.7% = Slagling wins, Marrowling wins, Staticur
loses 100%** (Gale into Ember is ×0.66 while Ember into Gale is ×1.5 — the type wheel
working as designed, on the very first duel of the game).

The three readings on the table:

1. **Keep the population reading** (what P12 shipped). Bands describe build coverage. Cheap,
   honest, already in the sim. Accepts that individual matchups stay deterministic.
2. **Widen the reference set** — sim 8–12 archetype parties instead of 3, and band on the
   fraction that win. Better resolution on "beatable but not free"; a half-day of sim work.
3. **Put variance in the engine** (damage spread ±10%, or an accuracy roll). Makes the bands
   literally meaningful — and is a real combat-model change touching every locked boss bar.
   Not a P12-sized decision, and not one to take casually.

**Recommendation: (2) for P15's sim, (3) never, or only with a full boss re-sim.** No action
taken this phase.

---

## B-5 · The §6 reference ladder has a missing rung (P12 §6)

Related to B-1. The three reference parties jump **solo Lv6 → duo Lv8 → trio Lv10** —
that is a doubling of party size and two levels at each step. A mid-route corelock
fielding two Lv6-7 numens straddles the first gap: measured against the fresh Lv6 solo he
wins 66.7% of picks (too hard), against the duo Lv8 he loses 97.7% (too easy). There is no
rung in between for him to be tuned against.

**Suggestion (no action taken):** add a **"duo Lv7"** rung — a starter and one route catch
before the Hollow. It is the party most players actually walk the mid-route with, and it
would give the sellsword and the outrider an honest bar. One line in the sim's `PARTIES`.

---

## B-6 · Two salves break the Ember wall, and price is not the lever (P13 §7)

**The item law says:** the Barrow-King's numbers are LOCKED — "if deep salves flip
Ember-only to a win or make the duo bar safe-comfortable, the lever is **price/stock**
(flag it), never his stats." Both happened. Flagging, with the measurement.

Barrow-King win %, by item budget (2000 trials/row, canonical play):

| team | 0 items | **1 salve** | 2 salves | 2 deep salves |
| --- | --- | --- | --- | --- |
| Ember-only: Slagling Lv8 | 0% | 0% | 0% | 0% |
| **Ember-only: Forgewrought Lv9** | **0%** | 0% | **100%** @7 HP | **100%** @43 |
| **Ember-only: Forgewrought Lv10** | **0%** | **100%** @1 HP | **100%** @12 | **100%** @46 |
| Bloom/Gale lead Mireling Lv10 (the knife-edge) | 100% @**12** | 100% @32 | 100% @**42** | 100% @**60** |
| **Borck solo Lv10 (the wall)** | **0%** | 0% | 0% | **100%** @13 |

Three locked design statements come off:

1. **"The mono-Ember starter path loses the gate, 100%, at every level"** — the sim-tuned
   bar the King's Atk was raised to 15 to hold (`data/bosses.js`). **One 25-gilt salve
   undoes it** at Lv10.
2. **"The Bloom/Gale duo wins on a knife-edge"** (8–12 HP left) becomes a 42–60 HP stroll.
3. **"Borck solo is a stall-loss"** becomes a win with two deep salves.

**The finding that matters: price/stock is a WEAK lever here.** Price does not change the
fight — it changes how many route laps precede it. At *any* purchasable price a determined
player arrives with two salves and the wall is gone; all a price rise buys is grinding.
And the 1-salve row kills the obvious alternative too: a per-battle cap of 1 would still
flip Forgewrought Lv10. So neither lever named in §7 actually closes this.

Real options, none of them P13-sized:

- **(a) Accept it.** Items are *supposed* to be the answer to a wall you cannot out-type.
  The gate stays a real spend (~1 route lap) and the type wheel remains the cheap path.
  Costs nothing; quietly retires three published bars.
- **(b) Item-lock the gate fight.** The King's chamber refuses the bag — one flag on the
  boss def, thematically strong ("nothing you brought will help you here"), and every
  locked bar survives verbatim. **Recommended.**
- **(c) Per-battle item cap of 1.** Measured: does NOT hold the wall (row 3 above). Rules
  it out on the numbers.
- **(d) Re-sim the King against an item budget** and re-tune him to hold the bars *with*
  items. Explicitly forbidden this session — his stats are locked — and it would invalidate
  every bar from P4 onward.

**No action taken.** P13 shipped the items at the §3 prices exactly as specced; the bars
above are published in `P13_REPORT.md` so whichever way this goes, the baseline is on record.

---

## B-7 · Temper's words are ~25 clean wins apart (P13 §6) — calibration note, not a blocker

Measured, so P20 tunes against a number instead of a feeling: Bond moves **+2 per clean
win**, so the first word change (steady → devoted) is **exactly 25 clean wins** away. The
scripted 25-battle session in §7 — nineteen wins, five faints, two berries, one rest —
finishes at **bond 42 / wrath 22 and is still "steady."**

That is arguably correct for v0 (the words should be slow and earned, and the player is
meant to notice them changing rather than watch them tick). Recording it because P20 arms
these meters, and "a full demo playthrough never sees the word change" is a design fact
worth knowing before the teeth go on. If the words should land inside a demo, the lever is
the accrual constants — which **are** in this session's authority, and were deliberately
left at Shane's spec values.

---

## B-8 · The friend build will not run by double-clicking (P14 §7)

`npm run build` emits `<script type="module" crossorigin src="./assets/…">`. Browsers
apply CORS to **module** scripts, and a `file://` page has a null origin — so a playtester
who unzips `builds/scoria-mercloop-2026-08-10.zip` and double-clicks `index.html` gets a
black screen, not the game.

**Verified:** the bundle boots perfectly over http (canvas 800×600, Phaser up, zero console
errors, served from `dist/`). **Not verified in this session:** the file:// failure itself —
the browser harness would not hand me a real `file://` origin to test against. The claim
rests on standard browser behaviour for module scripts, not on a run I made.

Worth noting `vite.config.js` already says `base: './'` was chosen so "a later desktop wrap
(Tauri/Electron, `file://` origin) works without config changes." Relative paths are
necessary for that but not sufficient — the module format is the part that blocks.

**Mitigated for now:** the zip ships a `RUN-ME.txt` with three ways to serve it locally and
a pointer at the eventual hosted link.

**The real fix, one line of config** (not taken — build tooling is outside this session's
tuning authority, and changing the output format after all verification had already run is
exactly the kind of last-minute improvisation the brief warns against):

```js
// vite.config.js
build: { rollupOptions: { output: { format: 'iife' } }, modulePreload: false }
```

That emits a classic script that runs fine from `file://`. It wants one re-verify of the
bundle afterwards. **Recommended before the next playtest drop** — or skip it entirely and
put the build on the private itch.io page, which P32 has planned anyway and which makes the
whole question moot.

---

## Resolved during the session

- **A duel won live paid no gilt** (found in the P14 browser pass). P12 wrote the win path
  before gilt existed; P13's retro payout covered only pre-v5 wins, hiding the gap from the
  economy sim. Fixed in P14 and verified live. Full write-up: `P14_REPORT.md` finding 1.
- **The Contracts panel crashed on any non-empty slate** (same pass) — a shadowed variable
  in `slateLines`. Fixed, with the sim row that missed it now covering a populated slate.
- **Three sim rows had been red since P10/P11** — frozen fixtures the roster grew past.
  Repaired during P12; the whole suite (now ten sims) is green.
