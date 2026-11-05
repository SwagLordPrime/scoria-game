# Creature Collector — Phase 8 Build Plan (for Claude Code): THE ARCANE EXPANSION

**Read first:** `design/DESIGN_OVERVIEW.md` §6–§8 (the updated battle/type/role canon),
`PHASE7_BUILD_PLAN.md`, and the existing project. **Self-contained systems work — runs in
parallel with the ongoing world-pass design. No world/region content in this phase.**

## 0. Guardrails (unchanged, critical)
- **Standalone project.** Work only inside `Creature Collector\`. `design/` docs are read-only. Ask before destructive ops. Grounded palette.
  Data-driven.

## 1. Goal
Expand the combat substrate per the new canon: **seven types** (add Umbra + Aether with the
"shrug" multiplier), a **Magic stat** (special-attack analog), **move kinds**
(physical|magic), and **two new roles** (Sorcerer, Battle Mage). Existing balance must come
through **unchanged except where specified** (Toll). This lands BEFORE passives so passives
can build on the full stat/type space.

## 2. Scope

### 2.1 Type chart → 7 types
Extend the type data/chart per DESIGN_OVERVIEW §7:
- Pentagon between the elemental five: **unchanged.**
- Five → Umbra/Aether: **×0.85 (new "shrugged" tier).**
- **Umbra ↔ Aether: ×1.5 both directions.** Umbra/Aether → the five: ×1. Same-vs-same: ×1.
- Typeless (Neutral) moves: ×1 vs everything, as now.
- Multiplier set: 1.5 / 1 / 0.85 / 0.66. Battle-log labels: keep "super effective" /
  "resisted"; add a light line for shrugged (e.g. "it barely seems to touch it").
- **No Umbra/Aether creatures or moves ship in this phase** (content comes with regions) —
  but the chart must be complete and sim-tested now.

### 2.2 Magic stat
- Add `mag` to every species (base, Lv-1) and scale it with `statAtLevel` exactly like the
  others. It derives from species+level, so **the save format should need NO change** —
  verify a v3 save loads and rehydrates with correct Mag.
- **Per-species Mag bases (assigned to preserve identity; tune via sim only if needed):**
  Slagling 4 · Forgewrought 5 · Warkiln 6 · Marrowling 3 · Ossclad 4 · Bonemarch 5 ·
  Mireling 5 · Fenmoth 6 · **Sistern 10** (the demo's proto-caster) · Barrow-King 6 (inert —
  all its moves stay physical).

### 2.3 Move kinds
- Every move gains `kind: 'physical' | 'magic'`. **Default every existing move to
  physical** (zero behavior change), EXCEPT:
- **Convert `Toll` to `kind: 'magic'`** — a bell's toll is resonance, not muscle. With
  Sistern's Mag 10 (vs Atk 8) this is a deliberate modest buff to the demo's Warden;
  sim-check it doesn't distort anything (esp. any team comps that include Sistern).
- Damage: `stat = kind==='magic' ? mag : atk`, rest of the §4 formula unchanged. Effective-
  stat routing must respect statuses: **Burn's −Atk applies ONLY to physical damage** (it
  already mods `atk`; just confirm magic moves read `mag` and are untouched by it). Note
  this emergent rule in a comment — it's intended design, not a bug.
- Fight-menu labels: show a small kind marker (e.g. "◆" magic) alongside existing hook tags.

### 2.4 Roles
- Register **Sorcerer** and **Battle Mage** as valid roles (UI display + compendium). No
  existing creature changes role. (First Sorcerer arrives with region content.)

## 3. Verification (required)
- Extend the sim: unit-test the full 7×7 chart (incl. shrug + mutual-1.5), magic-kind damage
  routing, and Burn-only-hits-physical.
- **Re-run the Barrow-King suite.** Expected: identical outcomes except tiny drift in comps
  using Sistern's Toll (now magic @ Mag 10). Boss numbers UNCHANGED. If Toll's buff
  meaningfully shifts any verified result, report before adjusting anything.
- Confirm: v3 saves load clean (Mag derives); New Game unaffected; boot console-clean.

## 4. Acceptance criteria (done when…)
- [ ] 7-type chart live and unit-tested; shrug (×0.85) and Umbra↔Aether mutual ×1.5 correct.
- [ ] Every creature has a scaled Mag stat; v3 saves rehydrate with correct Mag, no format bump
      (or a clean v4 migration if one proves necessary — explain why).
- [ ] Move kinds live; all existing moves physical except **Toll (magic)**; damage routes by
      kind; Burn nerfs physical only.
- [ ] Sorcerer + Battle Mage are valid roles in UI/compendium.
- [ ] Barrow-King suite re-verified; results reported (incl. the Toll drift, if any).
- [ ] No Umbra/Aether content shipped; chart-only. Console-clean.

## 5. Out of scope (DO NOT build here)
Umbra/Aether **creatures, moves, or encounters** (region content, later); a magic-defense
stat ("Ward" — deliberate post-V1 question); passives (next after this); any boss re-tune;
Bond/Wrath; the ranch. Leave clean seams.

---
*Chat-side collaborator is mid-roster-design but available. Flag ambiguity rather than
guessing — especially on the chart rules and the Toll conversion.*
