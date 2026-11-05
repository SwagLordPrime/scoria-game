# SCORIA — Phase 13 Build Plan (for Claude Code): GILT, THE FIELD KIT & TEMPER v0

**Read first:** `ROADMAP.md` §9 ledger (#9, #10, #16, #24–26), `reports/P12_REPORT.md`,
`design/WORLD_AND_CREATURES.md` §11.1 (Temper canon) + §12 (ranch north star),
`design/NAMES.md` (gilt). Builds on 0–12. **Mega-day leg 2 of 3** — gate on green sims,
commit, tag `p13` before P14. Blockers → `reports/MEGA_BLOCKERS.md`, never guess.

## 0. Guardrails (standing)
Standalone. `design/` read-only. **Barrow-King numbers LOCKED** — items may change his
*fight*, never his *stats*; see §7's item-budget law. Battle-only statuses. Reports law:
end by writing `reports/P13_REPORT.md`. Commit per §.

## 1. Goal
The merc economy breathes: **gilt**, a **lean field kit**, the innkeep's locker (shop),
**tiered salvage cores that binding now consumes**, the **five-tier loot engine**
(ledger #24), **Temper v0** (ledger #25), and the wipe laws (ledger #10, #26). P12's
recorded purses **pay out retroactively** on first load. **Out of scope:** gear /
technique / cosmetic payloads (slots reserved, fallback law §5), the ranch, contract
income (P14), Shock wiring, any Temper teeth (chip damage, branching — Arc D).

## 2. Gilt & the save
- `GameState.gilt` (int). Sources this phase: duel purses (incl. **retroactive payout of
  P12 `flags.duels` wins on first v5 load — one-time, logged quietly**), loot drops,
  selling salvage. Sinks: the locker (shop), duel stakes, the wipe law.
- **Wipe laws:** wild-battle party wipe → lose **10% of carried gilt** (floor 0, never
  items/numens; one dry log line). Duel loss → **stake = half the duel's purse** (min
  10, capped by held gilt) — *replaces* the 10% for duels.
- **Save v5** (additive): `gilt`, `inventory`, per-creature `temper: { bond, wrath,
  faintStreak }`, `flags.lootSeen`. Legacy (≤v4) backfill: gilt 0 (+retro purses),
  starter inventory (§3), temper all-zero. Continue must load old saves clean.

## 3. The field kit (lean — ledger's items decision)
| Item | Effect | Price (buy/sell) |
| --- | --- | --- |
| **Salve** | heal 35% maxHp (battle: costs the turn; field: anywhere) | 25 / 8 |
| **Deep salve** | heal 70% maxHp | 60 / 20 |
| **Clean rag** | cleanse all statuses from one numen (battle or field) | 40 / 12 |
| **Rough core** | bind attempt, baseline odds (today's formula ×1.0) | 20 / 6 |
| **Trued core** | bind ×1.25 | 60 / 20 |
| **Forge-sealed core** | bind ×1.6 — **drop-only, never sold** | — / 90 |
- **Binding consumes a core** (tier chosen at throw if >1 tier held). Failed = spent.
  Multiplier applies before the 0.9 cap; stacks with Sleep's ×1.5 (cap still rules).
- **Never-zero law (ledger #9):** locker never runs dry of roughs; hearth rest tops you
  up to 3 roughs if under (a gift, logged once: "Someone left cores by the hearth.").
- New Game grants: 5 rough cores, 2 salves. Legacy saves: same grant on v5 migration.
- Battle gains an **Item** action (menu: usable items only; using = the turn).
- No revive item — fainted stays fainted until a hearth. V1 law, deliberate.

## 4. The locker (shop v1)
The **innkeep** sells (a locker behind the bar — no new NPC): both salves, the rag,
rough + trued cores. Buy/sell menu on a second dialogue branch; sell accepts salvage
materials and spare items at the sell column. Static stock v1. In-voice, terse.

## 5. The loot engine (five tiers, reserved slots — ledger #24)
- **Roll on every wild win** (not duels — purses cover those; not the boss — the
  threshold IS his drop), keyed by the species' rarity tier + map:
  - **common/uncommon:** materials (bone-shard, wire-spool, spore-leather, ash-glass —
    sell 3–12), gilt pinch (3–10), sometimes a rough core, sometimes a **hearth-berry**.
  - **rare:** better odds of trued core / 15–30 gilt / 2× materials; small chance of a
    **reserved-class roll** (see below).
  - **epic/mythic:** guaranteed good roll; real chance of forge-sealed core; reserved
    classes prominent.
- **Reserved payload classes** `gear | technique | cosmetic` exist in the table schema
  NOW but **fall back to a rich salvage bundle** with a flavored log ("Something in the
  wreck is beyond you — you strip what you can.") until their host systems ship (gear →
  hero pillar; technique → the forge; cosmetic → the ranch). Structure now, payloads
  later — do NOT build those systems.
- **Hearth-berry** (⚠ name veto-able): heals 25% (field or battle) AND feeds Bond +3
  (§6) — the first **treat**, canon §11.1's active Bond source, arriving with Temper v0.
- Drops auto-collect with one log line; inventory panel lists materials with blurbs.

## 6. Temper v0 (ledger #25 — meters and words, no teeth)
- Per-creature `bond` 0–100, `wrath` 0–100, hidden `faintStreak`.
- **Wrath:** on faint, `wrath += min(11, 3 + 2×faintStreak)`, `faintStreak++`. Streak
  resets on a battle it survives (win, no faint). *The ramp is Shane's spec: gentle
  first, cruel if you keep letting it fall.*
- **Bond:** +2 win-without-fainting · +3 hearth-berry (once per battle-or-rest window) ·
  hearth rest: +1 Bond, −1 Wrath (rest soothes).
- **The temperament word** (party panel, one muted word — the only UI): both <50 →
  **steady** · bond ≥50 > wrath → **devoted** · wrath ≥50 > bond → **rancorous** · both
  ≥50 → **fervent**. No numbers shown. No gameplay effect yet — Arc D gives it teeth
  (chip damage, branching). The meters must persist (save v5) and accrue correctly NOW
  so histories are real when the teeth arrive.

## 7. Verification (`scripts/sim-phase13.mjs`)
- **Economy loop:** a scripted route lap (6–8 wild wins) nets sell-value + gilt ≈ **1.5–3
  salves** — the grind faucet is real but not rich. Report the number.
- **Catch curves:** the P11 sleep-bind table re-emitted ×{rough, trued, forge-sealed} —
  assert cap behavior and that trued+Sleep at 50% HP ≈ but does not exceed 0.9.
- **Item-budget boss rows (the item law):** Barrow-King suite re-run at budgets {0, 2
  salves, 2 deep salves}. Boss numbers LOCKED — if deep salves flip Ember-only to a win
  or make the duo bar safe-comfortable, the lever is **price/stock** (flag it), never his
  stats. Report all rows; assert the 0-budget bars are byte-identical to P12's.
- **Temper accrual:** scripted 25-battle session (wins, faints, streaks, berries, rests)
  → meter trace + word transitions land where §6 says; streak resets verified.
- **Loot distribution:** 10k rolls per tier vs table weights (χ² sanity); reserved-class
  rolls always produce the fallback bundle + line; never a dead drop.
- **Saves:** v4→v5 migration (grant + retro purses paid exactly once), Continue clean,
  New Game reset. Full P12 suite green. Console-clean session incl. buy/sell/throw/eat.

## 8. Acceptance (done when…)
- [ ] Gilt live with all sources/sinks; retro purses pay once; wipe laws per ledger.
- [ ] Field kit + Item battle action + the locker; binding consumes tiered cores;
      never-zero law holds at locker and hearth.
- [ ] Loot engine rolls five tiers; reserved classes fall back with the line; berry
      feeds Bond.
- [ ] Temper v0 accrues per spec; the word shows; zero combat effect; persists v5.
- [ ] All §7 rows reported; 0-budget boss bars identical; economy lap in band.
- [ ] `reports/P13_REPORT.md` written; committed per §; tagged `p13`.
