# SCORIA: What the War Left — Design Overview

**Title:** **SCORIA: What the War Left** — LOCKED · creatures are **NUMENS** (LOCKED) — full ledger: `design/NAMES.md`
**Owner:** Shane
**Doc status:** PHASES 0–8 SHIPPED & VERIFIED (core loop → leveling → evolution → statuses → the ARCANE EXPANSION). **THE WORLD PASS IS COMPLETE** (spine ✓ map ✓ terrain ✓ roster ✓ names ✓ — see `STORY_AND_WORLD.md`, `ROSTER.md`, `NAMES.md`). **Next: the demo-region build plan (Phase 9)** — Code makes Scoria real.
**Last updated:** 2026-07-06

> This is a standalone project. It lives in its own root folder.

---

## 0. The one-liner

An open-world creature collector with the explore-and-catch feel of Pokémon, direct
turn-based monster battles (Aethermancer/Pokémon style), a swap-in-battle squad, and
creatures defined by both **type** and **role** — set in a **grounded, quietly dark**
world. You explore a persistent world, weaken and catch wild creatures, build a team,
and get stronger. Save-and-continue — no runs, no permadeath.

---

## 1. The big decision we made (recorded so it stays made)

We chose **Game A: Open-World** over **Game B: Run-Based Autobattler.**

**KEEP:**
- Direct turn-based monster battles (not cards)
- One active creature + a bench; swap during battle
- Types AND roles as the two axes of creature identity
- Turn-based, no timer (take your time)
- Weaken-then-catch acquisition (Pokémon-style)
- Code-generated placeholder sprites for V1; real art is a later swap
- Data-driven design so "more content" = more data, not more systems

**KILLED (do not resurrect without a new decision):**
- ❌ Run-based structure — the world is persistent and continuous
- ❌ Permanent between-run meta-unlocks (Hades/RoR/Spire loop)
- ❌ Procedural zones as the *core* structure — the world is hand-built (§4)
- ❌ Party-wipe = restart — fainting sends you back to a safe point (§5)

**Why:** meta-progression *needs* runs; an explorable world *is* one continuous save.
Being both is how projects die. We committed.

---

## 1a. The three calls we just locked (story / trainers / tone)

**Story — minimal for V1, story-rich later.** V1 ships with only a light framing (a
reason you're out here) and a couple of NPCs. The world and systems are built so a
real narrative spine — a goal, maybe a rival, lore — can be layered in post-V1 without
re-architecting. Don't over-invest in story content in V1; leave the *hooks*, not the
whole story.

**Trainers — NONE in V1. Wild creatures only.** No NPC battlers, no enemy teams, no
trainer AI in V1. This keeps content cost down and lets us nail the wild-encounter core
first. Trainers are the natural **first post-V1 addition** (see §12, Phase 5+).
→ Consequence: the V1 progression gate is a **mini-boss wild creature**, not a trainer
(§3, §4).

**Tone — GROUNDED. Weird and dark, but not edgelord.** The north star:
- Takes its world and stakes seriously; there's an unsettling, melancholy undercurrent.
- More mature than Pokémon's kid-friendliness — but NOT gratuitous, gory, or
  shock-for-shock's-sake.
- Reference feel: the restrained dread of *Hollow Knight* / *Shin Megami Tensei* and
  the grounded creepiness of *Inscryption* — NOT bright-and-cheery, NOT try-hard grimdark.
- This drives creature design (uncanny, believable, a little wrong — not "cute mascot"
  and not "demon skulls"), NPC writing, and eventual music/color palette.

---

## 2. The core loop

```
Explore the world (walk routes, towns, caves)
        ↓
Step into tall grass / trigger encounter → WILD BATTLE
        ↓
Turn-based fight: attack to weaken. Swap active creature to exploit type/role.
        ↓
Weak enough? → CATCH → creature joins your party/box
        ↓
Grow: creatures level up, get stronger, you assemble a better team
        ↓
Progress: reach a mini-boss gate → out-type it → the world opens up
        ↓
(faint with no creatures left → wake at last safe point, keep everything)
        ↓
Explore further → repeat, deeper world, tougher creatures
```

The *battle and catch* core is identical to the roguelike version — what changed is the
**frame**: persistent exploration + progression instead of runs + meta-unlocks.

---

## 3. Progression model — how the player gets "further" without runs

Primary for V1 = **gated exploration + team power curve**:

- Areas open once you clear a challenge. With trainers off the table for V1, the V1
  gate is a **mini-boss wild creature** — a strong, distinct, territorial encounter
  blocking the path forward. Beat it or catch it → the next area unlocks.
- Wild creatures scale by region, so deeper areas softly require a stronger, better-typed
  team (natural difficulty gating).
- **Secondary hook:** a compendium (species seen/caught) — very Aethermancer/Pokédex,
  rewards collection. Cheap to add, strong pull.

The mini-boss gate is a clean, feelable progression beat at tiny scale, and it teaches
type/role mastery (you *have* to exploit the wheel to win).

---

## 4. World structure & the content reality check

**Open-world means the world IS the work** — every route, town, and cave is hand-authored.
We manage that cost:

- **Tile-based maps** (Phaser tilemaps) with reusable tilesets → a "new area" is a new
  arrangement of existing tiles, not new art.
- **A deliberately tiny V1 region** — the first slice of a persistent world, not a whole region.

**V1 world scope (the vertical slice):**
- **1 hub town** — a couple enterable buildings, 2-3 NPCs (light/grounded flavor), a heal point
- **1-2 routes** with tall grass and wild encounters
- **1 landmark/cave** housing the **mini-boss wild creature** (the gate)
- **1 exit** that opens on clearing the gate — a "to be continued" seam for the next region

Everything past that is post-V1 content poured into the same systems. Full procedural
generation is NOT in scope; optional later touches = randomized grass encounters within
authored areas.

---

## 5. The "lose" state (replaces run-death)

- Active faints + whole party down → **black out**, wake at the last safe point (town/heal).
- **Keep everything** — creatures, items, progress. V1 = penalty-free to stay friendly
  (a small currency penalty is a later option). Grounded tone ≠ punishing mechanics.

---

## 6. Battle system

**Format:** turn-based, one active per side + a bench you swap from.

**Per-creature stats:** `HP, Attack, Magic, Defense, Speed` — **Magic is the special-attack
analog (Shane).** Every move has a **kind: physical | magic**; physical moves scale off
Attack, magic moves off Magic. One shared Defense for now — a split magic-defense ("Ward")
is a deliberate post-V1 question, not an oversight. Emergent depth already present: Burn's
−Atk only cripples physical attackers; Sorcerers shrug it off.
**Moves:** 2-3 per creature. A move = `{ name, type, kind, power, effect? }`.

**Damage (starting formula, tune later):**
```
stat = kind === 'magic' ? Attacker.Magic : Attacker.Attack
dmg = ((stat * Move.power) / Defender.Defense) * typeMultiplier * roleFlavor
```
Clamp to min 1.

**Turn order:** higher Speed first; ties random. Swapping likely costs your turn (the
swap-decision tension).

**Status effects (2 for V1):** e.g. `Burn` (damage/turn), `Snare` (skip/‑Speed).

**Catch mechanic:**
```
catchChance = baseRate * (1 - currentHP/maxHP) * statusBonus
```
Weaken + apply status → better odds. Faint it = no catch. Central tension: one more hit
for a cleaner catch, or throw now?

Type = matchup axis, role = playstyle axis; together they make "which creature do I send
out?" a real decision every fight.

---

## 7. Type system — SEVEN types: the elemental five + the exotic pair

### 7a. The elemental five (the pentagon — unchanged)
Each type beats the two after it, loses to the two before it. No dead types.

| Type | Flavor (tuned for grounded tone) |
| --- | --- |
| **Ember** | Fire, aggression, burn-over-time — glass-cannon energy |
| **Tide** | Water, flow, healing/sustain — control & endurance |
| **Bloom** | Nature, growth, status/poison — attrition & debuffs |
| **Gale** | Wind/storm, speed, evasion — tempo & first-strike |
| **Cinder** | Ash/decay, defense, drain — grindy tank & life-steal |

**Advantage wheel (attacker → beats):**
- Ember → Bloom, Gale
- Bloom → Gale, Cinder
- Gale → Cinder, Tide
- Cinder → Tide, Ember
- Tide → Ember, Bloom

### 7b. The exotic pair (Shane's mechanic · Claude's themes — world-pass addition)

| Type | Flavor |
| --- | --- |
| **Umbra** | The Maw's element — hungry dark that feeds from beneath. Cult-touched creatures, dead-zone horrors, things that fed too long in the dark. |
| **Aether** | The world's vital spark — raw core-light, the living power civilization runs on. Relic-sites, old power-works, halo-beasts. |

The fiction: these two are the **war at the bottom of the world** — the Maw's hunger vs.
the world's living spark. Both are barely *of* the world, which is why ordinary elements
only graze them.

**Chart rules (Shane's spec, formalized):**
- The elemental five attacking Umbra or Aether → **shrugged ×0.85** (a slight resist)
- **Umbra ↔ Aether → ×1.5 BOTH ways** (mutual annihilation — each is the other's counter)
- Umbra/Aether attacking the elemental five → neutral ×1
- Umbra vs Umbra / Aether vs Aether → neutral ×1 · Typeless (Neutral) moves → ×1 vs everything
- **Rarity guardrail (balance-critical):** NO common Umbra/Aether creatures. Rare tier and
  up only — cult content, dead zones, hidden labs, relics, endgame. The universal shrug is
  safe only while exotics stay scarce.

**Multipliers now:** super ×1.5 · neutral ×1 · shrugged ×0.85 · resisted ×0.66. (Tunable.)

### 7c. Status roster (canon — expanded by Shane, 2026-07-10)
**Live since Phase 7:** Burn (DoT + −Atk, bites physical only) · Poison (DoT) · Bleed (DoT
on-action) · Rot (DoT + healing halved). **Queued:** Calcify (self +Def — Borck's kit;
needs the `target:'self'` hook).
**Shane's seven additions — canon, built in two waves:**
- *Wave 1 — ready on the current engine (statMods / tick):* **Slowed** (Spd ×~0.6) ·
  **Hasted** (Spd ×~1.4 — the first pure buff-status; buffs ride the same engine) ·
  **Drowning** (Tide — escalating DoT, short duration).
- *Wave 2 — need a CONTROL seam (action-denial/override + wake/fizzle triggers; a small
  dedicated systems phase):* **Stunned** (skip next action) · **Sleep** (skip actions until
  damage wakes it) · **Shock** (Gale — jolt DoT + a chance the action fizzles) ·
  **Charmed** (turned — won't strike its charmer / may strike itself; touches enemy AI).
All numbers tuned via sim when each wave ships. Statuses stay battle-only until a
deliberate overworld-persistence decision.

---

## 8. Role system — what a creature DOES (independent of type)

Every creature = one type + one role. **Six roles** (the classic four + the arcane two,
added with the Magic stat):

| Role | Identity | Stat lean |
| --- | --- | --- |
| **Bruiser** | Reliable frontline, trades evenly | High HP + Atk, low Speed |
| **Striker** | Burst damage, fragile | High Atk + Speed, low HP/Def |
| **Warden** | Wall / stalls, buys swaps | High HP + Def, low Atk |
| **Trickster** | Applies status, disrupts | Mid stats, status-focused |
| **Sorcerer** | Pure caster — the magic nuker | High Magic + decent Speed, low Atk, frail |
| **Battle Mage** | Hybrid — flexes physical or magic per matchup | Solid Atk AND Magic, mid elsewhere |

---

## 9. Save system (matters more now — persistent world)

Persist: player position/area, party + boxed creatures, items/currency, world progress
flags (gates cleared), compendium (species seen/caught).

- Prototype saves to local storage / local file once running outside the artifact preview.
- **Note:** localStorage does NOT work in a Claude.ai artifact preview — in-artifact
  testing is in-memory only; real saving happens in the local/desktop build.
- Autosave on area transition + manual save = fine V1 model.

---

## 10. Tech stack

- **Phaser 3** — 2D framework built for tilemap + sprite + grid-movement games
- **JavaScript**
- **Code-generated placeholder sprites** — distinct silhouette + color per type/role;
  looks like a game, near-zero art time; real art drops into the same slots later
- **Desktop wrap (later):** Tauri or Electron → `.exe` for itch.io; browser link for friends
- **Data-driven:** creatures / moves / types / maps / NPCs in plain JS/JSON data files

---

## 11. V1 content targets (tiny on purpose)

- **~6-8 creatures** covering the 5 types across a mix of roles (grounded, uncanny designs)
- **1 town + 1-2 routes + 1 cave/gate area** (§4)
- **2 status effects**
- **1 mini-boss wild creature** as the gate that opens the "to be continued" exit
- **3 starter choices** at game start
- **NO trainers** in V1

---

## 12. Build order — vertical slice first (how we don't burn out)

**Phase 0 — Walk:** Phaser boots, renders a tile map, character walks with grid movement
+ collision. *("I can walk in a world.")*

**Phase 1 — Encounter → Battle:** tall grass triggers a wild encounter → battle screen,
HP bars, pick a move, damage resolves, enemy attacks back, win/lose. *("I can fight.")*

**Phase 2 — Catch + Party:** weaken-based catch adds creature to party; one active + bench
swap in battle. *("I can catch and swap." — core loop exists.)*

**Phase 3 — World:** connected maps (town ↔ route ↔ cave), area transitions, a heal point,
black-out-and-return on party wipe. *("It's a world.")*

**Phase 4 — Progression + Save:** the mini-boss gate that opens the next area; save/load of
world + party + progress; compendium logging. *("It's a game." — V1 COMPLETE.)*

**Phase 5+ (NOT now, in rough priority):** trainers/NPC battlers (first add) → real art
swap → more regions & the story spine → evolution → items/shops → audio → desktop
packaging → itch.io release.

---

## 13. Explicit V1 non-goals (say no now)

- ❌ Hand-drawn art / animation (placeholders first)
- ❌ Trainers / NPC battlers (Phase 5+)
- ❌ Breeding, fusing, evolution
- ❌ Big multi-region world / deep story (hooks only in V1)
- ❌ Full procedural generation
- ❌ Multiplayer / trading / online anything
- ❌ Audio & music
- ❌ Perfect balance — working and fun-ish first, tune later

---

## 14. OPEN QUESTIONS

**RESOLVED:**
- ✅ Story → minimal V1, story-rich later (§1a)
- ✅ Trainers in V1 → no, wild-only; trainers are first post-V1 add (§1a)
- ✅ V1 gate type → mini-boss wild creature (forced by wild-only) (§3, §4)
- ✅ Tone → grounded; weird/dark but not edgelord (§1a)

**STILL OPEN (minor — don't block Phase 0):**
1. **World-size ambition:** how big is "the full game" in your head — one Kanto-sized
   region, or smaller and denser? Shapes how we structure world data for scaling, but
   doesn't block the V1 slice.
2. **Evolution:** confirmed Phase 5+ (not V1) unless you say otherwise.

Core is locked. Phase 0 can start whenever you give the word.
```
