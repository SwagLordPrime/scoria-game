# SCORIA — Art Spike Build Plan (+ the mega-day patch): PROVE THE PIPELINE

**Read first:** `ROADMAP.md` §6 + §9 ledger (#31–37), `design/ART_STYLE_BIBLE.md` (the law),
`design/ART_PROMPT_SHEET.md`, `reports/MEGA_BLOCKERS.md` (B-1/2/3, B-6, B-8 — resolved by
Shane 2026-08-11), `reports/MEGA_REPORT.md`. Builds on 0–14.
**Shape:** Legs 0–1 are **Claude Code work**. Legs 2–3 are **Shane + chat** (art generation
and curation — no Code session). Gate between every leg.

## 0. Guardrails (standing)
Standalone. `design/` read-only for Code. **Barrow-King numbers LOCKED** (Leg 0 adds a
flag + a line, never touches stats). Battle-only status semantics locked. Reports law:
Code legs end with `reports/ART_SPIKE_REPORT.md` (Leg 0 findings + Leg 1 findings, one
report). Blockers → ask, don't guess. Commit per leg.

**CC prompt (Shane pastes):** *"Read PHASE_ART_SPIKE_BUILD_PLAN.md in full and execute
Legs 0 and 1 only. design/ is read-only; the Barrow-King's stats are LOCKED; ask rather
than guess. End with reports/ART_SPIKE_REPORT.md, commit per leg, tag per §1/§2."*

---

## 1. LEG 0 — the mega-day patch (Code, small; tag `p14-patch`)

Three resolved blockers, all measured in `MEGA_BLOCKERS.md`; numbers are Shane's word
(2026-08-11, ledger #35–37):

1. **B-1 — the sellsword** (`data/corelocks.js`): duo → **Lv9/Lv9**. Expected band
   reading ≈ **74.2%** (55–85 ✓).
2. **B-2 — the outrider**: → **Lv9/Lv8**. Expected ≈ **62.4%** (35–65 ✓).
3. **B-3 — the collector**: Murkmaw/Fenlight → **Lv14/Lv12**. Expected ≈ **45.9%**
   (30–55 ✓). No learnset crossings anywhere in these ranges — pure stat nudges; kits,
   purses, and prose unchanged.
4. **B-6 — item-lock the gate chamber** (ledger #36): one flag on the boss def (e.g.
   `noItems: true` on `data/bosses.js` BarrowKing — a FLAG, not a stat) + the battle
   Item action refuses during that fight with one in-voice line — working text:
   *"Nothing you carry will help you here."* (Shane veto-able, one-line change). Wipe/
   stake laws untouched; items work everywhere else.
5. **B-8 — the double-click build** (ledger #37): `vite.config.js` →
   `build: { rollupOptions: { output: { format: 'iife' } }, modulePreload: false }`.
   Rebuild, confirm boot from `dist/` (and via `file://` if the harness allows), re-zip
   as `builds/scoria-mercloop-v2.zip` with RUN-ME simplified to "double-click it."

**Verify (extend `scripts/sim-phase12.mjs` expectations + one new row):**
- The three duel bands now read IN BAND (the summary's "out of range" list is empty).
- New sim row: in the Barrow-King fight the Item action is refused (and the refusal
  does not consume the turn — mirror the P11 refusal-line pattern); his locked bars
  re-assert byte-identical; the B-6 table's Forgewrought+salve rows flip back to 0%.
- Full suite green (sim-phase5..14). Commit, tag **`p14-patch`**.

## 2. LEG 1 — the loader seam (Code, small; tag `art-spike`)

The point: **a PNG dropped in a folder becomes the sprite, no code edits ever again.**

- **`art/creatures/<SpeciesKey>.png`** (48×48 RGBA) is the drop folder — one file per
  species, exact keys from the prompt sheet (incl. `BarrowKing.png`).
- Boot: load every PNG present (vite `import.meta.glob` on `../art/creatures/*.png`,
  eager URLs) into the `creature-<Key>` texture keys; **any species without a PNG keeps
  its procedural texture** — art ships incrementally, the game never waits.
- **Mirror law (bible §2):** art faces RIGHT; the enemy-slot sprite gets `setFlipX(true)`
  in BattleScene (evolution-beat sprite too, if it renders enemy-side). Procedural
  textures may also flip — they're near-symmetric; acceptable.
- **Crisp check:** Phaser config `pixelArt: true` (verify; add if absent — check for
  visual regressions in a quick browser pass). Note in the report if the non-integer
  battle scales (2.3×/2.5×/3.6×) shimmer on real pixel art — decision rides to P31.
- Narrow authority granted: HOW the override loads (pre-gen skip vs post-gen replace)
  is Code's choice; the acceptance is what matters.

**Verify:** with a dummy 48×48 test PNG for one species: it renders in battle both
slots (mirrored on enemy side), evolution beat, and anywhere else creature textures
appear; delete the PNG → procedural returns; console clean both ways; full sim suite
still green (rendering touches no combat math — prove it by running it).
Commit, tag **`art-spike`**, write `reports/ART_SPIKE_REPORT.md` (Leg 0 + Leg 1).

## 3. LEG 2 — the generation spike (Shane + chat; no Code)

**Rig (ledger #34):** hosted **Retro Diffusion** (~$10–15 one month, cancel after) —
purpose-built pixel model, native small-canvas output, palette-lock, background removal.
Local ComfyUI on the RX 7900 (ROCm/WSL) stays the documented batch-scale option if the
subscription chafes — decided at the go/no-go, not before.

**The trio (spans the roster's whole material range):**

| Numen | Tests |
| --- | --- |
| **Slagling** | hard-surface construct + emissive discipline (the most-seen sprite in the game) |
| **Staticur** | organic beast + parasitic tech graft (the tone's poster child) |
| **Murkmaw** | abstract darkness with one readable feature (the hardest brief in the set) |

**Per numen (prompt sheet order of operations):**
1. Generate 12–16 with the sheet's prompt + shared blocks, palette-lock on
   `design/scoria-palette.png`.
2. **Shane picks** 1–3 keepers (silhouette test first — flood-fill rule, bible §4).
3. Downscale/redraw to 48×48 · re-index to the declared ramps · cleanup (outline, 2px
   margin, baseline y≈42, baked shadow ~30% alpha). Tooling: Aseprite (~$20, the right
   tool) or Photopea (free) — Shane's call.
4. Drop into `art/creatures/` → `npm run dev` → see it live in a battle.

**Chat-side support:** prompt surgery per batch, palette-swatch fixes, and honest
"this violates the bible §N" reads on candidates. Budget honesty: expect 2–3 batch
rounds per numen before a keeper; that's normal, not failure.

## 4. LEG 3 — go/no-go (Shane's call, recorded to the ledger)

**GO means all of:**
- [ ] All three sprites pass the bible's three tone tests + silhouette test, in-game.
- [ ] They read as ONE game (the consistency question — the whole point of the law).
- [ ] They sit next to procedural neighbors without clashing (mixed roster is the
      reality until batches finish).
- [ ] The per-numen effort was tolerable (Shane's patience is the real budget).

**On GO:** batch the remaining 18 via the prompt sheet as ride-along "art batch"
sessions (5–7 numens each, starters → route wilds → Hollow → boss), then Arc G pulls
(title moment, juice, audio) for the friend build.
**On NO-GO:** the fallbacks in order — (a) local ComfyUI + pixel LoRAs on the 7900
(different model character, $0), (b) PixelLab (skeleton-rig characters), (c) commission
just the 3 starters + boss, procedural for the rest. The loader seam (Leg 1) survives
any of these — nothing is wasted.

## 5. Acceptance (done when…)
- [ ] Leg 0: three duels in band · item-locked chamber verified · double-click build
      boots · suite green · `p14-patch` tagged.
- [ ] Leg 1: PNG drop-in/fallback/mirror proven · `art-spike` tagged · report written.
- [ ] Leg 2: three keeper sprites live in-game on the locked palette.
- [ ] Leg 3: GO/NO-GO recorded in the ledger with one line of why.
