# Creature Collector — Phase 6 Build Plan (for Claude Code)

**Read first:** `PHASE5_BUILD_PLAN.md`, `design/WORLD_AND_CREATURES.md` **§11 (Evolution,
Temper & Move-learning)**, `design/DESIGN_OVERVIEW.md`, and the existing project. Builds on
the shipped leveling system.

## 0. Guardrails (unchanged, critical)
- **Standalone project.** Work only inside `Creature Collector\`. `design/` docs are read-only. Ask before destructive ops. Preserve the grounded
  muted palette. Keep it data-driven.

## 1. Goal — the level-based slice of §11
Build **level-based evolution + innate move-learning + per-stage move slots + stat jumps**,
on the two reachable lines. Per design §11.7 this is the **Neutral branch** (no Temper
meters yet). Everything deeper — Bond/Wrath meters, branching, the forge, passives, the
hero HP pool, third meters — is **explicitly out of scope** (§6 below) but designed in §11.

## 2. Scope

### 2.1 Evolution (level-triggered, data-driven)
- Add an **evolution chain** to creature data: a creature def can declare
  `evolvesTo: <speciesKey>` at `evolvesAtLevel: N`. On reaching that level (via the shared
  XP already built), the creature **evolves**: swaps to the new species' base stats
  (**keeping its current level**, so stats take a real jump via the existing level-scaling),
  keeps its moves, gains its new move slot (§2.3), learns any move on its learnset at that
  level (§2.2), and gets a distinct **new sprite** (larger/more imposing, grounded palette).
- Show an **evolution sequence** (a short "X is evolving… into Y!" beat with the sprite
  change) and a log line. Autosave after.
- Evolution must **persist** across reload (the creature's species key is saved) and reset
  on New Game. (Save already stores species+level; confirm evolved species rehydrates.)

**The two lines to build (both 3-stage, Bruiser):**

*Slagling line — Ember / Bruiser (player starter):*
| Stage | Species | Evolves at | Base HP/Atk/Def/Spd | Slots |
|---|---|---|---|---|
| Base | **Slagling** | → Lv 9 | 32 / 12 / 9 / 6 | 2 |
| 1st | **Forgewrought** | → Lv 15 | 46 / 16 / 13 / 7 | 3 |
| Final | **Warkiln** | — | 66 / 21 / 17 / 7 | 4 |

*Marrowling line — Cinder / Bruiser (catchable wild):*
| Stage | Species | Evolves at | Base HP/Atk/Def/Spd | Slots |
|---|---|---|---|---|
| Base | **Marrowling** | → Lv 9 | 28 / 11 / 9 / 6 | 2 |
| 1st | **Ossclad** | → Lv 15 | 42 / 15 / 13 / 7 | 3 |
| Final | **Bonemarch** | — | 60 / 19 / 16 / 6 | 4 |

(Stat blocks are a tuned starting point — adjust via your sim if needed, keeping the Bruiser
identity: high HP/Atk/Def, low Spd. Evo levels are within the cap structure: 1st evo Lv9 is
reachable under the pre-boss cap 10; final Lv15 needs the post-Barrow-King cap 15.)

*Not evolving in the demo:* Mireling, Fenmoth, Sistern (no lines designed — leave as-is).
Staticur→Voltwraith (the Gale wolf line) is designed in the bible but the wolf isn't
obtainable in the demo yet — **do not add it** this phase.

### 2.2 Move-learning (innate, level-based)
- Add a **learnset** to creature data: `[{ level, move }]`. On reaching a level with a
  learnset entry, the creature **learns that move**. If a free slot exists (§2.3) it's added;
  if the moveset is full, prompt the player to **replace an existing move** (Pokémon-style) or
  skip.
- Moves learned **on evolution** (at the evo level) fill the newly-opened slot.
- **Learnsets (moves; tune power via sim):**
  - **Slagling:** L1 Emberlash (Ember 6), L1 Ram (Neutral 5); **Forgewrought** (Lv9, +slot)
    learns Cinderclad (Ember 7); **Warkiln** (Lv15, +slot) learns **Kiln Burst** (Ember 10,
    signature); Warkiln Lv15 also learns Overheat Slam (Ember 12) → replace-prompt demo.
  - **Marrowling:** L1 Bone Rake (Cinder 5), L1 Clatter (Neutral 4); **Ossclad** (Lv9, +slot)
    learns Marrow Spikes (Cinder 7); **Bonemarch** (Lv15, +slot) learns **Grave Toll**
    (Cinder 10, signature); Bonemarch Lv15 also learns Ossuary Crash (Cinder 12) → replace-prompt.
- New move defs go in the shared move/creature data. Keep the §4 damage model unchanged.

### 2.3 Move slots (LOCKED caps)
- Enforce per-stage slot caps: base **2**, 1st evo **3**, final evo **4** (for these 3-stage
  lines). A moveset can never exceed the current stage's cap. (Single-evo 3→4, non-evolving 4,
  ultra-rare 5 — encode the rule generally so future creatures use it, even though only 2→3→4
  lines exist now.)

### 2.4 Boss re-verify (light — likely fine, but check)
Evolution keeps a creature's **type**, so the Barrow-King thesis still holds (an evolved
**Warkiln is still Ember** → still resisted/mauled by the Cinder boss). And pre-boss the cap
is 10, so players reach at most **Forgewrought** (Lv9) before the gate. Still: **re-run your
sim** including evolved forms up to the reachable cap and confirm the intent is intact
(Ember-only lead loses; Bloom/Gale wins tensely). Adjust boss numbers only if evolution
meaningfully shifts it. Report findings.

## 3. UI
- Evolution animation/beat + log line; "learned <move>" and replace-prompt UI; show a
  creature's moves and level in the party/battle views. Grounded palette throughout.

## 4. Save
- Confirm evolved species + current moveset persist and rehydrate across a full reload; New
  Game resets to base forms and starting movesets.

## 5. Acceptance criteria (done when…)
- [ ] Slagling→Forgewrought→Warkiln and Marrowling→Ossclad→Bonemarch evolve at the right
      levels, with a real stat jump, a new imposing sprite, and an evolution beat.
- [ ] Move slots enforce **2 → 3 → 4**; a new slot opens on each evolution.
- [ ] Creatures learn innate moves at the specified levels; full-moveset learning triggers a
      **replace-or-skip** prompt.
- [ ] Evolved species + movesets **persist across a full reload**; New Game resets them.
- [ ] Barrow-King re-verified by sim with evolved forms in the pool; intent intact; findings
      reported.
- [ ] Boot console-clean; data-driven (evolution + learnsets live in creature data, not
      scene logic); grounded palette preserved.

## 6. Out of scope (designed in §11, DO NOT build here)
Bond/Wrath (Temper) meters and **branching evolution**; the specialty/third meters; the
**forge** and crafted moves; **passives** of any kind; the **hero HP pool** and Wrath chip
damage; the treat/food system; the ranch; the Gale wolf line; the next region. Build ONLY
the level-based Neutral-branch slice above. Leave clean seams.

---
*Chat-side collaborator available for design + review. Flag ambiguity rather than guessing on
evo levels, stat blocks, or the slot rule.*
