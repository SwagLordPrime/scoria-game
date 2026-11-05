# SCORIA — Phase 10 Build Plan (for Claude Code): THE CHOICE AT THE TABLE

**Read first:** `ROADMAP.md` §9 (the decisions ledger this plan implements — esp. #5–7, #13),
`design/ROSTER.md` §7 (the locked starter-trio shape), `design/WORLD_AND_CREATURES.md` §3
(the three starters), `design/NAMES.md`, and the existing project. Builds on Phases 0–9.

## 0. Guardrails (unchanged, critical)
- **Standalone project.**
  Work only inside the project folder. `design/` docs are **read-only**. Ask before
  destructive ops. Grounded muted palette. Data-driven. **The Barrow-King's numbers are
  LOCKED** — nothing in this phase may touch `data/bosses.js` values.
- Git now exists: **commit at each § boundary you complete**, and tag `p10` when
  acceptance passes.

## 1. Goal
New Game becomes a **choice**: the handler stakes three salvaged cores on the tavern
table — Forge-make, barrow-salvage, and the Remnant castoff — and the player binds ONE.
The **Staticur → Voltwraith** line enters the game. The two unpicked cores leave the
table in the hands of **two rival greenhorns** (dialogue-only this phase; they become
corelocks in P12). The gate's three-way difficulty asymmetry is **sim-verified**.
**Out of scope:** rival battles (P12), trainer AI, economy, the control seam (P11), any
alternate faction starts (that's P29 — ledger #14).

## 2. The scene — three cores on the table (ledger #5, #13)
Flow, New Game only (Continue is untouched; see §7 for legacy saves):

1. Spawn in the tavern as now. The **handler** stands at a table bearing **three core
   objects** (interactable, distinct sprites — a dull furnace-glow core, a pale bone-white
   core, a flickering wrong-signal core).
2. The tavern **door is soft-blocked** until the pick: walking to it fires a patron line
   ("Handler's staking greenhorns today. Nobody walks out coreless.").
3. Interacting with a core shows an **inspect card**: numen name, type · role, its
   **faction-origin line** (below), and the bible blurb. **NO stat screens** — mystery over
   menus. Esc backs out freely; all three can be inspected any number of times.
   - Slagling — *"Forge-make. Honest scrap, honest heat. It'll hold a line."*
   - Marrowling — *"Salvage out of the barrow-fields. The Bone let it go cheap. It
     reassembles."*
   - Staticur — *"Nobody's make. Pulled off a dead zone by a Remnant crew. It's the one
     nobody wants — it twitches."*
4. Choosing prompts a **confirm**: "Bind this one? The choice is final." Confirm → the
   player receives it at **Lv5**, full HP, Numinary marks it seen+caught, and the handler
   gets one dry line.
5. Immediately after: the **two rival greenhorns** (§5) each claim one leftover core, one
   short line each. The door unblocks. **Autosave.**
6. The old auto-grant of Slagling is removed from the New Game path (it lives on only as
   the legacy-save default, §7).

Keep it diegetic: no special UI scene needed if the existing dialogue/menu panels can
carry the inspect card — importer's choice, but the tone bar holds (no sparkle, no
fanfare; a transaction in a tavern).

## 3. New species — the wolf line (data + sprites)
Stats are HP/Atk/Mag/Def/Spd · Gale/Striker both stages · single-evolution line, slots
**3 → 4** per the locked cap rule. Numbers are opening bids INSIDE the striker envelope
(frail, fast, hits hard) — §8's sim may tune Staticur/Voltwraith ONLY, never the boss.

| Numen | Stats | Slots | Kit | Learnset | Evolves |
| --- | --- | --- | --- | --- | --- |
| **Staticur** | 24/13/6/7/12 | 3 | Static Lash, Nip | Lv7: Gust | → Voltwraith @ **Lv12** |
| **Voltwraith** | 38/20/8/10/16 | 4 | (keeps moves) | Lv12: Deadband Howl (evolve reward) | final |

- **New moves** (shared table): **Static Lash** — Gale · physical · 6 (Emberlash-tier).
  **Deadband Howl** — Gale · physical · 8 (Kiln Burst-tier signature). Both **status-free
  by design** — starter damage kits stay clean so the boss-sim bands hold (the Phase-6/7
  discipline). Move names are ⚠ NOT LOCKED — flag them in the completion report for
  Shane's veto; build with these, renaming is a one-line data change.
- **Sprites (grounded palette, dread not gore):**
  - *Staticur:* quadruped dire-wolf silhouette; cracked visor slit over the eyes leaking a
    thin light; hackles of sparking wire; one stance-twitch feel in the pose (a frame
    offset, not animation work).
  - *Voltwraith (ledger #7 — PUPPETED UPRIGHT):* the graft drives now. **Half-bipedal,
    marionette-hunched**, forelimbs too long, standing WRONG — held up by the tech, not
    the spine. Visor crack wider, brighter. It should read as *worked by strings*.
- Blurbs (⚠ tone-review in playtest): Staticur — *"A dire wolf grafted with dead tech
  that never stopped transmitting. It twitches on a signal only it hears."* Voltwraith —
  *"It walks upright because the graft prefers it. The wolf inside has stopped arguing."*

## 4. Compendium & vocabulary
- Picked starter: **seen + caught** at grant. The unpicked two are **NOT marked seen** —
  they enter the Numinary when the rivals field them (P12). Verify the Numinary renders
  19 species cleanly (the two-column panel was sized for 18).
- All new text uses the locked register: bind / core / numen. The handler says **numens**
  naturally; nobody explains anything (mystery over hand-holding).

## 5. The rivals (dialogue-only this phase — ledger #6)
Two greenhorn NPCs present in the tavern from New Game. After the pick, each claims a
leftover core (deterministic: the eager one grabs first by list order of what remains).

- **Rival A — the eager one** (warm foil; romanticizes the merc life). Working name
  **Brann** — ⚠ NOT LOCKED, Shane vetoes/coins.
- **Rival B — the flinty one** (transactional; the Ledger-drift candidate for Acts 1+).
  Working name **Vess** — ⚠ NOT LOCKED.
- 1–2 lines each at claim + 1 ambient line if talked to after. In-voice, short, zero
  exposition. Example register (A): "Knew you'd leave one warm for me." (B): "Debts start
  today, then."
- **Flags (the P12 contract):** persist `flags.starterChoice = <speciesKey>` and
  `flags.rivals = { a: <speciesKey>, b: <speciesKey> }`. P12 derives their teams from
  these — this phase MUST record them correctly or P12 builds on sand.

## 6. World & NPC touches
- The tavern gains the handler NPC (working name **Marga** — ⚠ NOT LOCKED) + the three
  core objects; existing innkeep/patrons stay. One patron line may nod at the wolf-core
  ("that one hums through the tabletop").
- No new maps, no encounter-table changes this phase.

## 7. Save compatibility (v3 stays; additive only)
- New flags are additive. **Legacy saves (pre-P10):** `starterChoice` absent → treat as
  Slagling; backfill `flags.rivals = { a: 'Staticur', b: 'Marrowling' }` on load so P12
  behaves identically for old and new saves. Continue must load a legacy save with zero
  behavioral change (no scene replay, party untouched).
- New Game reset clears the new flags. Boot + full session console-clean.

## 8. Verification (required — `scripts/sim-phase10.mjs`)
Extend the harness; **full Barrow-King suite re-run with UNCHANGED boss numbers.** The
trio asymmetry is a **feature** (classic hard/medium/easy first-gate) — the sim's job is
to verify it's present but not degenerate:

- **Slagling-solo (hard):** stays **0% win** at every level ≤ cap (existing lock).
- **Marrowling-solo (medium):** losing-to-rare — win rate **< ~25%** at cap 10; report.
- **Staticur-solo (easy — Gale hits the Cinder King super-effectively):** should WIN at
  cap 10 **but not flawlessly** — target band ~**60–90%** win, and report average
  remaining HP (a 100% no-damage steamroll = too strong; tune Staticur down within the
  striker envelope and re-run).
- **Duos:** Staticur + a route catch ≥ the Bloom/Gale duo's bar; Bloom/Gale duo bars from
  Phase 5/9 must still hold exactly.
- Voltwraith\@12+: verify evolve fires under the cap-15 world, stats/slot/learnset land,
  and a Voltwraith at cap 15 doesn't trivialize post-boss wilds (report, don't tune wilds).
- Encounter tables untouched → assert unchanged. New Game → tavern spawn → pick flow
  flags all set; legacy-save backfill path unit-checked.

## 9. Acceptance criteria (done when…)
- [ ] New Game presents the three-core choice; no stat screens; confirm-final; door
      soft-block until pick; autosave after.
- [ ] All three faction-origin inspect lines in-voice; handler + rivals present with lines.
- [ ] Staticur/Voltwraith live with sprites per §3 (upright-wrong silhouette for the evo).
- [ ] Static Lash + Deadband Howl in the shared table, status-free.
- [ ] `flags.starterChoice` + `flags.rivals` persist; legacy saves backfill per §7.
- [ ] Numinary: picked = seen+caught; unpicked = unseen; 19 species render cleanly.
- [ ] `sim-phase10.mjs` passes: boss numbers untouched, Slagling 0%, Marrowling <25%,
      Staticur in the 60–90 band (or tuned + re-run), duo bars hold. Findings reported.
- [ ] Console-clean boot + full session; committed per § with tag `p10`.

---
*Chat-side collaborator (design) is on call. Flag ambiguity rather than guessing —
especially the Staticur band tuning, anything that would tempt touching boss numbers, and
the inspect-card UI shape. Name slates (Marga/Brann/Vess, Static Lash/Deadband Howl) ship
as working names; Shane vetoes at playtest.*
