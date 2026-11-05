# Creature Collector — Phase 5 Build Plan (for Claude Code)

**Read first:** `PHASE3_BUILD_PLAN.md`, `PHASE4_BUILD_PLAN.md`,
`design/DESIGN_OVERVIEW.md`, `design/WORLD_AND_CREATURES.md` (esp. §10 "Progression, XP &
faction alignment"), and the existing project. Builds on the shipped V1 core.

## 0. Guardrails (unchanged, critical)
- **Standalone project.** Work only inside `Creature Collector\`.
- `design/` docs are read-only context. Ask before destructive ops. Preserve the grounded
  muted palette. Keep the architecture data-driven.

## 1. Goal
Add the **leveling & XP system** (Path 3): creatures earn shared XP, level up, and grow
stats on a simple per-stat curve, up to a **milestone-gated level cap**. Then **re-tune
and re-verify the Barrow-King** under the new math. Movesets stay fixed (move-learning is
a LATER phase). This is the big deferred RPG piece; the game already stores `level` and
rebuilds stats from it, so save/load is largely ready.

## 2. Mechanics to build

### 2.1 XP — SHARED
- XP is awarded when a wild creature is **defeated OR successfully caught** (both resolve
  an encounter). The **Barrow-King** (boss) also grants XP on defeat.
- **Every non-fainted party member gets the FULL XP amount** (not split) — shared XP keeps
  a diverse bench viable. Fainted members get none for that battle.
- Starting XP formula (tune via sim so reaching the cap takes reasonable play):
  `xpGained = round(BASE_XP * enemyLevel)` — pick `BASE_XP` so leveling feels earned, not
  grindy, given the tiny roster.

### 2.2 Level-up & per-stat growth (Pokémon-style, simple)
- Track `xp` per creature toward the next level; on crossing the threshold, level up
  (repeat if multiple levels gained), **never past the cap** (§2.3).
- **Per-stat growth:** each of HP/Atk/Def/Spd grows with level, per creature. Simple
  starting model: `stat(L) = floor(base * (1 + GROWTH * (L - 1)))` applied per stat off its
  own base, so higher-base stats grow faster (a Striker's Atk/Spd outpace its Def). Start
  `GROWTH ≈ 0.06–0.08` and **tune via sim** so cap-15 stats feel right and the boss stays
  winnable-by-type.
- **HP handling on level-up:** when `maxHp` increases, add the same delta to current `hp`
  (grow the pool — do NOT full-heal on level-up).
- Show a clear **level-up message** with the stat gains, and a one-time notice when a
  creature **hits the cap**.
- XP curve to next level: a gentle curve (e.g. `xpToNext(L) = round(A * L^1.5)`); tune `A`.

### 2.3 Level cap — milestone-gated (the "badge" machinery)
- The cap is a **value raised by cleared-gate flags**, built so faction leaders/rivals plug
  into the same mechanism later (see design §10).
- **V1 numbers:** initial cap **10**; defeating the **Barrow-King** (`barrowKingDefeated`)
  raises the cap to **15**. (This makes the milestone tangible in V1. If you'd rather the
  cap simply be 15 throughout, flag it — but milestone-raises-it is the intended design.)
- Creatures cannot gain levels beyond the current cap (excess XP is held or clamped —
  your call, but a capped creature must not level).

### 2.4 The wilds now actually matter
- Wild `level` ranges already exist per map (route low, cave higher). With stat-scaling,
  **higher-level cave wilds are now genuinely tougher**, not just labeled — this closes the
  cosmetic gap noted in the Phase-4 review. Sanity-check that route→cave difficulty feels
  like a real step up.

## 3. Re-tune the Barrow-King (REQUIRED — do not skip)
Leveling changes all combat math, so the boss's flat-stat tuning (Atk 8 / HP 75, verified
against un-leveled teams) **will no longer hold**.
- Set the Barrow-King at **~level 18** (it out-levels the player's cap on purpose — type
  beats levels).
- Decide whether the boss uses the same per-stat scaling from its base or is authored
  directly at its level-18 stats — **pick one and document it** (avoid double-scaling).
- **Re-run the simulation** (reuse the Phase-4 harness) against **level-capped player teams
  (≤10 pre-boss)** and re-tune boss numbers to preserve the original intent:
  - Ember-only lead (Slagling): **loses**.
  - Bloom/Gale-inclusive team: **wins, but tense** (finish on low HP; the sub-50% feeding
    frenzy should still bite).
  - Report the new tuning and the win/loss table, same as Phase 4.

## 4. Save / UI
- **Extend the save** to persist each creature's `xp`-toward-next-level (add to
  `serializeCreature` / `deserializeCreature`). `level` and `maxHp` already persist;
  confirm leveled creatures rehydrate identically across a reload.
- Persist the **current level cap** (or derive it from milestone flags on load — either is
  fine, but it must survive reload and reset on New Game).
- **UI:** show each creature's level and an **XP indicator** (bar or number) in battle
  and/or the party view; surface level-up and cap-reached messages in the battle log.

## 5. Acceptance criteria (done when…)
- [ ] Winning or catching awards **shared XP** to all non-fainted party members (full, not
      split); the boss grants XP on defeat.
- [ ] Creatures **level up** with visible per-stat growth; HP pool grows without full-heal;
      multiple level-ups in one award resolve correctly.
- [ ] Level **cap enforced**: creatures cannot exceed it; initial cap 10, and defeating the
      Barrow-King raises it to 15 (milestone-driven; survives reload; resets on New Game).
- [ ] Higher-level **cave wilds are meaningfully tougher** than route wilds.
- [ ] **Barrow-King re-tuned and re-verified by simulation** against capped teams: Ember-only
      loses, Bloom/Gale wins tensely. New tuning + table reported.
- [ ] **XP and level persist across a full page reload**; leveled creatures rehydrate
      identically; New Game resets levels/XP/cap.
- [ ] XP indicator + level-up/cap messages present. Grounded palette preserved. Boot
      console-clean.

## 6. Out of scope for Phase 5 (don't build)
Move-learning at set levels (explicitly a LATER phase — keep fixed 2-move sets); the
faction-allegiance system and faction leaders/rivals (the cap-raise beyond the Barrow-King
— design §10, post-V1); evolution; player gear; the next region beyond the threshold;
permadeath. Leave clean seams.

---
*Chat-side collaborator remains available for design + code review. Build to this plan;
flag ambiguity rather than guessing on mechanics, the cap structure, or the boss re-tune
intent.*
