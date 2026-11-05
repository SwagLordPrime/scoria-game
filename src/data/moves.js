// Shared move table — PHASE6_BUILD_PLAN §2.2 + PHASE7 §2.2 move-effect hooks. Every move
// a creature can know lives here, keyed by name; species movesets and learnsets
// (creatures.js) reference moves BY NAME, and saves persist only names — so retuning a
// power (or a status hook) here propagates to every species and every existing save on
// next load. The §4 damage model is unchanged:
// damage = max(1, floor(atk * power / def * typeMultiplier)).
//
// PHASE7 hooks (both optional):
//   applies: { status, chance } — on a hit connecting against a living target, roll
//            `chance` to inflict `status` (data/statuses.js). Re-apply = refresh.
//   recoil:  <fraction> — the user takes floor(fraction × damage dealt) self-damage
//            (min 1) — the cost of the power-12 moves.
//
// PHASE9 self-target hook (§5): `applies` may carry target: 'self' | 'foe' (a missing
// target reads as 'foe' — every pre-Phase-9 move is untouched). A POWER-0 move is a
// damage-less STATUS MOVE: it deals no damage (computeDamage returns 0, bypassing the
// min-1 clamp), always "hits", consumes the turn, and exists purely to carry its
// `applies` (Calcify: chance 1, target self). The greedy enemy AI never picks a
// power-0 move over a damaging one — wild status-move use is a future AI decision.
//
// PHASE8 move kinds (canon §6): every move is `kind: 'physical' | 'magic'` — physical
// scales off Atk, magic off Mag (combat.js routes; a missing kind reads as physical).
// Every existing move stays physical EXCEPT Toll — a bell's toll is resonance, not
// muscle. With Sistern's Mag 10 over Atk 8 that's a deliberate modest buff to the
// demo's Warden (sim-checked: scripts/sim-phase8.mjs). Emergent, intended: Burn's −Atk
// cripples physical attackers only; casters shrug it off.
//
// STATUS WIRING is deliberate about the Barrow-King (§2.5): the mono-Ember wall kit
// (Emberlash/Ram/Cinderclad) and the Bloom/Gale duo's best-damage picks (Spore Bash/
// Gust) stay status-FREE, so the sim-verified boss bars hold under max-damage play.
// Statuses live on evolution rewards, the post-boss signatures, and low-power utility
// moves a player chooses FOR the status (see scripts/sim-phase7.mjs findings).
//
// Boss-only moves (Marrow Drain / Grave Sunder) stay authored in data/bosses.js — the
// boss is a deliberately self-contained rule, not a party creature.

export const MOVES = {
  // -- starting moves (former inline defs; same numbers) ---------------------
  'Emberlash': { type: 'Ember', kind: 'physical', power: 6 },
  'Ram': { type: 'Neutral', kind: 'physical', power: 5 },
  'Spore Bash': { type: 'Bloom', kind: 'physical', power: 5 },
  'Gnash': { type: 'Neutral', kind: 'physical', power: 5 },
  'Gust': { type: 'Gale', kind: 'physical', power: 5 },
  'Flit': { type: 'Neutral', kind: 'physical', power: 4 },
  'Douse': { type: 'Tide', kind: 'physical', power: 5 },
  // PHASE8: the demo's first magic move — a drowned bell rung at you. Scales off Mag.
  'Toll': { type: 'Neutral', kind: 'magic', power: 4 },
  'Bone Rake': { type: 'Cinder', kind: 'physical', power: 5 },
  // Bone shards nick and worry the wound — the demo's Bleed move. Wild Marrowlings
  // actually pick it against Gale/Bloom targets (it out-damages resisted Bone Rake),
  // so enemies bleed the PLAYER in the Hollow, not just vice versa.
  'Clatter': { type: 'Neutral', kind: 'physical', power: 4, applies: { status: 'Bleed', chance: 0.3 } },

  // -- PHASE6 learnset moves (Slagling line) ---------------------------------
  'Cinderclad': { type: 'Ember', kind: 'physical', power: 7 }, // Forgewrought, on evolving (Lv9)
  // The two Lv15 rivals are now a real choice: the signature scorches, the slam costs.
  'Kiln Burst': { type: 'Ember', kind: 'physical', power: 10, applies: { status: 'Burn', chance: 0.35 } },
  'Overheat Slam': { type: 'Ember', kind: 'physical', power: 12, recoil: 0.25 },

  // -- PHASE6 learnset moves (Marrowling line) -------------------------------
  'Marrow Spikes': { type: 'Cinder', kind: 'physical', power: 7, applies: { status: 'Rot', chance: 0.3 } }, // Ossclad, on evolving (Lv9)
  'Grave Toll': { type: 'Cinder', kind: 'physical', power: 10 }, // Bonemarch signature, on evolving (Lv15)
  'Ossuary Crash': { type: 'Cinder', kind: 'physical', power: 12, recoil: 0.25 },

  // -- PHASE7 status utility move ---------------------------------------------
  // Low power ON PURPOSE: you throw it for the venom, not the hit (and it stays below
  // Spore Bash against the Barrow-King, so the duo's verified knife-edge is untouched
  // unless the player deliberately fishes). Mireling learns it at Lv7.
  'Blightspore': { type: 'Bloom', kind: 'physical', power: 4, applies: { status: 'Poison', chance: 0.35 } },

  // -- PHASE9 demo-region moves (§3) ------------------------------------------
  // The nine new numens' kits. Status wiring stays deliberate about the Barrow-King:
  // nothing here touches the duo's verified max-damage picks. Barbed Kick is the first
  // Trickster with teeth (Bleed on a bar the KING also bleeds on — sim-phase9 rows it);
  // Coldlight carries the first wave-1 control status; Drag Under is the game's first
  // exotic-type move on the Phase-8 chart.
  'Nip': { type: 'Neutral', kind: 'physical', power: 5 },
  'Barbed Kick': { type: 'Neutral', kind: 'physical', power: 5, applies: { status: 'Bleed', chance: 0.25 } },
  'Coldlight': { type: 'Tide', kind: 'magic', power: 6, applies: { status: 'Slowed', chance: 0.25 } },
  'Beckon': { type: 'Neutral', kind: 'magic', power: 4 },
  'Drag Under': { type: 'Umbra', kind: 'magic', power: 7 },
  'Snatch': { type: 'Neutral', kind: 'physical', power: 5 },
  'Petrified Maul': { type: 'Cinder', kind: 'physical', power: 6 },
  // Borck's signature: a damage-less self-buff — the §5 status-move hook in action.
  'Calcify': { type: 'Cinder', kind: 'magic', power: 0, applies: { status: 'Calcified', chance: 1, target: 'self' } },
  'Spore Burst': { type: 'Bloom', kind: 'magic', power: 5 },
  'Swarm': { type: 'Neutral', kind: 'physical', power: 5 },
  'Sporestorm': { type: 'Bloom', kind: 'magic', power: 8 }, // the fungal evolutions' earned nuke

  // -- PHASE10 — the wolf line's kit (§3). Both STATUS-FREE BY DESIGN: starter damage
  // kits stay clean so the boss-sim bands hold (the Phase-6/7 discipline). Names are
  // working names — Shane vetoes at playtest; renaming is a one-line change here.
  'Static Lash': { type: 'Gale', kind: 'physical', power: 6 }, // Emberlash-tier
  'Deadband Howl': { type: 'Gale', kind: 'physical', power: 8 }, // Voltwraith's evolve-reward signature

  // -- PHASE11 — the control carriers (§4, ledger #19: Stun + Sleep only; Shock and
  // Charmed ship dark with NO carrier). Low powers are deliberate — you pick these FOR
  // the status (the Phase-7 finding). Starter kits stay status-free, the standing
  // discipline. ⚠ Names NOT LOCKED (Undertoll / Lull / Concuss) — Shane vetoes.
  'Undertoll': { type: 'Tide', kind: 'magic', power: 4, applies: { status: 'Sleep', chance: 0.3 } }, // the bell tolls you under
  'Lull': { type: 'Neutral', kind: 'magic', power: 3, applies: { status: 'Sleep', chance: 0.3 } }, // the lantern-lure gets teeth
  'Concuss': { type: 'Neutral', kind: 'physical', power: 4, applies: { status: 'Stunned', chance: 0.2 } }, // a stone limb, swung flat

  // -- PHASE12 — Charmed's debut (§5, ledger #29). Gloam lives on NOTHING in the wild:
  // its only carrier is the Ledger collector's Murkmaw override kit (data/corelocks.js).
  // Wild Murkmaw stays a pure epic chase with its base kit, untouched — the deep one is
  // not the one whispering. ⚠ Name NOT LOCKED (Gloam) — Shane vetoes.
  'Gloam': { type: 'Umbra', kind: 'magic', power: 4, applies: { status: 'Charmed', chance: 0.3 } },
};

// Build a fresh move instance from its name (PHASE7 hooks + PHASE8 kind copied along).
// Loud on unknown names — a typo in a species def or learnset is a data bug, not
// something to paper over at runtime.
export function mv(name) {
  const def = MOVES[name];
  if (!def) throw new Error(`Unknown move: ${name}`);
  const m = { name, type: def.type, kind: def.kind, power: def.power };
  if (def.applies) m.applies = { ...def.applies };
  if (def.recoil) m.recoil = def.recoil;
  return m;
}
