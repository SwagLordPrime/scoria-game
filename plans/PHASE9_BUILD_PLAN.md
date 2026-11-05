# SCORIA — Phase 9 Build Plan (for Claude Code): THE DEMO REGION MADE REAL

**Read first:** `design/NAMES.md` (the name sheet of record), `design/ROSTER.md` (§5–§7:
the full demo roster + stat blocks), `design/STORY_AND_WORLD.md` (§1 premise, §9 map/start,
§8 storytelling philosophy), `design/DESIGN_OVERVIEW.md` (§7c status roster), and the
existing project. Builds on Phases 0–8.

## 0. Guardrails (unchanged, critical)
- **Standalone project.** Work only inside `Creature Collector\` (the folder name stays
  for now — renaming the directory is Shane's call, not yours). `design/` docs are
  read-only. Ask before destructive ops. Grounded muted palette. Data-driven.

## 1. Goal
Land the world pass in the game: **the game becomes SCORIA.** Nine new numens with
rarity-weighted encounters across three new/extended areas, wave-1 statuses, the
`target:'self'` move hook, and the locked vocabulary (title, numens, the Numinary, bind).
**Out of scope (Phase 10+):** starter-select + the Staticur/Voltwraith line, trainers
("corelock" battles), economy/gilt, passives, Temper, wave-2 control statuses.

## 2. Vocabulary & title (the sweep lands in-game)
- Title screen / window title / index.html: **"SCORIA: What the War Left."**
- "creature" → **numen** (plural **numens**) in battle/catch/party/compendium text.
- Compendium header → **"the Numinary."**
- Catch language: you **bind** a numen ("The wild Ashwhelp was bound!" / "The core holds.").
- Keep code identifiers as-is where renaming risks churn (species keys etc.) — this is a
  UI/text sweep, not a refactor.

## 3. New moves (add to the shared move table; kinds per Phase 8)
| Move | Type · Kind · Power | Hook |
| --- | --- | --- |
| Nip | Neutral · physical · 5 | — |
| Barbed Kick | Neutral · physical · 5 | applies **Bleed 25%** (the first Trickster gets teeth — SIM IT, see §8) |
| Coldlight | Tide · magic · 6 | applies **Slowed 25%** |
| Beckon | Neutral · magic · 4 | — |
| Drag Under | **Umbra** · magic · 7 | — (the game's FIRST exotic-type move; chart shipped in Phase 8) |
| Snatch | Neutral · physical · 5 | — |
| Petrified Maul | Cinder · physical · 6 | — |
| Calcify | self · status move (no damage) | applies **Calcified** to SELF (needs §5 hook) |
| Spore Burst | Bloom · magic · 5 | — |
| Swarm | Neutral · physical · 5 | — |
| Sporestorm | Bloom · magic · 8 | — |

## 4. New statuses (wave 1 — data entries on the Phase-7 engine)
- **Slowed:** Spd ×0.6 · 3 turns · turnEnd no-tick (pure statMod). Wired: Coldlight.
- **Calcified:** Def ×1.35 · 3 turns · beneficial (self-buff). Wired: Calcify.
- **Hasted:** Spd ×1.4 · 3 turns · beneficial. **Ship in data + sim tests, wire to no move
  yet** (clean seam for the arena/next region).
- **Drowning:** Tide · escalating DoT (maxHp/16 → /12 → /8 per successive turn) · 3 turns.
  **Ship in data + sim tests, unwired** (same seam).
- Log lines in each status's muted color, per the Phase-7 pattern. Battle-only, as ever.

## 5. Engine extension — self-targeting applies (small, required)
`applies` gains an optional `target: 'self' | 'foe'` (default `'foe'`). A self-applied
status uses the same engine (statMods etc.). A **damage-less status move** (Calcify) must:
consume the turn, always "hit" self, log cleanly, and still respect one-instance-refresh
rules. This is the hook the roster flagged; keep it tiny.

## 6. The nine new numens (data + code-gen sprites, grounded palette)
Stats are HP/Atk/Mag/Def/Spd · slot caps per the locked rule (2-stage 3→4; non-evolving 4).

| Numen | Type/Role | Rarity · Where | Stats | Kit (L1) | Evolution |
| --- | --- | --- | --- | --- | --- |
| **Ashwhelp** | Ember/Striker | common · Ashen Wastes | 22/11/4/6/12 | Emberlash, Nip | none (4 slots) |
| **Sporemote** | Bloom/Battle Mage | common · Ashen Wastes | 24/9/10/6/9 | Spore Burst, Swarm | → Mycelegion @17 (3→4) |
| **Ashcap** | Bloom/Warden | uncommon · Ashen Wastes | 34/7/8/12/4 | Spore Bash, Spore Burst | → Mycolith @13 (3→4) |
| **Mycolith** | Bloom/Warden | (evolved form) | 46/8/13/16/4 | +Sporestorm on evolve | final |
| **Mycelegion** | Bloom/Battle Mage | (evolved form; cap-gated) | 40/13/15/9/8 | +Sporestorm on evolve | final |
| **Snarebriar** | Bloom/Trickster | uncommon · Fell-Grass Route | 24/9/6/8/11 | Spore Bash, Barbed Kick | none (4 slots) |
| **Fenlight** | Tide/**Sorcerer** | rare · Fell-Grass Route | 24/5/13/7/10 | Coldlight, Beckon | none (4 slots) |
| **Borck** | Cinder/Warden | uncommon · The Hollow | 36/9/3/13/4 | Petrified Maul, Calcify | none SHIPPED (3 slots; Dolmen is post-V1 — do NOT build) |
| **Murkmaw** | **Umbra**/Trickster | **epic · the Deep Hollow ONLY** | 30/7/11/9/12 | Drag Under, Snatch | none (4 slots) |

Notes: Ashcap→Mycolith and Sporemote→Mycelegion ride the EXISTING evolvesTo system (these
are the Neutral branches; no Temper machinery). Mycelegion @17 is deliberately above cap 15
— it ships in data and gates itself. **Do not build Dolmen or Pyrecap.** Sprites: 9 new
(the two evolved forms included), each distinct and imposing per rarity; Murkmaw should
read as a patch of dark with a suggestion of a mouth — dread, not gore.

## 7. World: new & extended areas + encounters
**Rarity-weighted encounter tables** (new structure, data-driven; starting weights —
tune): common 60 · uncommon 30 · rare 9 · epic (deep Hollow only) ~10 within that room.
- **NEW — the Ashen Wastes** (exterior, west of / around Emberfall; ash palette, a
  war-relic cluster as a landmark): Ashwhelp (c), Sporemote (c), Ashcap (u).
- **NEW — the Emberfall Tavern** (interior): **New Game now spawns here** (Continue loads
  wherever the save stood — verify old saves unaffected). Innkeep + patrons (§9) + a
  contract board whose first notice points at the Hollow. Player still receives Slagling
  as before (starter-select is Phase 10).
- **NEW — the Deep Hollow**: a dark sub-area **BEYOND the Barrow-King's chamber** — the
  gate literally guards it; it is unreachable until the King falls. Darkest palette, "past
  the last lantern." Encounters: Murkmaw (epic). This placement is a deliberate design
  lock: the hidden chase cannot trivialize the gate because it sits behind it.
- **EXTENDED — The Hollow:** add Borck (u) to the existing table.
- **EXTENDED — Fell-Grass Route:** add Snarebriar (u) and Fenlight (rare; if cheap, bias
  Fenlight toward the wetter/rut tiles — otherwise general rare is fine; the "dusk" in its
  blurb stays flavor, do NOT build a day/night system).

## 8. Verification (required — extend the sim to `sim-phase9.mjs`)
- Engine: self-target applies; all four new statuses (incl. Drowning's escalation and the
  buff statuses' stat-mods); encounter-table weighting; new-move damage routing.
- **Full Barrow-King suite re-run.** Must hold: Ember-only loses; Bloom/Gale duo wins
  tense; raised-Ossclad counter intact. NEW checks: **Borck-solo = stall-LOSS** (a
  self-buffing wall must not out-sustain Lifedrain — if Calcify flips it, report before
  touching anything); **Snarebriar in duo comps** (Barbed-Kick Bleed ≈ the Phase-7
  status-fishing findings — a gamble, not a free win); assert (via map graph if feasible)
  **the Deep Hollow is unreachable pre-boss.** Boss numbers UNCHANGED.
- Saves: v3 loads clean (new species/moves are additive); New Game → tavern spawn; reset
  correct. Boot + full session console-clean.

## 9. NPC whispers (the vocabulary breathes — per §8 mystery-over-hand-holding)
4–6 short lines, grounded, zero exposition dumps. Must include: the innkeep using
**numens** naturally and doubting **the Calm** will hold; an old patron who was *"born in
the Melancholy"*; a shaken miner: something in the deep Hollow **eats the lantern-light —
even the barrow's dead won't go near it** (the Murkmaw hook); optionally a Wayfarer
passing through. Write in-voice; Shane reviews tone in playtest.

## 10. Acceptance criteria (done when…)
- [ ] Title screen reads **SCORIA: What the War Left**; numen/Numinary/bind vocabulary live.
- [ ] All 9 new numens exist with sprites; catchable per placement; both Neutral-branch
      evolutions fire (Mycolith reachable post-boss; Mycelegion correctly cap-gated).
- [ ] Rarity-weighted encounters live across Wastes / Route / Hollow / Deep Hollow.
- [ ] Deep Hollow exists, is atmospheric, and is **provably gated behind the Barrow-King.**
- [ ] Wave-1 statuses: Slowed + Calcified wired and working; Hasted + Drowning shipped in
      data with passing tests, unwired.
- [ ] Self-target hook works; Calcify is a functioning damage-less self-buff move.
- [ ] Boss suite re-verified per §8, findings reported (esp. Borck & Snarebriar rows).
- [ ] New Game spawns in the tavern; old saves Continue safely; console-clean.

---
*Chat-side collaborator (design) is on call. Flag ambiguity rather than guessing —
especially on the Deep Hollow gating, Borck's sim row, and any tuning that would touch the
Barrow-King's locked numbers.*
