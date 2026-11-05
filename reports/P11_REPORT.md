# P11 REPORT — The Control Seam (shipped, tagged `p11`)

*Backfilled from CC's session report by chat-side Claude, 2026-08-10. From P12 onward,
Code writes these itself at phase close — the standing reports law (ROADMAP §7).*

## Outcome
Built, verified, tagged. Six commits on main. Full sim green; Barrow-King provably
untouchable (0 control statuses across ~4,800 immune fizzles; every P10 bar re-asserts
to the decimal). Console-clean at HEAD. Adversarial verify pass (5 dimensions +
refutation) caught **3 real defects, fixed before the tag**:

1. **Braced grace tick** — the brace originally lost a turn to the same turn-end that set
   it, letting a faster stun-carrier re-stun every 2nd turn. Fixed; cadence sims show
   denies at exactly every-3rd-turn worst case.
2. **The corpse-wake law** — a killing blow no longer "wakes" a sleeping target at 0 HP
   (hp-0 checked on both wake paths).
3. **Vocabulary leak** — "its action fizzles" (spec-speak) → "the strike dies before it
   lands" (in-voice).

## Acceptance
All §8 criteria PASS: four control statuses (Stun+Sleep wired; Shock+Charmed dark with
passing sims incl. 50.1% charm coin over 20k flips), braced window, wake-on-damage
(browser-proven live), ×1.5 sleep-bind with one-per-battle hint, swap cleanses exactly
the control set (Braced + DoTs survive, both voluntary and fainted-out paths), boss
immunity with the dry line verbatim, Fenlight plays cunning (fishes the missing status,
never fishes past a kill), commons unchanged.

## Findings for the record
- **Sleep-bind curve headline:** a half-health bind is now ~80% asleep (vs 53% awake);
  the 90% cap arrives at 40% HP instead of ~10%. Sleep is self-limiting — your first hit
  wakes it.
- **Misery flags (predate P11 — the type wheel, not the new AI):** real wild Fenlight
  (Coldlight-fishing Tide sorcerer, 9% route spawn) beats a solo at-level **Slagling
  100%** of the time. Counter-intuitively a Lull-carrier is GENTLER on Slagling (~22% —
  control trades away damage tempo).
- **Shipped conservative:** route Fenlights (Lv4–6) never carry Lull (learnset Lv7;
  wilds only carry base kits). Flagged for Shane.
- **Interpretation locked into law:** a **denied action does not trigger Bleed's
  on-action bite** (ledger #28).
- BattleScene ~806 lines — under the extraction bar; no actionResolver split yet.

## Resolutions (Shane + chat-side, 2026-08-10)
- **Wilds learn their learnsets** (any entry ≤ level) + **Lull → Lv6** — ships in P12
  with full misery re-sim (ledger #27). Deep Hollow Lv9 Sisterns/Borcks arm up by design.
- The Slagling-vs-Fenlight trap stands as trap-by-design at 9% spawn, expected to gentle
  via the learnset change; re-check in P12's sim.
- Working names (Undertoll/Lull/Concuss + status chips) stand for now; revisions are
  one-line data changes (rename-alias law noted for long-lived saves).
