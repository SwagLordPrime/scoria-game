# Creature Collector — Phase 4 Build Plan (for Claude Code)

**Read first:** `PHASE3_BUILD_PLAN.md`, `design/DESIGN_OVERVIEW.md`,
`design/WORLD_AND_CREATURES.md`, and the existing project. Builds on the Phase 3 world.

## 0. Guardrails (unchanged, critical)
- **Standalone project.** Work only inside `Creature Collector\`.
- `design/` docs are read-only context. Ask before destructive ops. Preserve the grounded
  muted palette. Keep the architecture data-driven.

## 1. Goal
Build the **gate boss** that clears the Hollow's collapsed-rubble seam Phase 3 left as a
hook. One unique, named, **defeat-only** boss that enforces the game's core lesson: **you
cannot brute-force it with your starter — you must field a type-diverse caught team.**
This is the payoff of team-building progression (Path 3: leveling is a separate later phase).

## 2. The boss — the Barrow-King
A towering, reassembled bone-titan; the wild apex of the same dead your Marrowling crawls
from. Ancient, buried, dreadful — grounded folklore dread, NOT gore. It sustains itself by
draining life.

- **Type:** Cinder. **Role:** Bruiser (boss-tier).
- **Why it's the gate:** Cinder **beats** Ember. The player's starter is **Slagling
  (Ember)** — leading with it gets mauled. Winning requires **Mireling (Bloom)** and/or
  **Fenmoth (Gale)**, both of which beat Cinder. A mono-starter player hits a wall; a
  player who collected a diverse team and understands the wheel walks through.

- **Signature mechanic — Lifedrain (escalating by the King's OWN HP, not by player deaths):**
  On every successful attack, the Barrow-King heals a fraction of damage dealt:
  - While **above 50% HP**: heals `floor(0.33 × damage dealt)`.
  - At **or below 50% HP**: heals `floor(0.43 × damage dealt)` — a **"feeding frenzy."**
    Surface it in the log the moment it triggers (e.g. "The Barrow-King enters a feeding
    frenzy — its hunger deepens.") and on each drain ("It draws marrow — heals N.").
  - Rationale: escalation ramps tension toward the fight's climax and acts as a **damage
    check** on a player who's winning, rather than a death-spiral that punishes an unlucky
    faint. Do NOT tie escalation to fainting the player's creatures.
  - This is a **self-contained boss rule behind a boss flag**, NOT a general
    status/ability system. Do not build a broader ability framework.

- **Defeat-only:** the **Catch action is disabled** in this battle. If tapped, show flavor
  and no effect ("No core can bind the Barrow-King."). It cannot be added to the party or box.

### Stat block (LOCKED starting point; tune Atk/drain only if needed to hit §2 intent)
- **HP 75, Atk 13, Def 9, Spd 4** (low Spd so the player usually acts first — they'll need it).
- **Moves:** *Marrow Drain* (Cinder, power 7); *Grave Sunder* (Neutral, power 6). Both
  trigger Lifedrain.
- HP 75 is Shane's call — keep it. If the fight needs tuning, adjust Atk and/or the drain
  fractions slightly, not HP, unless simulation shows HP must move.

### Design intent (pin this — tune until true)
- **Winnable** by a player who brings ~1–2 Bloom/Gale creatures and plays the wheel; tense
  because of drain (you must out-damage its healing with super-effective hits, especially
  after the 50% frenzy).
- **Brutal/lethal** to a player who leads with Ember (Slagling) — a clear "wrong tool" beating.
- **Not** beatable by a mono-starter (Ember-only) team.
- **Verify by simulation/playtest**: a reasonable Bloom/Gale-inclusive team wins; an
  Ember-only lead loses. Adjust Atk/drain to land there.

## 3. Encounter flow
- Reaching the rubble seam in The Hollow → a **telegraph first**: an on-approach / NPC line
  ("Danger ahead — something vast stirs in the dark. Steady your team.") warning this is a
  real fight and to heal up. On-tone "stakes with warning" (there is still **no permadeath**
  in V1).
- Gated by a flag `barrowKingDefeated`. If already true, the rubble is cleared and the fight
  does not re-trigger.
- Uses the existing Battle scene in a **boss mode** (flag): Lifedrain on, Catch off, unique
  name, a **distinct larger/imposing bone-titan sprite** (scale up + darken the skeleton
  silhouette in the grounded palette), optional distinct intro line.
- **On victory:** set `barrowKingDefeated`, clear the collapsed rubble, open the existing
  "to be continued" threshold to the next region; **autosave**. Flag persists across reload.
- **On party wipe:** standard black-out → wake at the hearth, fully healed; boss **not**
  cleared, its HP resets, fully retryable.

## 4. Acceptance criteria (done when…)
- [ ] Approaching the Hollow seam telegraphs the fight ("Danger ahead"), then triggers the
      Barrow-King battle — only if `barrowKingDefeated` is false.
- [ ] Catch is disabled in the boss fight (flavor shown); the boss cannot be captured.
- [ ] Lifedrain works and is visible in the log; it heals 33% of damage dealt above 50% HP
      and 43% at/below 50% HP, with a one-time "feeding frenzy" callout when it crosses.
- [ ] **Verified by simulation**: beatable with a Bloom/Gale-inclusive team; lost when led
      by an Ember-only team. Tuning landed on is reported.
- [ ] Victory sets the flag, clears the rubble, opens the threshold, autosaves; the flag
      survives a full page reload.
- [ ] Loss → blackout → hearth heal → boss resets & retryable.
- [ ] Boss defined as data where possible (a boss entry + flags); the drain/catch-lock
      special-casing lives in combat behind a minimal boss flag.
- [ ] Grounded palette + distinct imposing boss sprite. Boot console-clean.

## 5. Out of scope for Phase 4 (don't build)
Catching the boss; real leveling/XP (Path 3 — its own later phase); a general
status/ability system; trainers; player gear; the actual next region beyond the threshold;
permadeath. Leave clean seams.

---
*Chat-side collaborator remains available for design + code review. Build to this plan;
flag ambiguity rather than guessing on mechanics or the win/loss intent.*
