# Case study: SCORIA

**Role:** game director and product owner. I wrote the world, the creatures, the rules and the acceptance checks. AI coding agents (Claude Code) wrote the code.
**Stack:** Phaser 3, Vite, plain JavaScript, Node scripts for testing.
**Status:** in development, playable, 14 phases shipped.

## The problem

I wanted to make a real, finishable game without being a programmer. The usual way that goes wrong with AI tools is drift: each session forgets what the last one decided, numbers get "rebalanced" by accident, and features get half-built and declared done.

## What I built

A browser creature-collector RPG with a persistent world (7 maps), turn-based battles, catching, evolution, 12 status effects, a boss fight, a merc economy with currency, loot and a contract board, and save/load with autosave.

All the art is drawn in code, so there are no image assets to license or manage.

## How it works

The project runs on a written loop, and the paper trail is in this repo:

1. **Design docs are the source of truth** ([`design/`](design)). The build agents treat them as read-only. My calls are marked in them so nobody re-argues a settled decision.
2. **A build plan before any code** ([`plans/`](plans)). Each plan names the goal, the files the agent must not touch ("locked surfaces"), the acceptance checks and the simulation the phase must pass. I approve the plan before work starts.
3. **A headless simulation proves the rules** ([`scripts/`](scripts)). For example, the boss fight's numbers are locked, and every later sim checks they haven't moved. Phase 14's sim re-runs the economy 3,000 times to check that contracts pay enough without breaking the game.
4. **A live playtest checks what the sims can't see**, like whether a menu actually opens.
5. **The agent writes its own report** ([`reports/`](reports)) before the phase is tagged, including what it did *not* do. If it hits something the plan doesn't cover, it writes it to a blockers file instead of guessing.

## What went wrong, and what I changed

- **Agents declared things done that weren't wired up.** A sim can pass while the button that triggers it doesn't exist. That's why every phase now ends with a live browser session, and the Phase 14 report lists two real defects that session caught.
- **Numbers drifted between phases.** The fix was locking: the boss stats and other "of record" values are written into the plan as locked, and the sims fail if they change.
- **Old saves broke when new features added data.** The save format is versioned, and new fields are added so an older save still loads. The Phase 13 report shows how a one-time payout for older saves was made to run exactly once.

## What I learned

- A clear written spec does more for AI-built software than any amount of prompting in the moment.
- "Done" needs a definition that a machine can check, plus a human look at the real thing.
- Keeping a decisions ledger ([`ROADMAP.md`](ROADMAP.md)) saved more time than anything else, because nobody had to rediscover why a rule exists.

## Try it

`npm install`, then `npm run dev`. Or run `node scripts/sim-phase14.mjs` to watch the rules get checked without opening the game.
