# Creature Collector — Phase 3 Build Plan (for Claude Code)

**Read these first, in full, before writing any code:**
1. `design/DESIGN_OVERVIEW.md` — mechanics, scope, pillars, non-goals
2. `design/WORLD_AND_CREATURES.md` — world identity, lore premise, creatures, canon
3. This file — Phase 3 scope + the exact mechanics to port + guardrails

---

## 0. GUARDRAILS — read carefully

- **This is a standalone project.** Do not read from or write to anything outside the project folder.
- **Work only inside `Creature Collector\`.** Never touch other root folders.
- **`design/` docs are READ-ONLY context.** Don't edit them. (You may create NEW docs in
  this project, e.g. a README, but keep them plain — no Obsidian tags/frontmatter.)
- **Ask before destructive operations** (deleting files, overwriting anything non-trivial,
  `git` history rewrites, global installs beyond project deps).
- **Preserve the grounded tone + muted palette** (spec in §5). This game is deliberately
  NOT bright-Pokémon-colored.
- The chat-side collaborator (design/architecture) has already proven the feel through a
  Phase 2 prototype; your job is to build the real project and port that proven logic
  **exactly** (numbers in §4), not to redesign it.

---

## 1. What exists / where we are

Phases 0–2 were proven in throwaway in-chat HTML prototypes (Phaser via CDN):
- **Phase 0:** grid-locked overworld movement + collision + camera follow.
- **Phase 1:** tall-grass wild encounters → turn-based battle with a working type wheel.
- **Phase 2:** catching (weaken → containment core), a persistent party, and
  swap-in-battle.

Those prototypes can't save (browser-storage is blocked in the artifact sandbox), which
is why we're graduating to a **real project** now. **Phase 3 = build the real project and
the persistent world.**

## 2. Tech + project setup

- **Vite + Phaser 3** (JavaScript). Set up a fresh Vite vanilla project in this folder and
  add `phaser` as a dependency (no CDN).
- Target: runs locally via `npm run dev`; builds via `npm run build`. (Desktop `.exe`
  wrap via Tauri/Electron is a LATER phase — architect so it won't fight that, but do not
  add it now.)
- Suggested structure:
  ```
  Creature Collector/
    design/                 (existing, read-only)
    PHASE3_BUILD_PLAN.md    (this file)
    index.html
    package.json  vite.config.js
    src/
      main.js               (Phaser game config, scene registry)
      scenes/               (Boot, World, Battle, optionally Title)
      data/
        creatures.js        (SPECIES table — §4.1)
        types.js            (type wheel + multipliers — §4.2)
        maps/               (map data files — §3)
      systems/
        combat.js           (damage, catch, turn order — §4)
        save.js             (serialize/load — §6)
        party.js            (party/box state)
      render/               (sprite + tile texture generation)
    public/                 (assets later)
  ```
- **Data-driven maps are mandatory** (see §3). Do NOT hardcode map layouts inside scene
  code.

## 3. Phase 3 SCOPE — the persistent world

Build a small but real connected world (the V1 slice), plus saving:

1. **Map system (data-driven).** One `World` scene that loads a map by id from a data
   file. A map defines: tile grid (walkable/blocked/tall-grass/etc.), spawn points,
   **warps** (tile → {targetMap, targetSpawn}), and an **encounter table** (which species
   + level range spawn in its tall grass). Keep the same 32px grid, tile-locked movement
   (~130ms/step), and camera-follow from the prototype.
   - Start with JSON/JS map data authored by hand (a small template-based generator is
     fine). **Tiled (mapeditor.org) integration is encouraged but optional this phase** —
     if you skip it, structure map data so a Tiled JSON importer can be added later.

2. **At least 3 connected maps:**
   - **Town (hub):** a few buildings (at least one enterable), **2–3 NPCs** with basic
     dialogue (a text box on interact), and a **heal point** (restores whole party to full
     — the "safe point").
   - **Route:** tall grass with wild encounters (encounter chance 18% per step onto a
     grass tile, per §4.4). Connects town ↔ cave.
   - **Cave / gate area:** the deeper zone. (The mini-boss encounter itself is **Phase 4**
     — for Phase 3 just build the map + warps + a placeholder "path onward" so the world
     is traversable. Wild encounters here can use tougher levels.)
   - Warps connect them (town door → route edge → cave mouth, etc.) with correct return
     spawns.

3. **Lose state:** if the whole party faints, black out → respawn at the last heal point
   (town) with the party fully restored. (No permadeath — that's a flagged post-V1
   feature; see design docs.)

4. **Real saving (the headline feature):** see §6.

5. **Port combat + catching** from the prototype, wired into the new world (§4). Base
   creature forms only (no evolution in V1).

## 4. EXACT MECHANICS TO PORT (do not change these numbers)

### 4.1 Creatures (base forms; stats: HP / Atk / Def / Spd)
| Species | Type | Role | HP | Atk | Def | Spd | Moves (name, type, power) |
|---|---|---|---|---|---|---|---|
| **Slagling** *(player starter)* | Ember | Bruiser | 32 | 12 | 9 | 6 | Emberlash (Ember, 6); Ram (Neutral, 5) |
| **Mireling** | Bloom | Bruiser | 30 | 10 | 10 | 5 | Spore Bash (Bloom, 5); Gnash (Neutral, 5) |
| **Fenmoth** | Gale | Striker | 20 | 12 | 6 | 13 | Gust (Gale, 5); Flit (Neutral, 4) |
| **Sistern** | Tide | Warden | 34 | 8 | 12 | 5 | Douse (Tide, 5); Toll (Neutral, 4) |
| **Marrowling** | Cinder | Bruiser | 28 | 11 | 9 | 6 | Bone Rake (Cinder, 5); Clatter (Neutral, 4) |

Player starts with **Slagling** (Lv 5). Wild species (routes): Mireling, Fenmoth, Sistern,
Marrowling (Lv 3–5; tougher in the cave). (The three starters' evolution lines and the
faction roster are in `WORLD_AND_CREATURES.md` — canon, but **post-V1**.)

### 4.2 Type wheel — each type beats the two listed; loses to the other two
```
Ember  → beats Bloom, Gale
Bloom  → beats Gale, Cinder
Gale   → beats Cinder, Tide
Cinder → beats Tide, Ember
Tide   → beats Ember, Bloom
```
Multiplier: super-effective **×1.5**, resisted **×0.66**, otherwise **×1.0**. A move of
type **Neutral** is always ×1.0 (no wheel).

### 4.3 Damage & turns
- `damage = max(1, floor( attacker.atk * move.power / defender.def * typeMultiplier ))`
- Turn order: higher **Spd** acts first; tie → **player** first.
- **Swapping the active creature costs your turn** (the enemy gets a free hit). This is a
  core design pillar — keep it.

### 4.4 Catching & encounters
- Catch device = **salvaged containment core** (lore: creatures are typed living power —
  see design docs). Catching is **unlimited** in V1 (no item scarcity).
- `catchChance = min(0.9, (1 - currentHP/maxHP) + 0.05)` — so ~5% at full HP, ~90% near
  faint. **Fainting a wild = no catch** (it's lost). Failed catch **costs your turn**.
- Caught creature joins at **full HP**. Party max **6**; overflow → **box** (storage).
- Encounter roll: **18%** when the player steps onto a tall-grass tile.

## 5. Grounded palette (keep the tone)
- Ground/grass `#59684d` (speckle `#4e5c44`,`#63735a`); tall grass `#44563b`;
  path `#7a6b56`; tree `#33452f`; water `#45586a`; rock `#6a6e73`.
- Type colors: Ember `#a55a3a`, Tide `#4f6b82`, Bloom `#6f7d45`, Gale `#8f8aa6`,
  Cinder `#9a9186`, Neutral `#8f8a80`.
- UI: panels `#12160f`, edges `#2c3428`, ink `#c7cbbb`, dim `#8b917f`, accent `#9a7f4e`.
- Player: muted ochre coat (`#8a6f45`), dark hair, small directional sprite.
- Placeholder creature sprites are **code-generated** (distinct silhouette + type tint) —
  keep that approach; real art is a later swap.

## 6. Save system (the point of Phase 3)
- Persist to **localStorage** (works in a real Vite build): a single JSON blob with
  `{ version, party, box, position:{ mapId, x, y }, facing, flags, seen, caught }`.
  - `party`/`box`: creature instances (species key, level, current/max HP, moves).
  - `flags`: world progress (e.g. gates cleared) — even if few in V1.
  - `seen`/`caught`: compendium sets.
- **Autosave** on every map transition (warp) and heal; provide a **manual Save** option.
- **Load** on boot; if no save, start a new game (Slagling Lv5, spawn in town).
- Provide a **New Game / reset** that clears the save (with a confirm).

## 7. Acceptance criteria (Phase 3 is done when…)
- [ ] `npm install` + `npm run dev` launches the game locally with no console errors.
- [ ] Maps load from **data files**, not hardcoded in scene logic; adding a new map is a
      new data file + a warp.
- [ ] Player can walk **town → route → cave** and back via warps, with correct spawns.
- [ ] Town has ≥1 enterable building, 2–3 NPCs with dialogue, and a working heal point.
- [ ] Wild encounters trigger on route/cave grass; **combat + catching + swap** behave
      exactly per §4 (verify the numbers).
- [ ] Party **persists** across encounters and across maps; box holds overflow past 6.
- [ ] Party wipe → respawn at heal point, fully restored.
- [ ] **Save/Load works across a full page reload** (position, party, box, flags,
      compendium all restored). Manual save + autosave-on-warp both function. New Game
      resets.
- [ ] Grounded muted palette (§5) preserved throughout.
- [ ] A short `README.md` documents how to run, the project structure, and how to add a
      new map/creature (data-driven).

## 8. Explicitly OUT of scope for Phase 3 (do not build)
Trainers/NPC battlers, the mini-boss battle (Phase 4), evolution, player-gear/RPG combat,
permadeath/high-stakes flagged fights, real art, audio, Tauri/Electron packaging,
shops/economy. All are canon-but-later per the design docs — leave clean seams, don't
implement.

---

*Chat-side collaborator remains available for design questions and review. Build to this
plan; flag any ambiguity rather than guessing on mechanics or scope.*
