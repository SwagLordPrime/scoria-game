# SCORIA: What the War Left — Roster Plan

**Doc status:** LIVING — movement 3 of the world pass (the roster)
**Supplements:** `WORLD_AND_CREATURES.md` (creature systems), `STORY_AND_WORLD.md` (world/biomes)
**Last updated:** 2026-07-10 (swept — SCORIA names threaded; movement 4 complete)

> Source of truth for roster size, faction/type mapping, rarity, the
> design pipeline, and the demo roster.

---

## 1. Targets
- **Full game: ~150 creatures** (Shane) — enough for 10 factions, 8 biomes, special areas,
  and mythics. **North-star, built in BATCHES over time.** Honest scope: 150 is a full-gen
  count; the *design* scales via the pipeline, but **art + implementation is the real
  long-haul cost.** Does NOT bloat the demo.
- **Demo: ~18 creatures** (Claude's rec) — a satisfying first-region slice. ~11 already
  designed (9 in-game + the wolf line) → **~60% there**; ~6–7 new to round out.

## 2. Faction → type mapping (LOCKED — "signature, not exclusive")
- Original five = the five elements: **Forge=Ember, Arcane=Gale, Bone=Cinder, Hive=Bloom,
  Drowned=Tide.**
- **Choir** = machine-creatures leaning **Gale** (energy/precision/drones; distinct from
  Arcane's storm-magic).
- **Ashborn** = **Ember** (ash/fire-of-faith; distinct from Forge's industrial fire).
- **Rootless factions field MIXED rosters:** Wayfarers (hardy road-beasts, any element),
  Concord (a bit of everything), **Remnant (chimeric/type-blending — impurity is their
  signature).**
- **Biomes drive wild encounters** (all five types live across the wilderness); faction
  signature mostly flavors leaders' teams & contract rewards.

## 3. Rarity — 5 tiers (LOCKED)
**common → uncommon → rare → epic → mythic.** Rarity gates: encounter rate, power ceiling,
and WHERE found (commons everywhere; mythics behind hidden labs, dead zones, postgame hunts).
**Exotic-type rule:** Umbra and Aether creatures are NEVER common — rare tier and up only
(see DESIGN_OVERVIEW §7b).

## 4. Pipeline (LOCKED — "Pallet Town, not Kanto")
Design in **biome/faction batches, one region at a time.** Nail the demo roster first → Code
builds that region → playtest → expand region by region. **Never design all 150 at once.**

**Creature template:**
`Name · Type · Role · Biome(s) · Rarity · Base HP/Atk/Mag/Def/Spd · Starting moves ·
Evolution (line + levels, or none) · Blurb (grounded-dark flavor)`

**Design principle (Shane, AMENDED 2026-08-11 — ledger #38): the field is OPEN.** The
old things-over-animals bias was overly harsh (Shane's word) and is retired. Animals,
insects, abstracts, constructs, amalgams, haunts, living objects, plants-that-move — all
welcome for consideration. The grounded-dark twist (grafted, wrong, made-of-something)
stays *encouraged wherever it makes a design stronger*, but a clean animal or insect that
fits the world needs no apology. The tone tests are the only gate. (The starters still
embody the twist: a mech, a tech-grafted wolf, a reassembling skeleton.)

## 5. Demo roster (18 slots — COMPLETE ✓)
Covers the demo region — **ashen wastes** (Emberfall outskirts) · **Fell-Grass Route** ·
**The Hollow.** All five types present; the Barrow-King's counters (**Bloom, Gale**)
catchable on the route BEFORE the Hollow. Rarity spread + a hidden chase.

**Starter lines (8 species) — player picks one:**
- Slagling → Forgewrought → Warkiln — Ember/Bruiser ✓ built
- Staticur → Voltwraith — Gale/Striker — *needs starter-select to be obtainable*
- Marrowling → Ossclad → Bonemarch — Cinder/Bruiser ✓ built (wild-catchable)

**Wild — ashen wastes (Ember-leaning; Bone fringe):**
- **Ashwhelp** — Ember/Striker, common — NEW (see §6)
- **Sporemote** — Bloom/Battle Mage, common, evolves Lv17 (gated past demo cap by design) —
  SHANE (see §6)
- **Ashcap** — Bloom/Warden, uncommon, BRANCHING line at Lv13 — SHANE (see §6)

**Wild — Fell-Grass Route (the counters live here):**
- Mireling — Bloom/Bruiser, common ✓ — *Barrow-King counter*
- Fenmoth — Gale/Striker, common ✓ — *Barrow-King counter*
- **Snarebriar** — Bloom/Trickster, uncommon — NEW (see §6)
- **Fenlight** — Tide/Sorcerer, rare — NEW (see §6) — *the game's first Sorcerer*

**Wild — The Hollow (cave/barrow; Cinder/Tide):**
- Marrowling — Cinder/Bruiser, common, evolves ✓
- Sistern — Tide/Warden, uncommon ✓
- **Borck** — Cinder/Warden, uncommon, evolves via the CAIRN PATH (post-V1) — SHANE (see §6)
- **Murkmaw** — Umbra/Trickster, epic — NEW (see §6) — *the hidden chase, deep Hollow; the
  game's first Umbra — the Maw's first whisper*

**18 slots — ROSTER COMPLETE.** (22 species specced counting evolutions; Mycolith is
demo-reachable post-boss, while Mycelegion/Dolmen/Pyrecap are gated by design.) **All six
roles present** — Fenlight is the first Sorcerer, Sporemote the first Battle Mage. Six of
seven types live in the demo; **Aether is deliberately absent** — a rumor until deeper
regions.

## 6. Sample creatures (the template in action — names NOT locked)
Stats are `HP/Atk/Mag/Def/Spd`.
- **Ashwhelp** — Ember/Striker · ashen wastes · common · **22 / 11 / 4 / 6 / 12** ·
  Emberlash, Nip · no evolution · *A whelp-shaped knot of char and wire that trails anything
  warm. Nobody's sure it was ever born — the wastes may have just kindled it.*
- **Snarebriar** — Bloom/Trickster · Fell-Grass Route · uncommon · **24 / 9 / 6 / 8 / 11** ·
  Spore Bash, Barbed Kick · no evolution · *A briar-tangle that learned a hare's shape and
  kept none of its innocence. It snares ankles, and is elsewhere by the time you look down.*
- **Fenlight** — Tide/**Sorcerer** · Fell-Grass Route (flooded ruts, dusk) · rare ·
  **24 / 5 / 13 / 7 / 10** · Coldlight (Tide · magic · 6), Beckon (Neutral · magic · 4) · no
  evolution · *A small cold lantern-glow that walks the ditch-water at dusk. Follow it and
  the water gets deeper. It knows.*
- **Murkmaw** — **Umbra**/Trickster · deep Hollow (past the last lantern) · **epic** ·
  **30 / 7 / 11 / 9 / 12** · Drag Under (Umbra · magic · 7), Snatch (Neutral · 5) · no
  evolution (a hidden line is a future option) · *A patch of dark down where no lantern
  reaches, cast by nothing. It feeds from beneath — even the barrow's dead give it room.*
  **Design intent:** the demo's hidden chase doubles as the Maw's foreshadow — players who
  later learn what feeds from shadows will remember this thing.
- **Borck** — Cinder/Warden · The Hollow · uncommon · **36 / 9 / 3 / 13 / 4** · Petrified
  Maul (Cinder · physical · 6), Calcify (self: +Def ×1.35, 3 turns — a beneficial status on
  the Phase-7 engine; ⚠ needs a small `target:'self'` extension on the applies hook — flag
  for the region build plan) · **evolves → Dolmen via the CAIRN PATH (post-V1):** level
  floor ~35 **+ survive ~25 battles in which he took a hit, without fainting** (each faint
  scatters ~5 stones from the cairn). Post-V1 enrichment: ranch-feeding grave-stone
  accelerates it; Temper flavors the emergence. Demo ships Borck as a plain strong
  catchable, evolution unwired — players will sense there's more to him. · *A skeleton that
  stopped being only bone. Stone grew into the gaps, and now it stands where it's told like
  something quarried, not born.* (SHANE design · Claude numbers)
  - **Dolmen** — Cinder/Warden · **44 / 13 / 4 / 19 / 3** · 4 slots (single-evo 3→4) · on
    evolving learns **Calcine** (self: cleanse ALL statuses + small heal — the earned
    signature). *Four legs of grave-stone, four arms of petrified marrow. It is not
    carrying a barrow. It is one.* ⚠ When Borck ships, sim him vs the Barrow-King (a
    self-buffing wall in the boss's own cave — expect stall-loss, verify).
- **Ashcap** — Bloom/Warden · ashen wastes (Bone fringe) · uncommon ·
  **34 / 7 / 8 / 12 / 4** · Spore Bash (physical), Spore Burst (Bloom · magic · 5 — the
  mixed kit foreshadows the branch) · **BRANCHING at Lv13 (§11.2 race):** neutral →
  **Mycolith** (demo-reachable post-boss); Wrath-first → **Pyrecap** (post-V1, with
  Temper). **No Bond branch — deliberate** (gaps in the possibility space are flavor). ·
  *A squat cap of gray flesh that grew where the burning stopped. It does not move out of
  the way, because nothing has ever made it.* (SHANE design · Claude numbers)
  - **Mycolith** (neutral branch) — Bloom/Warden · **46 / 8 / 13 / 16 / 4** · learns
    Sporestorm (Bloom · magic · 8). *A standing stone that breathes. Travelers stack
    offerings at its base without knowing why.*
  - **Pyrecap** (Wrath branch — **the game's FIRST Wrath-branch design**) — Bloom/Warden ·
    **42 / 9 / 14 / 12 / 6** · signature **Flarespore** (Ember · magic · 8 · +Burn 35% ·
    recoil 0.2 — the game's first off-type move; the Wrath branch *transgresses*) · passive
    (parked for the passives phase): **Ember Hunger** — below half HP, damaging moves heal
    25% of damage dealt. *A cap split by heat that should have killed it. It decided to
    like it.* (Engine note: Burn, recoil, and self-buffs all exist since Phase 7 — Pyrecap
    needs zero new machinery, just Temper.)
- **Sporemote** — Bloom/**Battle Mage** · ashen wastes (Bone fringe) · common ·
  **24 / 9 / 10 / 6 / 9** · Spore Burst (magic), Swarm (Neutral · physical · 5 — the whole
  cloud slams as one body) · **evolves Lv17 → Mycelegion** — above the demo cap of 15 on
  purpose: ships in data, gates itself; players max a Sporemote, see it is *not done
  growing*, and carry the itch to the next region. · *Not one creature. A drift of spores
  that votes.* (SHANE design · Claude numbers)
  - **Mycelegion** — Bloom/Battle Mage · **40 / 13 / 15 / 9 / 8** · 4 slots · learns
    Sporestorm. *Enough of them, for long enough, and the drift agrees on a shape. It is
    very large, and it is still deciding.*

## 7. Faction starters — one per faction, 3 offered at start (LOCKED, Shane confirmed)
**LOCKED (Shane):** every faction has a "starter"-grade representative creature (**10
total**), and **only 3 of the 10 are offered as options at the start of the game.**

**SHAPE (LOCKED with Shane):**
- **The offered trio is FIXED = the existing starter triangle:** Slagling (Forge/Ember) ·
  Staticur (**Remnant**/Gale) · Marrowling (Bone/Cinder), offered at the Emberfall
  tavern (in-fiction: three salvaged cores a handler stakes greenhorn mercs; the grafted
  wolf is the one nobody else wants). Fixed, not randomized — the trio's perfect triangle
  and the Barrow-King's tuning depend on the offered set.
- **The other 7 are REPUTATION GIFTS** (full game): earn a faction's trust and they entrust
  you with their starter-grade creature. Merc-on-theme; every faction's rep track gets a
  creature payoff; collectors have a reason to work all ten factions.
- **Staticur belongs to the REMNANT (LOCKED):** a flesh wolf grafted with parasitic broken
  tech IS an amalgam — the Choir builds *pure* machines and would call it an abomination.
- **Marrowling stays wild-catchable too** (preserves the raise-an-Ossclad counter-pick vs
  the Barrow-King; the Bone's barrow-fields are full of them).
- **Faction starters are the "deluxe class"** — the natural home of third meters, passive
  lines, and Temper branches (WORLD_AND_CREATURES §11). Designed batch by batch; the depth
  is post-V1.
- ⚠ **When starter-select ships, re-sim the gate:** a Gale starter counters the Cinder
  King (classic easy/medium/hard first-gym asymmetry — likely fine, but verify tension).

**Open:** rep thresholds; when the starter-select scene gets built.

## 8. Status & next
- ✅ **DEMO ROSTER COMPLETE (movement 3 ✓)** — all 18 slots specced in §5–§7; Shane's 3
  (Borck, Ashcap, Sporemote) and Claude's 4 (Ashwhelp, Snarebriar, Fenlight, Murkmaw) all
  landed; Borck's Cairn Path locked.
- **Movement 4 — official names** is the last world-pass piece (see STORY_AND_WORLD §10).
- Then: the **demo-region build plan** for Code — implement the new species, biome zones,
  encounter tables, and the Calcify `target:'self'` hook extension. **Passives** remain the
  next parallel systems phase after that.
- Post-V1 evolution content queued here: the Cairn Path, Pyrecap (Wrath), Mycelegion.
- The other 7 faction-starter lines (later batches, per region/faction).
