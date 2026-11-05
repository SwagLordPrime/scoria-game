// The contract board — PHASE14 §3. Seven notices, all data. The framework that runs them
// is systems/contracts.js, and the story spine reuses it whole in Arc E.
//
// Notices are the world's voice, not a quest log: short, dry, a little wrong, and they
// never explain themselves (STORY_AND_WORLD §8). Nobody tells you what is moving in the
// grass. Shane tone-reviews at playtest.
//
// Def shape:
//   id / title      — the flag key, and the line pinned to the plank.
//   giver           — where it is taken and turned in. 'board' for all of V1.
//   faction         — recorded to flags.repLedger on completion. NUMBERS ONLY this phase
//                     (ledger #26 — the P15 seam). A missing tag records nothing.
//   type            — 'cull' | 'salvage' | 'duel' | 'scout'.
//   spec            — per type:
//                       cull    { mapId, count, species?, type? }  — counts WILD wins
//                       salvage { itemId, count }  — consumed at turn-in
//                       duel    { corelockId }     — reads P12's flags.duels
//                       scout   { mapId, x0, y0, x1, y1, retroFlag? } — touch the region
//   payout          — gilt on turn-in.
//   requires        — a flag gating VISIBILITY (the deep notice is post-boss only).
//   repeatable      — turn-in returns it to 'open' with progress zeroed.
//   lines           — { notice, accept, turnin }.

export const CONTRACTS = [
  // P9 pinned this to the plank and nothing could ever be done about it. It can now.
  // Retro-completes for anyone who already put the King down — the board does not ask
  // you to go and do it again.
  {
    id: 'hollowNotice',
    title: 'The Hollow has stopped digging',
    giver: 'board',
    type: 'scout',
    spec: { mapId: 'cave', x0: 6, y0: 12, x1: 13, y1: 14, retroFlag: 'barrowKingDefeated' },
    payout: 50,
    lines: {
      notice: '"The digging under the Hollow has stopped. Whatever stopped it, unstop it. Payment on the Bone\'s word — ask the innkeep for the mark."',
      accept: 'You take the mark. It is a bone chip with a hole drilled through it.',
      turnin: 'The mark goes back on the nail. Nobody asks what was down there.',
    },
  },
  {
    id: 'grassWrong',
    title: 'Grass is moving wrong',
    giver: 'board',
    type: 'cull',
    spec: { mapId: 'route', count: 6 },
    payout: 60,
    lines: {
      notice: '"Grass is moving wrong on the south road. Thin it. Six will do, six will not fix it."',
      accept: 'Six. You can count to six.',
      turnin: 'Somebody scratches a tally on the plank and does not look pleased about it.',
    },
  },
  {
    id: 'kilnBone',
    title: 'The kiln wants bone',
    giver: 'board',
    faction: 'forge',
    type: 'salvage',
    spec: { itemId: 'boneShard', count: 4 },
    payout: 55,
    lines: {
      notice: '"The kiln wants bone. Four shards, no questions, no provenance. — Forge"',
      accept: 'No questions. That is the part they put in writing.',
      turnin: 'The shards go into a sack that already has a lot of shards in it.',
    },
  },
  {
    id: 'wireClean',
    title: 'Wire. Clean if you can',
    giver: 'board',
    faction: 'forge',
    type: 'salvage',
    spec: { itemId: 'wireSpool', count: 3 },
    payout: 45,
    lines: {
      notice: '"Wire. Three spools. Clean if you can, dirty if you must. — Forge"',
      accept: 'Clean if you can. You note which half they expect.',
      turnin: 'They weigh it, not measure it. You decide not to mention that.',
    },
  },
  {
    id: 'outriderLesson',
    title: 'The outrider owes a lesson',
    giver: 'board',
    faction: 'wayfarer',
    type: 'duel',
    spec: { corelockId: 'outrider' },
    payout: 70,
    lines: {
      notice: '"The outrider at the south gate owes somebody a lesson. Pays whoever teaches it."',
      accept: 'It does not say who he owes it to. It rarely does.',
      turnin: 'The notice comes down. Another goes up in the same hand, about somebody else.',
    },
  },
  {
    id: 'countStones',
    title: 'Count the stones past the rubble',
    giver: 'board',
    faction: 'bone',
    type: 'scout',
    spec: { mapId: 'deephollow', x0: 1, y0: 11, x1: 18, y1: 12 },
    payout: 90,
    requires: 'barrowKingDefeated', // it only goes up once there is a way down
    lines: {
      notice: '"Count the stones past the rubble. Walk to the far end and count them. Do not bring anything back. — Bone"',
      accept: 'Count them. Not collect them. You read it twice.',
      turnin: 'You give the number. Nobody writes it down, and nobody looks surprised.',
    },
  },
  {
    id: 'alwaysGrass',
    title: 'Always more grass',
    giver: 'board',
    type: 'cull',
    spec: { mapId: 'route', count: 8 },
    payout: 40,
    repeatable: true,
    lines: {
      notice: '"Always more grass. Standing work, standing pay. Do not expect thanks."',
      accept: 'Standing work. The plank looks worn where this one hangs.',
      turnin: 'The notice does not come down. It never does.',
    },
  },
];

export const CONTRACT_BY_ID = Object.fromEntries(CONTRACTS.map((c) => [c.id, c]));

export function getContract(id) {
  const c = CONTRACT_BY_ID[id];
  if (!c) throw new Error(`Unknown contract: ${id}`);
  return c;
}

// Cap 3 — the slate, not the ledger. Counted over everything ACCEPTED and not yet turned
// in (active and done alike), so a stack of finished-but-unclaimed jobs cannot be used to
// dodge the limit.
export const ACTIVE_CAP = 3;
