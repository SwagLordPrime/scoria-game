# Creature Collector — Phase 7 Build Plan (for Claude Code)

**Read first:** `PHASE6_BUILD_PLAN.md`, `design/WORLD_AND_CREATURES.md` §11.6 (passives —
context; NOT built here), `design/DESIGN_OVERVIEW.md`, and the existing project. Builds on
the shipped combat/evolution systems. **This runs in parallel with an ongoing design pass;
it is self-contained and does not depend on any unfinished world/story work.**

## 0. Guardrails (unchanged, critical)
- **Standalone project.** Work only inside `Creature Collector\`. `design/` docs are read-only. Ask before destructive ops. Preserve the grounded
  muted palette. Keep it data-driven.

## 1. Goal
Build a **data-driven status-effect framework** + **move-effect hooks** (apply-a-status,
recoil), with a starter set of four statuses, and wire a few moves to use them. This is the
**foundation passives will build on** (passives are the next phase — do NOT build them here).
Statuses are **battle-only** for now (cleared when a battle ends).

## 2. Scope

### 2.1 Status framework (data-driven)
- New `src/data/statuses.js`: each status is **data** — roughly
  `{ id, name, flavorType, tick, statMods, healingMod, duration, trigger }`:
  - `tick` — damage/effect applied per activation (flat or a fraction of maxHp; **min 1**).
  - `statMods` — multipliers applied to the creature's effective stats while active
    (e.g. Burn lowers Atk).
  - `healingMod` — multiplier on healing the creature RECEIVES while active (for Rot).
  - `duration` — turns active, then it expires.
  - `trigger` — `'turnEnd'` (most) or `'onAction'` (Bleed: bites when the creature acts).
- Creatures gain a `statuses` list. The battle loop **ticks** active statuses at the right
  moment, applies effects, decrements duration, and expires them at 0.
- One instance per status id (re-applying **refreshes** duration); different statuses stack
  with each other. Effective stats recompute from base±statMods while active.
- **Battle-only:** clear all statuses when the battle ends (no overworld persistence yet —
  note as a future option; would need heal-point cures).

### 2.2 Move-effect hooks (data on moves)
- `applies: { status, chance }` — on a hit connecting, roll `chance` to inflict `status`.
- `recoil: <fraction>` — the user takes `fraction × damage dealt` as self-damage.
- Provide a clean internal hook for a future **passive** to apply a status on-hit (so
  passives slot in next phase) — but **do not build passives now.**

### 2.3 Starter statuses (build these four; tune numbers via sim)
- **Burn** (Ember): DoT ~1/16 maxHp/turn (min 1) **and** −Atk while active; ~3 turns.
- **Poison** (Bloom): DoT, flat or slightly escalating (~1/12 maxHp); ~4 turns.
- **Bleed** (physical/Neutral): DoT that triggers when the creature **acts** (attack/swap),
  ~1/10 maxHp; ~3 turns.
- **Rot** (Cinder): DoT ~1/16 maxHp/turn **and** halves healing received (`healingMod 0.5`);
  ~4 turns.
(Distinct twists so they're not four clones. All numbers tunable.)

### 2.4 Wire it in (so the framework is actually exercised)
- Give a few **existing/new moves** an `applies` (modest chances, ~25–40%): e.g. a Bloom
  move → Poison, an Ember move → Burn, a Cinder move → Rot; add one Bleed move. Keep the §4
  damage model unchanged otherwise.
- **Add `recoil` (~0.25) to `Overheat Slam` and `Ossuary Crash`** — the power-12 moves that
  currently have no downside now cost the user HP. (This is the fix flagged in the Phase-6
  review.)

### 2.5 Boss — preserve verified tuning
- **Do NOT give the Barrow-King a status or change its numbers** — its balance is
  sim-verified and status-free. (A thematic Rot could be added later, deliberately, with a
  re-tune — not now.)
- If any status-capable move can appear in the boss fight (player side), **re-run the sim**
  to confirm the Barrow-King intent still holds (Ember-only loses; Bloom/Gale wins tensely).
  Report.

## 3. UI
- Show active **status icons/labels + turns remaining** on each creature's battle HUD.
- Log application, ticks, and expiry ("X is scorched — Burn!"; "X takes N from Poison";
  "The Burn fades."). Grounded palette.

## 4. Save
- Statuses are battle-only → no save-format change. Confirm mid-battle state isn't persisted
  and that leaving/reloading during no battle is unaffected.

## 5. Acceptance criteria (done when…)
- [ ] Status framework is **data-driven**: statuses live in data; the engine ticks them;
      adding a status = a data entry + (optionally) a move that applies it.
- [ ] All four statuses work correctly: DoT, stat-mods (Burn −Atk), healing reduction (Rot),
      and on-action trigger (Bleed); durations expire; **battle-end clears them.**
- [ ] Moves apply statuses by chance; **recoil works**, and Overheat Slam / Ossuary Crash now
      self-damage.
- [ ] Barrow-King unchanged and **re-verified by sim** with status-capable moves in play;
      intent intact. Findings reported.
- [ ] Status UI (icons + turns) and log lines present; grounded palette; boot console-clean.

## 6. Out of scope (DO NOT build here)
**Passives** (the next phase — this is their foundation); status **persistence out of
battle**; control statuses beyond the four (Snare/Shock/Chill are easy later adds); any
change to the Barrow-King's tuning; the Bond/Wrath meters; the ranch; anything world/story.
Leave clean seams (esp. the passive-applies-status hook).

---
*Chat-side collaborator is mid-design-pass but available for questions/review. Flag ambiguity
rather than guessing on status numbers or the boss re-check.*
