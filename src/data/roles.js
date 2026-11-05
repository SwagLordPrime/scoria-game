// Role registry — PHASE8_BUILD_PLAN §2.4 / DESIGN_OVERVIEW §8. Role = what a creature
// DOES (playstyle axis), independent of type (matchup axis). The classic four plus the
// arcane two that arrive with the Magic stat. makeCreature/makeBoss validate against
// this table, so a typo'd role in species data fails loudly instead of rendering junk.
//
// No existing creature changes role this phase; the first Sorcerer arrives with region
// content. `lean` is the stat identity used when authoring new species, not engine data.

export const ROLES = {
  Bruiser: { name: 'Bruiser', identity: 'Reliable frontline, trades evenly', lean: 'high HP + Atk, low Spd' },
  Striker: { name: 'Striker', identity: 'Burst damage, fragile', lean: 'high Atk + Spd, low HP/Def' },
  Warden: { name: 'Warden', identity: 'Wall — stalls, buys swaps', lean: 'high HP + Def, low Atk' },
  Trickster: { name: 'Trickster', identity: 'Applies status, disrupts', lean: 'mid stats, status-focused' },
  Sorcerer: { name: 'Sorcerer', identity: 'Pure caster — the magic nuker', lean: 'high Mag + decent Spd, low Atk, frail' },
  'Battle Mage': { name: 'Battle Mage', identity: 'Hybrid — flexes physical or magic per matchup', lean: 'solid Atk AND Mag, mid elsewhere' },
};
