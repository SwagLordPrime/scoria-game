# SCORIA — Phase 14 Build Plan (for Claude Code): THE CONTRACT BOARD

**Read first:** `ROADMAP.md` §9 ledger (#26 rep-recording, #24 loot), `reports/P13_REPORT.md`,
`design/STORY_AND_WORLD.md` §2 (the merc spine) + §8 (mystery law). Builds on 0–13.
**Mega-day leg 3 of 3** — gate on green sims, commit, tag `p14`, then the close-out (§8).

## 0. Guardrails (standing)
Standalone. `design/` read-only. Barrow-King LOCKED. Reports law: end with
`reports/P14_REPORT.md`. Commit per §. Blockers → `reports/MEGA_BLOCKERS.md`.

## 1. Goal
The tavern's contract board becomes the game's engine of intent: **take a job, do it,
get paid** — the merc loop closes. A general **quest-flag framework** ships underneath
(the story spine reuses it in Arc E). **Rumor barks** land (ledger #26). **Out of
scope:** faction reputation *effects* (P15 — but every completion records its faction
tag now), story contracts, deposits/collateral, board randomization.

## 2. The framework (`src/systems/contracts.js` + `src/data/contracts.js`)
- **Contract def:** `{ id, title, giver: 'board', faction?: 'forge'|'bone'|'wayfarer'|…,
  type: 'cull'|'salvage'|'duel'|'scout', spec: {...}, payout, lines: { notice, accept,
  turnin }, repeatable?: false }`.
- **Types v1:** **CULL** (defeat N of species/type on a map — counts wild wins),
  **SALVAGE** (deliver N of a material — consumes them at turn-in; loot tie-in),
  **DUEL** (beat a named corelock — reads P12's `flags.duels`), **SCOUT** (touch a tile
  region — cheap, teaches the map).
- **State:** `flags.contracts = { [id]: 'open'|'active'|'done'|'turned' }` + per-active
  progress counters. **Cap 3 active.** Progress ticks from existing event points (wild
  win, loot pickup, duel flag, tile step) — small hooks, no new systems.
- Menu gains a **Contracts** panel: active jobs + progress, terse.
- Turn-in at the board (or the innkeep — giver-anchored): payout in gilt, one line,
  `faction` tag recorded to `flags.repLedger[faction] += 1` — **numbers only, zero
  effects** (the P15 seam, ledger #26).

## 3. The board v1 (6 notices, in-voice, zero exposition)
| Contract | Type | Spec | Payout |
| --- | --- | --- | --- |
| The standing Hollow notice (P9's — now completable) | SCOUT | reach the Barrow-King's chamber (or `barrowKingDefeated` retro-completes) | 50 |
| "Grass is moving wrong." | CULL | 6 wilds on Fell-Grass Route | 60 |
| "The kiln wants bone." *(Forge tag)* | SALVAGE | 4 bone-shard | 55 |
| "Wire. Clean if you can." *(Forge tag)* | SALVAGE | 3 wire-spool | 45 |
| "The outrider owes a lesson." *(Wayfarer tag)* | DUEL | beat the outrider | 70 |
| "Count the stones past the rubble." *(Bone tag; visible post-boss only)* | SCOUT | touch the Deep Hollow's far end | 90 |
| *(repeatable)* "Always more grass." | CULL | 8 route wilds, repeatable | 40 |

Notices are the world's voice — write them like NAMES.md would: short, dry, a little
wrong. Shane tone-reviews at playtest.

## 4. Rumor barks (ledger #26 — the world notices you)
A small keyed bark table for tavern patrons + the innkeep, read from flags: lost to the
collector ("Ledger man walked through you, I heard. Walked through the King's door too.")
· beat the outrider · bound a Murkmaw ("You brought THAT in under your coat?") · 3+
contracts turned ("Board's thinning. Your doing?") · rancorous numen in party ("Yours has
a look. Feed it or free it."). One bark per rest-visit, priority-ordered, never repeats
back-to-back. ~8–10 lines total, in-voice.

## 5. Verification (`scripts/sim-phase14.mjs`)
- **State machine unit:** accept/cap-3/progress/turn-in/repeatable-reset; SALVAGE
  consumes exactly N; DUEL reads pre-existing flags (incl. retro-completion of the
  standing notice); SCOUT triggers once.
- **Economy with contracts:** the P13 route-lap sim re-run WITH board income — report
  gilt/hour-of-play proxy; the loop should comfortably fund salves+cores without making
  the locker irrelevant (flag if a single lap trivially funds forge-tier spending).
- **repLedger records** exactly per completion; zero gameplay reads it (grep-prove).
- **Bark engine:** priority + no-repeat verified; all keys reachable.
- Full P13 suite green; boss bars untouched; saves v5 additive (`contracts`,
  `repLedger`); Continue clean; console-clean session: accept → progress → turn-in → bark.

## 6. Acceptance (done when…)
- [ ] Board live with the 7 notices; cap 3; Contracts panel; turn-ins pay.
- [ ] All four types work off existing event points; repeatable resets.
- [ ] repLedger records faction tags, effect-free; rumor barks fire per rules.
- [ ] Sims green incl. economy-with-contracts band; `reports/P14_REPORT.md`; tag `p14`.

## 7. THE MEGA-DAY CLOSE-OUT (after p14 is green — required)
1. `npm run build` → confirm the static bundle boots (open `dist/index.html` via
   preview) → zip as `builds/scoria-mercloop-{date}.zip` — **the friend build** (Shane
   hands this to playtesters; a private itch.io page can host it later).
2. Write `reports/MEGA_REPORT.md`: the three-phase summary, every sim band vs target,
   all ⚠ flags + working names awaiting veto, `MEGA_BLOCKERS.md` contents if any, and a
   short "what P15 wants" note.
3. Final commit; push if a remote is configured (`git push --tags origin main`).
