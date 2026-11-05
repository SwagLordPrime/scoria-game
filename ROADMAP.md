# SCORIA: What the War Left — The Road From Demo to Full Game

**Doc status:** LIVING — the master plan (written 2026-08-06, after the Phase 0–9 audit)
**Supplements:** `design/*` (the bible) · `PHASE*_BUILD_PLAN.md` (the per-phase pattern this doc feeds)
**Owner:** Shane · Chat-side Claude authored, Shane approves

> Standalone project. This doc is the sequencing law:
> what gets built, in what order, with which model, and what must be DESIGNED before
> each build. Individual phases still get their own build plan before Code touches them.

---

## 1. Where the game stands (the audit, 2026-08-06)

**Phases 0–9 are shipped and live in code.** Verified directly against source, not the docs:

| Layer | State |
| --- | --- |
| **Engine** | Vite + Phaser 3, vanilla JS, ~5,400 lines of source. Data-driven throughout — maps, species, moves, statuses, bosses are data files, not scene code. |
| **World** | 7 maps: Emberfall, Sable's Workshop, **the tavern (New Game spawn)**, Fell-Grass Route, the Ashen Wastes, The Hollow, **the Deep Hollow (provably gated behind the Barrow-King)**. Warps, camera, hearth heal/safe points, party-wipe blackout. |
| **Numens** | **18 species in code** (incl. 6 evolved forms; Staticur/Voltwraith specced in the bible but not yet built — they arrive with starter-select), 28 moves in the shared table. All six roles. Six of seven types live — Aether deliberately absent. |
| **Combat** | 7-type chart with exotic rules, physical/magic kinds, Magic stat, swap-costs-turn, weaken-then-bind catching, greedy enemy AI. |
| **Progression** | Shared XP, per-stat growth, milestone level caps (10 → 15), evolution with stat jumps + move-learning + slot caps, rarity-weighted encounters (common→epic). |
| **Statuses** | 8 in data: Burn/Poison/Bleed/Rot + wave-1 (Slowed, Calcified wired; Hasted, Drowning shipped-unwired by design). Self-target hook works (Calcify). |
| **Boss** | The Barrow-King: Lifedrain + frenzy, defeat-only, sim-verified difficulty (Ember-only always loses; Bloom/Gale wins on a knife-edge). |
| **Persistence** | Save v3 to localStorage, autosave on transitions/rests, slim rehydrating save shape, level cap recomputed from flags. |
| **Verification** | `scripts/sim-phase5..9.mjs` — a real regression harness. This is rare discipline for a hobby project; it's the reason balance survives each phase. |
| **Identity** | SCORIA title live, numen/Numinary/bind vocabulary live, name ledger locked, world pass complete (story spine, 10 factions, 150-numen north star, demo roster). |

**Honest strengths:** the architecture is genuinely good — content = data, systems have clean seams, every phase shipped with a sim. The design bible is deeper than most shipped indie games. The phase-plan → Code → sim-verify cadence is a proven factory.

**Gaps and risks (fix-first items in §7):**

| Risk | Why it matters |
| --- | --- |
| **NO git repository** | One bad session or disk hiccup loses the game. A `.gitignore` exists; the repo doesn't. This is the single most urgent item in this document. |
| Stale metadata | `package.json` still says "Phase 3 vertical slice", v0.3.0. Cosmetic, but drift breeds confusion. |
| README lags reality | Describes Phase 5; the game is at Phase 9. |
| Scene files growing | `BattleScene.js` (749) and `WorldScene.js` (766) are fine today; watch them — split before ~1,200 lines, not after. |
| localStorage-only saves | Fine until the Tauri wrap; becomes a file-based save at packaging time (seam already noted in vite config). |

---

## 2. The target (locked this session, 2026-08-06)

- **The full game:** a Pokémon-like with **~30 hours of main story** and 10–100 hours of optional side content. Built for Shane + friends first; publishing (free itch.io, or paid) stays an open option, **never a deadline**. The MMO dream is recorded and shelved.
- **Roguelike elements → THE ARENA SIDE-MODE (Shane, 2026-08-06).** The persistent-world kill from `DESIGN_OVERVIEW §1` **stands** — no run-based core, no meta-unlock loop. The roguelike itch is served by the postgame **brutal arena** already canon in `STORY_AND_WORLD §5`: escalating gauntlets, wagered gilt, opt-in flagged permadeath stakes. It becomes a real, designed mode (Arc F), not just flavor.
- **Art:** AI-assisted sprite pipeline (+ the procedural system as fallback/underlay) — see §6.
- **Replayability (Shane, 2026-08-09):** ONE authored campaign. Alternate **faction starts** ship as **NG+ / remix / hard-mode bonus content** — curated 3–4 origins (local faction + ally + rival trio each), optional randomization modifiers, unlocked post-campaign. NOT parallel authored campaigns. See ledger #13–14 and P29.
- **Cadence:** SCORIA runs steady-most-days when there's time. So this roadmap is **phase-based, not calendar-based** — nothing here has a date, only an order.

---

## 3. The roadmap — seven arcs, ~22 phases

Rules of the road (unchanged from Phases 0–9, they work):

1. **One phase = one build plan = one Code session = one sim extension.** Never stack unverified phases.
2. **Design before build.** Any phase marked ⚑ needs a chat-side design session FIRST (that's the "bring the frontier model" flag — see §4).
3. **Content phases repeat; system phases don't.** Arc C is the template every future region reuses.
4. Boss/balance numbers only change through sims.

### Arc A — Close out the demo (P10–P12)

| Phase | What ships | Notes |
| --- | --- | --- |
| **P10 — Starter select** | The tavern handler offers the fixed trio (Slagling / Staticur / Marrowling); Staticur→Voltwraith line built; ⚠ re-sim the Barrow-King with a Gale starter (flagged in `ROSTER §7`). | Spec is already locked in ROSTER §7. **Ready for a build plan today.** |
| **P11 — The control seam** ⚑ | Action-denial engine (skip/override/fizzle/wake triggers) + wave-2 statuses: Stunned, Sleep, Shock, Charmed. Enemy AI learns to use status moves. | The one real engine extension left in combat. Design the seam + AI policy first; sim every status. |
| **P12 — Corelocks v1 (trainer battles)** | Data-driven corelock encounters: fixed teams, no catching, gilt reward stub, rematch flag. 2–3 corelocks placed on existing maps. | The canonical "first post-V1 add" from the bible. Mostly rides existing battle code. |

**Milestone: the demo is COMPLETE.** Every system the demo promised exists; the game teaches type, role, status, evolution, and now human opposition.

### Arc B — The merc loop (P13–P15)

| Phase | What ships | Notes |
| --- | --- | --- |
| **P13 — Gilt & items v1** ⚑ | Currency, inventory, the innkeep's locker; battle Item action; **tiered cores that binding consumes**; the **five-tier loot engine** (ledger #24); **Temper v0** (ledger #25); wipe/stake laws. | Scope grew by design (F2 session) — loot structure + Temper meters land here so histories are real when Arc D arms them. |
| **P14 — Contracts v1** | The tavern board becomes real: hunt/clear/fetch contract types, gilt payouts, completion flags. Quest-flag framework (the story spine will reuse it). | Contracts are the merc spine made mechanical (`STORY_AND_WORLD §2`). |
| **P15 — Reputation v1** ⚑ | Faction rep tracks + thresholds; contracts grant rep; first **rep gift** (a faction entrusts a starter-grade numen, per ROSTER §7). | Design the rep model first (thresholds, decay?, opposed-rep rules). |

**Milestone: the game loop is the FANTASY** — take contracts, earn gilt and trust, build the roster.

### Arc C — Region 2: the template (P16–P18)

The most important arc: it proves the **repeatable region recipe** (world → roster → gate). Regions 3+ are this arc re-run with different factions/biomes — that's how a 30-hour game gets built without new systems.

| Phase | What ships | Notes |
| --- | --- | --- |
| **P16 — Region 2 world** ⚑ | Pick the territory (natural picks off the Emberfall frontier: Bone heartland, or Wayfarer roads toward the Concord). Maps, biome tiles, NPCs, whispers, a settlement, hearths. | The creative pass (geography, whispers, landmarks) is chat-side with Shane; the build is content-only. |
| **P17 — Roster batch 2** ⚑ | ~12–15 new numens (designed in ROSTER-pipeline batches chat-side; Aether's first whisper is an option here), encounter tables, sprites. | Design chat-side per the locked template; the Code session is data + sprite entry. |
| **P18 — Gate 2: the first LEADER** ⚑ | The first faction leader (or their rival, if aligned — the branching gate from `WORLD_AND_CREATURES §10`). Cap raise #2 (15→~20). Full sim suite. | First leader-or-rival fork = first real alignment consequence. Boss design + sim like the Barrow-King got. |

**Milestone: the region recipe is PROVEN.** From here, world-growth is cranking a known handle.

### Arc D — Depth systems (P19–P22)

| Phase | What ships | Notes |
| --- | --- | --- |
| **P19 — Passives v1** | Stat passives, status-on-hit, regen/shield buffs; starter passive lines; the no-passive faction identity. | The seam has existed since Phase 7. Pyrecap's Ember Hunger is waiting. |
| **P20 — Temper's TEETH** ⚑ | The meters exist since P13 (v0) — this arms them: Wrath chip-damage to a hero HP pool (the pool ships as a bare number — full hero combat stays post-V1), neglect/ranch-time sources, meter velocity re-tuned against real accrued histories. | Temper math wants a design session + sim (meter velocity is a balance surface). |
| **P21 — Branching evolution** ⚑ | The first-evo race (Bond/Wrath/Neutral branches); **Pyrecap** (first Wrath branch, first off-type move); the **Cairn Path** (Borck→Dolmen); Mycelegion becomes reachable as caps rise. | The bible's marquee system. Design session covers thresholds + the race edge cases. |
| **P22 — The Ranch v1** ⚑ | The haven plot: passive Bond gain, non-cruel harvest v1, release, forge STUB. Earned upgrades framework (achievements-lite). | Biggest design debt in the bible (5 open questions in `WORLD_AND_CREATURES §12`). Answer them first; build small. |

### Arc E — The story lands (P23–P26)

Story content is written **chat-side with Shane** (the tone bar is his); Code wires delivery. Every phase reuses the P14 flag framework.

| Phase | What ships | Notes |
| --- | --- | --- |
| **P23 — Narrative framework** ⚑ | Dialogue choices, flag-driven branches, cutscene-lite staging (walk-in NPCs, forced walks, fades), a story-state machine. | Small engine, big leverage. Design the beat-sheet FORMAT here too. |
| **P24 — Act 1: the threads** ⚑ | The Ledger surfaces through contracts gone wrong; the Concord introduced; Murkmaw's foreshadow pays its first dividend. Mystery-over-hand-holding per `STORY_AND_WORLD §8`. | Beat sheet chat-side → whispers/contract text authored → wired. |
| **P25 — Act 2: alignment bites** ⚑ | Faction fork consequences; the Black Feast glimpsed; rep-gated scenes; the back-third fork is set up. | |
| **P26 — Act 3: the fork & endings** ⚑ | Stop the Feast / join it; divergent climaxes; multiple endings, all landing on the war reigniting (the sequel seam). | The Founder reveal lands here, in layers, per the onion. |

**Milestone: it's a GAME game** — a campaign with a beginning, a betrayal, and endings.

### Arc F — The arena & postgame (P27–P28)

| Phase | What ships | Notes |
| --- | --- | --- |
| **P27 — The Brutal Arena** ⚑ | The roguelike side-mode: escalating gauntlets, wagered gilt, draft/lockout rules, **opt-in flagged permadeath stakes** (the bible's stakes pillar, contained where it belongs). Run seeds, purse curve, leaderboard-of-one. | Design the ruleset first — this is a new mode, not a new engine. Battle code is reused whole. |
| **P28 — Postgame set** | Gambling hall, corelock rematches at cranked difficulty, hidden hunts (first mythics), free-roam sweep. | Content on existing systems. |
| **P29 — NG+ Faction Remix** ⚑ | Alternate faction starts as bonus difficulty: pick an origin faction → start in their territory with their local trio (faction/ally/rival starters), difficulty + randomization modifiers (shuffled encounters, tighter caps — ruleset TBD). Unlocked by finishing the campaign. | Needs the faction ally/rival web formalized (F11) + at least Regions 2–3 built to host origins. |

### Arc G — Presentation (P30–P32) + the ART TRACK (parallel)

| Phase | What ships | Notes |
| --- | --- | --- |
| **ART SPIKE** ⚑ (runs early — any time after P12) | The style bible + pipeline proof: 3 existing numens re-sprited via the §6 pipeline, dropped into the live texture keys. Go/no-go on the approach. | Do NOT wait until the end — art batches then ride along with each region. |
| **P30 — Audio** | Music beds per region + battle; SFX pass. Licensed packs or AI-gen, curated. | |
| **P31 — Juice** | Battle feel (shake, flashes, HP-bar tweens), transitions, menu polish, title screen art. | |
| **P32 — Packaging** | Tauri wrap → .exe; file-based saves; an itch.io page (free) **if** Shane feels like it. | The vite `base:'./'` seam was left for exactly this. |

---

## 4. Which model, when (the routing law)

**The principle: frontier for decisions, Sonnet for execution, Haiku for sweeps, local for longlists.** The build plans are detailed enough that execution rarely needs the big model — that's the leverage of the phase-plan discipline.

### Bring Fable 5 (or the current frontier model) — the ⚑ moments

Every ⚑ phase above gets a chat-side **design session** with the frontier model BEFORE its build plan exists. Specifically:

| # | Frontier session | Feeds |
| --- | --- | --- |
| F1 | Control-seam architecture + enemy-AI policy | P11 |
| F2 | Economy design: gilt values, item list, core scarcity, shop stock | P13 |
| F3 | Reputation model (tracks, thresholds, opposed-rep) | P15 |
| F4 | Region 2 creative pass: geography, whispers, roster batch (a run of sessions, not one) | P16–P17 |
| F5 | Leader/rival gate design + sim interpretation | P18 |
| F6 | Temper math + branching-evolution thresholds | P20–P21 |
| F7 | Ranch design (answer the bible's 5 open questions) | P22 |
| F8 | Narrative framework + Act beat sheets (the biggest run of frontier sessions in the plan) | P23–P26 |
| F9 | Arena ruleset | P27 |
| F10 | Art style bible + spike prompts | ART SPIKE |
| F11 | The faction ally/rival web (formalizes STORY_AND_WORLD §6's rough sketch) + NG+ remix ruleset | P29 (and start #2's trio) |

Also frontier: **authoring every build plan** (the PHASE*.md docs — they're the real IP of this workflow), **post-phase verification** on risky phases (P11, P13, P18, P21, P27 — an adversarial read of the diff + sim results, adversarial review), and **anything that would change locked combat math**.

### Sonnet (Claude Code) — the workhorse

Executing any locked build plan; content batches (maps, species data, moves, encounter tables from specced tables); refactors; sim runs; sprite-data entry. Phases WITHOUT ⚑ (P10, P12, P14, P19, P28–P31) can go straight from "frontier writes the plan" to "Sonnet builds it." Historical evidence: Phases 3–9 each shipped in about one session against plans of this quality.

### Haiku — the sweeper

README/doc refreshes after each phase, changelog notes, package.json hygiene, vocabulary sweeps. Never balance, never engine.

### Local LLMs — honest assessment

Useful, narrowly:

- **Longlists for Shane's curation:** name candidates, NPC bark variants, contract flavor-text drafts, numen blurb first-drafts. The tone bar (grounded, no edgelord) means local output is **ore, not metal** — you veto 90%, keep 10%, exactly like the NAMES.md process.
- **Log summarization:** sim output digests, playtest-note cleanup.
- **NOT for code in this repo.** The rework cost of low-context patches to a tuned, sim-guarded codebase eats the savings. Every line of game code goes through Claude Code.
- **The real local-AI win is image models, not language models** — see §6. If the machine runs local LLMs, it can likely run Stable Diffusion-family models, and THAT is where local compute pays.
- (Parked, far-future toy: local-LLM ambient NPC chatter behind a curated filter. Fun; not on the road.)

---

## 5. The mega-session question — what one big Claude Code day can and can't do

**The proven unit is one phase per session.** Phases 3–9 each landed as a plan → build → sim cycle. Stacking unverified phases is the known failure mode of agent swarms; the sim harness is what makes stacking survivable at all.

What a well-prepped **mega-session** (multi-agent, full day) can realistically ship:

| Mega-session | Contents | Precondition |
| --- | --- | --- |
| **Demo close-out day** | P10 + P12 back-to-back (both spec-ready or nearly), sims between | P11 excluded — it needs its design session first |
| **Region day** | All of Arc C's build side: maps + roster data + encounters + sprites + sims (agents split: world-builder / data-entry / sim-verifier) | Every design input locked chat-side FIRST (F4, F5 done) |
| **Art batch day** | Re-sprite a whole region through the pipeline | Style bible + spike proven |
| **Story wiring day** | An act's authored beats wired into flags/dialogue | Beat sheet + prose already written chat-side |

Formation shape that fits this repo: **plan agent nothing** (the plan already exists — that's the point), **2 builder agents on disjoint files** (data/ vs scenes/), **1 verify agent running sims + acceptance criteria** before anything merges. Keep it to 3 agents; the codebase is small enough that more just collide.

**What can never be a mega-session:** the ⚑ design decisions, story prose, art taste, balance FEEL. Those are Shane-in-the-loop by design — they're also the fun part, so protect them from automation.

**The honest total:** ~23 phases ≈ ~23 Code sessions + ~11 frontier design sessions + playtests. At "steady most days" pace that's roughly a year of hobby cadence to the Act-3 milestone; arena and polish ride behind. No dates, only order — but that's the true size of a 30-hour game, and it's genuinely reachable because the factory already works.

---

## 6. The AI art pipeline (state of play, Aug 2026)

Current landscape, researched 2026-08-06:

- **Dedicated pixel-art models beat general models.** [Retro Diffusion](https://retrodiffusion.ai/) (RD Plus / RD Tile / RD Animation) is purpose-trained for grid-aligned, limited-palette sprites and can output **sprite sheets** (walk cycles, idle, VFX) — and has locally-runnable model versions plus an Aseprite extension. [PixelLab](https://www.sprite-ai.art/blog/best-pixel-art-generators-2026) generates characters/tiles, animates via skeleton rigs, and rotates sprites across facing directions (~$10–50/mo tiers).
- **Local is viable:** ComfyUI with pixel-art-trained checkpoints/LoRAs (pixel-art-diffusion, SDXL-PixelBase) runs on the same class of GPU that runs local LLMs. [Guides here](https://gamineai.com/blog/how-to-make-pixel-art-with-ai-for-games) and [here](https://www.alibaba.com/product-insights/how-to-generate-retro-pixel-art-sprites-using-comfyui-with-consistent-palette-and-animation-frames.html).
- **The 2026 consensus workflow** ([survey](https://www.apatero.com/blog/ai-game-art-generator-sprites-textures-2026), [tool tests](https://techsy.io/en/blog/best-ai-game-asset-generators)): generate large → downscale → re-index to a locked palette → hand-clean in Aseprite. Generate ~20 variants, keep the best, refine. Consistency across a roster still needs human palette-locks and cleanup — AI is the sketch artist, not the finisher.

**SCORIA's pipeline (the spike will prove or kill this):**

1. **Style bible first** (F10): canvas size (probably 48–64px creature sprites), the locked muted palette (already exists in `data/palette.js` — a real head start), line/dither rules, silhouette-first composition, "grounded, a little wrong" reference board.
2. **Per numen:** prompt from the bible's blurb (they're already vivid art briefs — *"a patch of dark with a suggestion of a mouth"*) → batch 10–20 → Shane picks → downscale/re-index to the SCORIA palette → cleanup pass → drop into the existing texture key. The procedural system stays as the instant-placeholder tier for new designs.
3. **Environments:** RD Tile / tile LoRAs for tileset textures; the ASCII map system doesn't change at all — only `render/textures.js` swaps art in.
4. **Consistency guard:** one LoRA or style-reference set per the style bible, re-used for every batch, so numen #40 matches numen #4.

Budget honesty: $0 (full local) to ~$15/mo (hosted RD/PixelLab convenience). Versus ~$50–200/creature commissioned, the AI pipeline is what makes a 150-numen north star survivable — with Shane as art director instead of artist.

---

## 7. Hygiene — do these before ANY new phase

1. **`git init` + first commit + push to a private GitHub repo.** Non-negotiable; everything else in this doc is gambling until this exists. (~20 minutes including the GitHub remote. The `.gitignore` is already written.)
2. Tag the current state `v0.9-demo` so Phase 9 is a permanent restore point.
3. Freshen `package.json` (name: scoria, version 0.9.0, description) and the README's phase banner. Haiku-tier sweep.
4. From now on: **one commit per phase minimum**, tagged (`p10`, `p11`, …). Mega-sessions commit per sub-phase.
5. **The reports law (ledger #30):** every phase closes by writing `reports/PXX_REPORT.md` (outcome, acceptance table, sim findings, flags, names awaiting veto), committed before the tag. Chat-side Claude reads reports instead of pasted transcripts.

## 8. First three moves

1. ~~Hygiene pass~~ ✅ DONE 2026-08-09 (git repo + tag + renames; Shane's two manual steps: rename the folder, push to GitHub — see §7).
2. ~~P10 build plan~~ ✅ DONE 2026-08-09 — `PHASE10_BUILD_PLAN.md` is written and ready for Code.
3. **NEXT: run P10 in Claude Code**, playtest it, then the **F1 design session** (control seam + wave-2 statuses + AI policy) whenever there's a spare evening — pure chat-side design, unblocks P11.

## 9. Decisions ledger — 2026-08-09 session (Shane's calls of record)

| # | Decision | The call | Feeds |
| --- | --- | --- | --- |
| 1 | Roguelike elements | **Arena side-mode.** The persistent-world kill stands; runs live in the postgame arena only. | P27 |
| 2 | Ship target | Personal-scale full campaign, **~30 hr main story**; publishing optional, never a deadline. MMO recorded and shelved. | all |
| 3 | Art | **AI sprite pipeline** + procedural underlay. | §6, ART SPIKE |
| 4 | Cadence | Phase-based, no dates. Runs when there's time. | pacing |
| 5 | Starter-select scene | **Three cores on the tavern table** — inspect name/type/role/blurb, NO stat screens, confirm-final. | P10 |
| 6 | Unpicked starters | **Two rival greenhorns take them** — recurring rivals; one may drift Ledger-ward. | P10, P12 |
| 7 | Voltwraith silhouette | **PUPPETED UPRIGHT** — the graft drives now; marionette-hunched, wrong. | P10 |
| 8 | First corelock cast | **Road mercs + ONE Obsidian Ledger collector** as the closer — the story's first onscreen thread. | P12 |
| 9 | Core economy | **Tiered salvage cores** — rough / trued / forge-sealed; shops never run dry of roughs. | P13 |
| 10 | Wipe penalty | **~10% carried gilt lost on blackout** (never items/numens); lands with the economy. | P13 |
| 11 | Region 2 | **The Bone heartland** through the Hollow's threshold; the somber warden is the first LEADER gate. | Arc C |
| 12 | Repo identity | **Rename everything** — repo/package `scoria`; the folder rename is Shane's manual step. | §7 |
| 13 | Faction-start vision (dropped mid-session) | P10 = **fiction reframe only**: the handler names each core's faction origin (Forge-make / barrow-salvage / the Remnant castoff nobody wants). ROSTER §7's fixed-trio lock and the gate tuning HOLD for the Emberfall start. | P10 |
| 14 | Alternate faction starts | **NG+ / remix / hard-mode bonus, post-campaign** — curated 3–4 origins, each a local faction+ally+rival trio in that faction's territory, with difficulty/randomization modifiers. ONE authored campaign; replay starts are a mode, not new campaigns. Needs F11 (the ally/rival web). | P29 |

**F1 session addendum — 2026-08-10 (the control seam; P10 shipped + verified same day; implemented by `PHASE11_BUILD_PLAN.md`):**

| # | Decision | The call | Feeds |
| --- | --- | --- | --- |
| 15 | Anti-stunlock law | **Braced window** — Stun skips exactly one action, then 2 turns of Stun immunity. No chains, either direction. | P11 |
| 16 | Sleep × binding | **×1.5 bind bonus while asleep** (Sleep only) — the catch formula's statusBonus seam goes live. | P11 |
| 17 | Charmed behavior | **Coin flip per action:** 50% strikes itself at half power, 50% hesitates; never targets its charmer. | P11 (dark), P12+ |
| 18 | Swap vs control | **Swap-out cleanses control statuses** (Stun/Sleep/Charm/Shock); DoTs persist. The swap turn-cost buys the escape hatch. | P11 |
| 19 | Wave-2 wiring | **Stun + Sleep wired now** (Sistern *Undertoll* Lv8, Fenlight *Lull* Lv7, Borck *Concuss* Lv8 — names veto-able); **Shock + Charmed ship dark.** | P11 |
| 20 | Wild AI | **`cunning` species flag** — wilds greedy by default; Fenlight flagged now; **Murkmaw debuts Charmed when it wires** (P12+). | P11, P12 |
| 21 | Bosses vs control | **Full denial immunity** for `isBoss` ("The Barrow-King does not sleep."); DoTs/statMods still land. Locked bars hold by construction. | every boss |
| 22 | Hasted/Drowning | **Stay seamed** for the arena / Region 2's Tide content. | P27 / Arc C |

**F2 session addendum — 2026-08-10 (the merc-loop mega day; implemented by `PHASE12/13/14_BUILD_PLAN.md`):**

| # | Decision | The call | Feeds |
| --- | --- | --- | --- |
| 23 | "Lumen" | Typo, confirmed. **Numen stands.** (Recorded because the ledger remembers everything.) | — |
| 24 | Loot system | **Five-tier MMO/JRPG-style loot engine NOW** — commons: materials/gilt/cores/berries; rare+: better cores, reserved rolls; epic/mythic: the good stuff. Payload classes `gear`/`technique`/`cosmetic` exist in schema but **fall back to rich salvage** until their host systems (hero gear, the forge, the ranch) ship. Structure now, payloads later. | P13 |
| 25 | Temper v0 pull-forward | Meters ship NOW: faint→Wrath with **Shane's escalating ramp** (streak-based), wins/berries/rest→Bond, one muted temperament word (steady/devoted/rancorous/fervent), zero combat effect. **The teeth stay Arc D** (P20 = Temper's teeth: Wrath chip-damage + hero HP pool; P21 branching reads these histories). | P13, Arc D |
| 26 | Duel stakes | **Purse rides both ways** (stake = half purse, replaces the 10% wipe law for duels) + Wrath ramp on faints + **duel outcomes and contract faction-tags recorded to flags now** (rep effects wait for P15) + **rumor barks** — the world quietly keeps your record. | P12–P14 |
| 27 | Wilds & learnsets | **Wilds (and corelocks) know every learnset move ≤ their level**; Lull→Lv6. Deep Hollow Lv9s arm up by design; the Slagling-vs-Fenlight trap gentles (~22% per P11 sim). Full misery re-sim in P12. | P12 |
| 28 | Bleed × denial | **A denied action does not trigger Bleed's on-action bite** — locked engine law (a creature that never moved doesn't bleed for moving). | engine |
| 29 | Charmed's debut | **The Ledger collector's Murkmaw** (post-boss threshold, override kit with *Gloam*) — a deliberate whisper: the Ledger holds what shouldn't leave the deep. Wild Murkmaw stays pure. | P12 |
| 30 | The reports law | **Every phase ends with Code writing `reports/PXX_REPORT.md`, committed, before the tag.** Shane says "CC finished"; chat-side reads the report directly. Backfilled from P11 onward. | workflow |

**F10 session addendum — 2026-08-11 (the art spike + post-mega calls; implemented by `PHASE_ART_SPIKE_BUILD_PLAN.md`):**

| # | Decision | The call | Feeds |
| --- | --- | --- | --- |
| 31 | Art style | **Mid-res pixel at NATIVE 48×48 on the locked palette** ("go with what you recommend," 2026-08-10) — pinned to the live `creature-*` texture keys so art swaps in with zero code changes. Law: `design/ART_STYLE_BIBLE.md`. | ART SPIKE, all art |
| 32 | Art coverage | **One hero side-view battle sprite per species: 20 + the Barrow-King = 21** (code count of record; the "18" was slots, not forms). Authored facing RIGHT, enemy slot mirrored. Overworld stays procedural for now. | ART SPIKE |
| 33 | Animation | **Static sprites + tween juice** (breath-bob, hit-shake, lunge, faint-crumble); no frame animation this milestone. | ART SPIKE, P31 |
| 34 | Art rig | Machine scanned (Shane's ask): **RX 7900 XT/XTX 20–24GB, 7950X3D, 64GB — high-end but AMD.** Call: **hosted Retro Diffusion for the spike** (~$10–15/mo, cancel after; purpose model, palette-lock, zero setup) — local ComfyUI-on-ROCm stays the documented batch-scale option, decided at go/no-go. *(Chat rec under delegated authority; standing unless vetoed.)* | ART SPIKE |
| 35 | Duel tunes (B-1/2/3) | **Apply all three:** sellsword → Lv9/9 (≈74.2%), outrider → Lv9/8 (≈62.4%), collector → Lv14/12 (≈45.9%) — all measured in-band; kits/purses/prose unchanged. | spike Leg 0 |
| 36 | The Ember wall (B-6) | **Item-lock the Barrow-King's chamber** — a flag + one refusal line ("Nothing you carry will help you here," veto-able), never his stats. All locked bars survive verbatim. | spike Leg 0, every gate boss |
| 37 | The friend build (B-8) | **Ships double-clickable:** vite `iife` output + re-verify + re-zip. RUN-ME shrinks to one line. | spike Leg 0, P32 |
| 38 | Roster field | **The things-over-animals bias is RETIRED** ("overly harsh" — Shane, 2026-08-11). Animal, insect, abstract, construct: all welcome for consideration; the grounded twist stays encouraged, optional. ROSTER §4 amended. | Arc C+ roster batches |

*B-4 disposition (no action, on record): the population reading of difficulty bands stands for now; F3/P15's sim widens to 8–12 archetype parties (reading 2); engine variance (reading 3) only ever with a full boss re-sim — effectively never. B-5 rides along: the sim gains a duo-Lv7 rung when P15's harness is touched.*

The factory is built and proven. From here, the whole game is: **design chat-side → lock the plan → let Code build → sim it → play it.** Repeat ~22 times, swap the art in along the way, and SCORIA is a real, finished, 30-hour game.
