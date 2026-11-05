# SCORIA — Phase 11 Build Plan (for Claude Code): THE CONTROL SEAM

**Read first:** `ROADMAP.md` §9 ledger #15–22 (the decisions this plan implements),
`design/DESIGN_OVERVIEW.md` §7c (the status canon), `src/systems/status.js` +
`src/data/statuses.js` (the Phase-7 engine being extended), and `scripts/sim-phase10.mjs`
(the suite that must keep passing). Builds on Phases 0–10.

## 0. Guardrails (unchanged, critical)
- Standalone. `design/` read-only. **Barrow-King numbers LOCKED** — his bars
  hold by construction this phase (denial immunity), and the sim proves it.
- Statuses stay **battle-only** (canon; no overworld persistence).
- Commit per §, tag `p11` at acceptance. Ask, don't guess — especially on hook placement.

## 1. Goal
The status engine learns to **deny and redirect actions**. Wave-2 lands: **Stunned +
Sleep wired** into the roster, **Shock + Charmed shipped dark** (data + passing tests, no
carrier moves). Wilds get a **`cunning` AI flag**. Bosses become **immune to control**.
Sleeping numens are **easier to bind** — the catch formula's statusBonus seam finally
activates. **Out of scope:** wiring Shock/Charmed (P12+), Hasted/Drowning (stay seamed,
ledger #22), trainer AI (P12), any new maps/species.

## 2. Engine — three hooks + two laws (keep each tiny)
1. **`onAct`** — before a creature's chosen action resolves, each of its statuses may:
   - **deny** the action (Stunned, Sleep): consumes the turn, logs in status color.
   - **redirect** it (Charmed): coin flip per action — **50% it strikes ITSELF at half
     power** ("It turns on itself."), **50% it hesitates** (denied). It never targets its
     charmer. (Ledger #17.)
2. **`onDamaged`** — Sleep clears the moment the sleeper takes ANY damage ("It jolts
   awake!"). Fires after damage applies, before drain/recoil bookkeeping confuses order.
3. **Braced (the anti-stunlock law, ledger #15):** when Stunned expires, the target
   cannot receive Stunned again for **2 turns** ("It stands braced." on a blocked apply).
   Implementation free (hidden status entry or cooldown field) — behavior is the spec.
4. **Swap cleanse (ledger #18):** statuses flagged `control: true` (Stunned, Sleep,
   Charmed, Shock) are removed when that creature swaps out. DoTs/statMods (Burn, Poison,
   Bleed, Rot, Slowed, Calcified…) persist exactly as today. Swap already costs the turn —
   now the cost buys an escape hatch.
5. **Boss law (ledger #21):** `isBoss` targets are **immune to `control` applies** — the
   apply fizzles with one dry line ("The Barrow-King does not sleep."). DoTs/statMods
   still land as they always have. No boss re-tuning exists in this phase by construction.
6. **Bind bonus (ledger #16):** `catchChance` gains the canon statusBonus: **×1.5 while
   the target Sleeps** (overall 0.9 cap unchanged). Sleep only — other statuses later, if
   ever. Battle log hints it once per battle ("It sleeps. The core would drink it easy.").

## 3. Statuses (data — `control: true` on all four)
| Status | Effect | Duration | Wired? |
| --- | --- | --- | --- |
| **Stunned** | onAct deny (skip) | 1 action, then Braced 2 turns | ✔ Concuss |
| **Sleep** | onAct deny; onDamaged wake; bind ×1.5 | up to 3 turns or first damage | ✔ Undertoll, Lull |
| **Shock** (Gale) | DoT maxHp/14 per turnEnd + **25% fizzle** per action | 3 turns | ✖ dark (tests only) |
| **Charmed** | coin flip per §2.1 | 2 turns | ✖ dark (tests only) |

Log lines in muted per-status colors per the Phase-7 pattern. One-instance-refresh rules
unchanged. Numbers above are opening bids — §6's sim tunes chance/duration, never the
boss.

## 4. Moves & wiring (ledger #19 — Stun+Sleep only)
| Move | Spec | Carrier |
| --- | --- | --- |
| **Undertoll** | Tide · magic · 4 · applies Sleep 30% | Sistern learnset **Lv8** ("the bell tolls you under") |
| **Lull** | Neutral · magic · 3 · applies Sleep 30% | Fenlight learnset **Lv7** (the lantern-lure gets teeth) |
| **Concuss** | Neutral · physical · 4 · applies Stunned 20% | Borck learnset **Lv8** (a stone limb, swung flat) |

- ⚠ Move names NOT LOCKED (Undertoll / Lull / Concuss) — ship, flag in report, Shane vetoes.
- Starter kits stay status-free (the standing discipline). No other kits change.
- Low powers are deliberate: you pick these FOR the status (the Phase-7 finding).

## 5. Wild AI — the `cunning` flag (ledger #20)
- Species data gains optional `ai: 'cunning'` (default greedy, untouched).
- **Cunning policy:** if my target lacks the status my move applies → open with that
  status move; otherwise damage-max (greedy). Never picks a power-0 move over a kill.
- **Flag Fenlight only** this phase — the route's rare now Lulls you toward deeper water
  before it strikes. Murkmaw stays greedy for now: it is the planned **Charmed debut
  carrier** when Charm wires (P12+, noted for that plan; the Maw's things turn what they
  catch).
- Player-facing readability: cunning is rare-tier behavior; commons stay dumb animals.

## 6. Verification (required — `scripts/sim-phase11.mjs`)
**Unit:** onAct deny consumes turns · Braced blocks re-stun for exactly 2 turns · Sleep
wakes on any damage (and NOT on status ticks that deal no damage) · bind ×1.5 under Sleep
(pure function check vs the 0.9 cap) · Charmed coin distribution + half-power self-hit
math · Shock fizzle rate + DoT (dark) · swap-cleanse removes exactly the control set ·
boss immunity blocks control applies, passes DoTs.

**Battle:**
- **Full P10 suite re-run — every existing assertion must hold untouched.** Undertoll on
  a duo Sistern and Concuss-Borck vs the Barrow-King must change NOTHING (he's immune and
  the moves are damage-downgrades; assert the locked bars exactly).
- **The misery check (player on the receiving end):** cunning Fenlight vs each solo
  starter at route levels — report loss rates; a rare encounter may sting, it must not be
  a coinflip wipe (flag if any starter loses >25%).
- **The bind play:** sim catch attempts vs Slept targets at bands of remaining HP —
  report the new catch curve so the report shows what ×1.5 means in practice.
- Boot + full session console-clean.

## 7. Code health (standing roadmap note)
If BattleScene crosses **~1,100 lines** while wiring onAct, extract turn resolution into
`src/systems/actionResolver.js` (pure, sim-importable) rather than growing the scene.
Judgment call is yours; report it either way.

## 8. Acceptance criteria (done when…)
- [ ] All four wave-2 statuses exist with `control: true`; Stunned+Sleep wired per §4;
      Shock+Charmed dark with passing unit sims.
- [ ] Braced window works; no chain-stun is possible in either direction.
- [ ] Sleep wakes on damage; sleeping targets bind at ×1.5; log hint fires once.
- [ ] Charmed coin flip + self-hit at half power verified in sim (even though unwired).
- [ ] Swap-out cleanses exactly {Stunned, Sleep, Charmed, Shock}; DoTs persist.
- [ ] Barrow-King immune to control with the dry line; **every locked bar from
      sim-phase10 re-asserts green.**
- [ ] Fenlight plays cunning (Lull first, then hunts); commons unchanged.
- [ ] Misery check within band or flagged; console-clean; committed per §, tagged `p11`.

---
*Chat-side collaborator on call. Flag rather than guess: hook ordering vs drain/recoil,
the Braced implementation shape, and ANY sim row that tempts a boss-side change. Names
(Undertoll, Lull, Concuss) are working names for Shane's veto.*
