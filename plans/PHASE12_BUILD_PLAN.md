# SCORIA — Phase 12 Build Plan (for Claude Code): CORELOCKS — THE FIRST DUELS

**Read first:** `ROADMAP.md` §9 ledger (#6, #8, #20, #26–29), `reports/P11_REPORT.md`
(the resolutions this plan implements), `design/STORY_AND_WORLD.md` §3a + §8,
`design/NAMES.md` (corelock, gilt registers), and the P10/P11 sims. Builds on 0–11.
**Mega-day note:** this is leg 1 of 3 (P12 → P13 → P14). Gate on green sims + commit +
tag `p12` before starting P13. If blocked, write `reports/MEGA_BLOCKERS.md` and move to
what's safe — never guess on locked surfaces.

## 0. Guardrails (standing)
Standalone. `design/` read-only. **Barrow-King LOCKED** (duels never touch him).
Battle-only statuses. Mystery-over-hand-holding in every line. Commit per §.
**End of phase: write `reports/P12_REPORT.md` (the reports law) before tagging.**

## 1. Goal
Human opposition exists: **data-driven corelock duels** — the two rival greenhorns
(teams derived from P10's flags) and the three-fight cast (ledger #8): a washed-up
sellsword, a Wayfarer outrider, and **one Obsidian Ledger collector** holding what he
should not have. Wilds learn their learnsets (ledger #27). **Charmed wires** on the
collector's Murkmaw (ledger #29). **Out of scope:** gilt payment (purses are data now,
paid when P13 lands later today), Shock wiring, reputation effects (recorded as flags
only), trainer rematká beyond a simple flag.

## 2. Engine — the duel rule set (small; battle code reused whole)
- **Corelock def (data, `src/data/corelocks.js`):** `{ id, name, epithet?, mapId, x, y,
  facing, lines: { challenge, win, lose, after }, team: [{ species, level, moves? }],
  purse, ai: 'seeker', rematch: false }`. `moves?` overrides the species kit (the
  collector needs it); absent = species kit at that level **including learnset entries ≤
  level** (see §4 — wilds and corelocks share this rule now).
- **Duel flow:** interact → challenge line + confirm → battle with: **no binding** ("Its
  core answers to another."), **no fleeing** ("You signed the duel."), swap/statuses per
  normal. Win → win line, `purse` recorded to `flags.duels[id] = 'won'`, victory log
  ("The purse is yours — {n} gilt." — *paid* when gilt exists, P13 reads the flags).
  Lose → lose line, blackout as usual, `flags.duels[id] = 'lost'` (+`lossCount`).
- **Seeker AI** for all corelocks: the sim's status-fishing policy, promoted to the game:
  fish a missing status when it beats greedy EV, never past a kill (P11's cunning logic,
  team-aware later).
- **Numinary:** corelock numens mark **seen** on reveal.
- Duel outcomes/flags are the **rep seam** (P15 reads them; ledger #26) — record
  faithfully: who, result, times.

## 3. The cast (5 duels, placed)
| Corelock | Where | Team (opening bids — sim §6) | Purse |
| --- | --- | --- | --- |
| **Rival A — the eager one** ("Brann") | Fell-Grass Route, first stretch — jumps you on your first exit after P10's pick | their starter (from `flags.rivals.a`) Lv6 | 30 |
| **Rival B — the flinty one** ("Vess") | The Hollow mouth, pre-boss — "Debts start today." | their starter Lv8 + one route catch (Snarebriar Lv6 if B took Marrowling; Mireling Lv6 otherwise) | 45 |
| **The sellsword** (washed-up, drinks at the tavern, duels on the route mid-stretch) | route, mid | Mireling Lv6 + Fenmoth Lv6 | 40 |
| **The Wayfarer outrider** (duels for news and sport, near the town gate) | town edge | Sistern Lv7 + Ashwhelp Lv6 | 60 |
| **The Ledger collector** | the cleared threshold room (spawns **post-boss only**), examining the seam | **Murkmaw Lv12** (override kit: Drag Under + **Gloam**) + Fenlight Lv10 | 90 |

- Rival teams derive from `flags.rivals` — never hardcode species. Legacy backfill saves
  (P10 §7) already carry the flags.
- **The collector is the deliberate whisper** (ledger #29): a Murkmaw *outside* the Deep
  Hollow, pre-your-own-access if you rush him. No NPC explains it. One patron bark may
  notice ("Ledger man came through. His shadow was wrong."). Storytelling law §8 applies:
  zero exposition.

## 4. Wilds learn their learnsets (ledger #27 — the P11 resolution)
- Wild (and corelock, §2) movesets = base kit + every learnset entry with
  `level ≤ instance level`, respecting slot caps (highest-level moves win ties).
- **Lull moves to Lv6** in Fenlight's learnset (one line) — rare route Fenlights at Lv6
  now open with it (cunning); Deep Hollow Lv9 Sisterns carry Undertoll, Borcks carry
  Concuss. Deep got scarier on purpose.
- **Full misery re-sim required** (§6) — expect the Slagling trap to gentle toward ~22%
  per the P11 report; report the new table, tune nothing without flagging.

## 5. Charmed wires (first carrier)
- New move **Gloam** — Umbra · magic · 4 · applies **Charmed 30%** (⚠ name veto-able).
  Lives ONLY on the collector's Murkmaw override this phase (wild Murkmaw untouched —
  the deep one stays a pure epic chase until a future phase).
- Charmed already engine-complete and sim-proven dark (P11); this is a data wire + the
  first live test: the coin flip, half-power self-hits, swap-cleanse escape, and the
  charmer-immunity all get scene-proven in §6.

## 6. Verification (`scripts/sim-phase12.mjs`)
- **Duel unit:** no-bind/no-flee enforced; purse/loss flags recorded; seeker AI fishes
  correctly and never past a kill; override kits load; learnset-armed instances build
  correct movesets at every level (slot-cap edge: exactly-full and overflow).
- **The five fights simmed** vs three reference parties (fresh starter Lv6 / route-built
  duo Lv8 / pre-boss trio Lv10): report win rates. Bands: rivals beatable at-level but
  not free (player win 55–85%); sellsword ≈ rivals; outrider stretch (35–65% for the
  duo); **the collector should beat under-prepared post-boss parties more often than
  not** (player win 30–55%) — he's meant to sting. Tune HIS levels within ±1 to hit
  bands; species stats untouched.
- **Misery table re-run** (wild learnsets on): full grid from P11 report; flag any cell
  that got crueler than its predecessor except the deep Hollow (allowed to rise).
- **Charm live-fire:** collector fight logs show coin behavior; swap cleanses it;
  Murkmaw never strikes its charmer — wait, reversed: the PLAYER's numen is the charmed
  one; assert it never strikes Murkmaw while charmed and self-hits at half power.
- **Boss suite:** untouched and re-asserted green (nothing here may touch him).
- Console-clean full session: all five duels + a wild lap + save/load mid-duel-refused
  (saving inside battle stays impossible as today).

## 7. Acceptance (done when…)
- [ ] Five duels live, placed, with in-voice lines; rivals derive from flags; collector
      post-boss-gated with the Murkmaw whisper intact.
- [ ] No-bind/no-flee laws + duel flags recorded (the P15 rep seam).
- [ ] Wild learnsets live; Lull@6; misery table reported.
- [ ] Gloam/Charmed live on the collector; scene-proven coin + cleanse.
- [ ] Sim bands hit or flagged; boss bars green; reports law satisfied
      (`reports/P12_REPORT.md`); tagged `p12`.
