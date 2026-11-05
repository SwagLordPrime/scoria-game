# SCORIA: What the War Left — Art Style Bible

**Doc status:** LAW once Shane approves — the F10 deliverable (ROADMAP §6, ledger #3, #31–33)
**Feeds:** `PHASE_ART_SPIKE_BUILD_PLAN.md` · `design/ART_PROMPT_SHEET.md` (the per-numen briefs)
**Companions:** `src/data/palette.js` (the single source of truth for color) · `WORLD_AND_CREATURES.md` §1 (the world's look)

> Every sprite that ships passes this bible. AI generates,
> **Shane curates** — the pipeline is batch → pick → re-index → clean → drop-in.
> A sprite that violates a LAW line gets fixed or killed, never shipped "close enough."

---

## 1. The style, in one breath

**Mid-res pixel art, native 48×48, on the locked muted palette.** A grounded, quietly
dark world: rust, bone, overgrowth, and old magic — *NieR*'s melancholy decay crossed
with *SMT*'s restrained dread. Muted, overgrown, a little wrong. Never bright-Pokémon,
never edgelord. Rust and rain and silence — not chrome and gore.

The three tone tests, applied to every sprite:

1. **Grounded** — it looks scavenged, grown, or accreted; nothing looks manufactured yesterday.
2. **A little wrong** — one detail is off: asymmetry, a proportion, a stillness where movement should be.
3. **Dread, not gore** — menace comes from silhouette and stillness. No viscera, no grins.

## 2. Canvas & framing (LAW — pinned to the live texture keys)

- **Native 48×48 px, RGBA, transparent background.** This drops into the existing
  `creature-<SpeciesKey>` texture keys with **zero code changes** (battle scales:
  player 2.5×, enemy 2.3×, boss 3.6×).
- **Body inside ~44×44 with ≥2 px clear margin** — the tween juice (breath-bob,
  hit-shake, lunge) must never clip the frame.
- **Feet/base on the baseline: y ≈ 42.** Airborne species (Fenmoth, Sporemote, Murkmaw)
  hover with their visual mass centered slightly above it.
- **Baked ground shadow** (matches the procedural system): black ellipse at ~28–32%
  alpha, centered x=24, y≈42–45, width scaled to the body. Hovering species get a
  smaller, fainter one.
- **Facing: author every sprite FACING RIGHT** (the hero side). The enemy slot mirrors
  via `setFlipX` — a one-line Code change in the spike plan. Avoid readable asymmetric
  text/marks that would betray a mirror.
- Bosses stay 48×48 too (the 3.6× scale does the "big" reading — the Barrow-King should
  FILL the frame, 2 px margins only).

## 3. Color (LAW — the palette is locked)

`src/data/palette.js` is the source of truth. A finished sprite is **indexed to ≤ 12
colors**, drawn from:

**a) The five type accents** (+ two exotics), used as *accent and emissive*, never as
the whole body:

| Type | Hex | Reads as |
| --- | --- | --- |
| Ember | `#a55a3a` (+ glow `#d9964f`) | furnace-heat through seams |
| Tide | `#4f6b82` | still dark water, cold light |
| Bloom | `#6f7d45` | fungal green, growth over ruin |
| Gale | `#8f8aa6` | storm-pale, static |
| Cinder | `#9a9186` | ash over bone |
| Umbra | `#5c4f6e` (types.js) | absence — darkness itself |
| Neutral | `#8f8a80` | dust |

**b) The shared material ramps** (derived in-family from palette.js, same trick as its
interior shades — each ramp ≈ light/mid/dark, outline = darkest step):

- **BONE** `#bdb6a6 / #938d7f / #5f5a4e` — parchment-dry, never white
- **SCRAP-IRON** `#8a8e93 / #6a6e73 / #43464a` — dull, pitted, rust at edges via ember-family
- **CHAR/SOOT** `#3a3d41 / #2a2d31` — burnt structure
- **RUST** `#a55a3a / #7a4630 / #52301f` — the Ember hex doing double duty, dulled
- **FUNGAL FLESH** `#a3a08b / #7b7a6c / #565548` — gray flesh, spore-pale caps
- **DROWNED BRONZE** `#6e7f68 / #56705f / #3c5248` — verdigris for bells and old fittings
- **MURK** `#282430 / #1d1f23 / #121317` — the Deep Hollow family, Umbra bodies
- **COLDLIGHT** `#9fb6c4 / #7d99ab` — Fenlight's lantern, Tide emissives
- **STATIC-PALE** `#c9c6da / #a9a5bf` — Gale sparks, visor light

**c) Rules:**

- **Bodies read as their MATERIAL; the type hex is the accent** (eyes, glow, seams,
  spores). This is the deliberate upgrade over the procedural sprites, which tinted
  whole bodies by type out of necessity.
- **One emissive element maximum per sprite** (kiln-mouth, visor slit, coldlight,
  ember eyes). The glow is the single bright note in a muted frame — two glows cancel
  the dread. **Umbra gets zero emissives**: Murkmaw absorbs light, its one readable
  feature is shape, not shine.
- **No pure white, no saturated primaries.** Brightest allowed notes: `#e6e2d2`
  (the procedural eye-white) and `emberGlow #d9964f`.
- Re-index every generated sprite to its declared ramp set before it ships (the
  pipeline's step 3) — this is what makes numen #40 match numen #4.

## 4. Line & form (LAW)

- **1 px outline in the sprite's darkest ramp step** — not pure black (reserve true
  black for Umbra bodies and eye pits). Outline may break where a glow bleeds out.
- Interior lines sparse: draw *edges of forms*, not surface detail. Let the ramp steps
  do the modeling.
- **Dither sparingly**: 2×2 checker only on broad fields (a cloak, an ash drift), never
  on faces or focal points. Prefer clean banding — mid-res pixel, not 90s PC dither soup.
- **No anti-aliasing against transparency** (halo artifacts kill the drop-in), minimal
  internal AA. Downscaled generations must be cleaned to hard pixels.
- **Silhouette first.** Every species has a "must-read" silhouette note in the prompt
  sheet. Test: flood-fill the sprite solid — if you can't name the species from the
  shape, reject the batch. Minimum feature width 2 px.

## 5. Posture & character ("a little wrong" made concrete)

- **Stillness over action.** Neutral standing pose, weight settled, mid-breath — dread
  is still. No action poses, no mid-leap (the tweens supply motion).
- **One wrong detail per creature**: a chipped horn, one torn ear, mismatched plate
  sizes, a head hung too low, legs a touch too long. Asymmetry is house style.
- **Eyes minimal**: 2 px dots, dark pits, or a lit slit. Never large, never expressive-cute.
  **No creature ever smiles.** (Established law — Voltwraith's face was rebuilt in P10
  to read dread, not grin.)
- Proportions: creature-scale, not mascot-scale. Heads ≤ ⅓ of body height unless the
  species IS mostly head (Murkmaw, Ashcap).

## 6. Per-type material language (the identity table)

| Type | Body materials | Accent/emissive | Never |
| --- | --- | --- | --- |
| **Ember** | scrap-iron, char, rust | furnace glow in seams/mouth | open licking flames, clean steel |
| **Gale** | storm-gray hide, wire, dead tech | static-pale sparks, lit visor | sleek sci-fi, blue lightning bolts |
| **Cinder** | bone, ash, grave-soil | ember-eye pinpricks | white skeletons, grinning skulls |
| **Bloom** | fungal flesh, briar, moss over ruin | spore motes, pale gills | flowers, lush leafy green |
| **Tide** | dark water, drowned bronze, silt | coldlight | clear blue water, foam, fish-cute |
| **Umbra** | murk, absence | none — ONE readable feature in bone/coldlight | purple magic glow, particle sparkle |

Constructs and amalgams mix two languages: Staticur is Gale tech ON a beast body; Borck
is stone IN bone. The join between the two materials is where the character lives — make
the graft/growth visible and uneasy. (Roster note, ledger #38: the old things-over-animals
bias is retired — animals, insects, and abstracts are all equally welcome numen stock;
the twist is optional, the three tone tests are not.)

## 7. The don't list (instant rejects)

Bright/saturated candy color · neon · chrome shine · cel outlines (thick uniform black)
· mascot cuteness, big heads, smiles · gore, viscera, blood pools · action poses ·
backgrounds, groundplanes beyond the shadow, frames, text, watermarks · painterly AA /
un-cleaned upscale mush · human figures · symmetric perfection · two emissives.

## 8. Pipeline & rendering integration (the contract with the code)

1. Generate per the prompt sheet (batch 12–16 per numen) → **Shane picks** 1–3 candidates.
2. Downscale/redraw to native 48×48; **re-index to the sprite's declared ramps** (§3).
3. Cleanup pass: outline integrity, margin check, baseline, shadow, silhouette test.
4. Save `art/creatures/<SpeciesKey>.png` (exact keys in the prompt sheet) — the spike's
   Code leg loads any PNG present and falls back to procedural for the rest. Art ships
   incrementally; the game never waits on a full set.
5. Rendering: the Code leg verifies crisp pixel scaling (Phaser `pixelArt: true`) and
   mirrors the enemy slot. Battle scales stay 2.3×/2.5×/3.6× this milestone; snapping to
   integer scales is P31 juice-pass business if shimmer bothers us.

**Animation stance (ledger #33):** static sprites + tween juice only (breath-bob,
hit-shake, lunge, faint-crumble). No frame animation this milestone — sprite sheets are
a future RD Animation experiment, post-spike.

## 9. Overworld & tiles (out of scope, recorded)

The overworld stays procedural for now (ledger #32). When tiles get their pass
(post-spike, likely per-region), RD Tile / tile LoRAs generate to this same palette law;
`render/textures.js` remains the only file that changes. Cores, UI chrome, and the
title-screen art are separate briefs — the title moment is Arc G's, not the spike's.
