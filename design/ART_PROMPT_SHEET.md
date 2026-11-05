# SCORIA — Per-Numen Prompt Sheet (the F10 deliverable, part 2)

**Doc status:** LIVING — one brief per shipping sprite. Obeys `ART_STYLE_BIBLE.md` (the law).
**Coverage:** all **20 species in `src/data/creatures.js` + the Barrow-King = 21 sprites.**
(The handoff said 18 — the roster's "18 slots" counted lines, not forms. Code is the count of record.)
**Pipeline per numen:** batch 12–16 → Shane picks → downscale to 48×48 → re-index to declared ramps → cleanup → `art/creatures/<Key>.png`.

---

## Shared blocks (prepend/append to every prompt)

**STYLE PREFIX** —
`48x48 pixel art game sprite, single creature, full body side view facing right, muted earthy desaturated palette, grounded dark fantasy, post-war techno-organic decay, rust bone and overgrowth, restrained dread, still neutral standing pose, subtle 1px dark outline, transparent background`

**NEGATIVE** —
`bright colors, neon, rainbow, saturated, cute, chibi, mascot, smiling, cartoon, glossy, chrome, gore, blood, action pose, jumping, human, text, watermark, signature, background, scenery, frame, border, soft painterly shading, photorealism, anti-aliasing`

**Tool settings**
- **Retro Diffusion (the spike rig):** size 48×48 native (or 96×96 → clean 2× downscale), palette-lock ON with `design/scoria-palette.png`, background removal ON, 12–16 generations per numen.
- **ComfyUI fallback (local, RX 7900 XT/XTX):** SD1.5/SDXL + pixel-art LoRA, 512×512, ~25 steps, downscale to 48 + palette re-index (the style bible §3 ramps), background knockout.
- Per-numen lines below give: the in-code blurb (the true brief), the prompt subject, body ramps + accent, the silhouette must-read, the one wrong detail, and per-numen don'ts.

---

## Starter lines

### 1. Slagling — Ember/Bruiser · `creature-Slagling` · starter
- **Blurb:** *A molten scrap-frame on a burning core. Scavenged, scorched, never shiny.*
- **Prompt:** squat bulky little war-machine golem built of mismatched scavenged iron plates, furnace core glowing through chest seams, heavy low stance, scorched and pitted metal
- **Ramps:** scrap-iron + char + rust · **emissive:** ember glow `#d9964f` in chest seams
- **Silhouette:** squat trapezoid hulk, one chimney-stub shoulder
- **Wrong detail:** plates visibly mismatched in size; one arm heavier than the other
- **Don't:** clean robot, rivets-neat armor, open flames

### 2. Forgewrought — Ember/Bruiser · `creature-Forgewrought`
- **Blurb:** *The scrap has been rebuilt into armor. It walks like something forged on purpose.*
- **Prompt:** armored biped furnace-knight of welded salvage plate, taller and deliberate, banked furnace light in chest and eye slit, heavy gauntlets
- **Ramps:** scrap-iron + char + rust · **emissive:** chest/eye-slit glow
- **Silhouette:** upright armored biped, broad shoulders, small head
- **Wrong detail:** armor seams don't align — rebuilt, not born
- **Don't:** knightly heraldry, polish, symmetry

### 3. Warkiln — Ember/Bruiser · `creature-Warkiln` · finisher
- **Blurb:** *A walking kiln, chimney-crowned. The heat off it warps the air a stride away.*
- **Prompt:** hulking siege-furnace golem, chest an open kiln mouth glowing deep, chimney stacks crowning the shoulders, massive arms, slow heavy presence
- **Ramps:** scrap-iron + char + rust · **emissive:** the kiln mouth (the frame's one hot core)
- **Silhouette:** massive rectangle, chimney crown breaking the top edge
- **Wrong detail:** it leans — the mass settled wrong and it never corrected
- **Don't:** lava monster, dripping magma, shine

### 4. Staticur — Gale/Striker · `creature-Staticur` · starter (the Remnant castoff)
- **Blurb:** *A dire wolf grafted with dead tech that never stopped transmitting. It twitches on a signal only it hears.*
- **Prompt:** lean quadruped dire wolf, cracked dark visor grafted over its eyes leaking a thin pale light, exposed sparking wire in the hackles, patchy storm-gray fur over scarred hide, head low
- **Ramps:** storm-gray hide (Gale-family) + char + wire-iron · **emissive:** the visor slit, static-pale
- **Silhouette:** low predator quadruped, hackle-spikes of wire, straight dropped tail
- **Wrong detail:** one ear torn; the visor sits crooked — the graft was never fitted
- **Don't:** sleek cyber-wolf, blue lightning, glowing circuit lines, heroic stance

### 5. Voltwraith — Gale/Striker · `creature-Voltwraith` · finisher (ledger #7: PUPPETED UPRIGHT)
- **Blurb:** *It walks upright because the graft prefers it. The wolf inside has stopped arguing.*
- **Prompt:** dire wolf held upright on two legs like a marionette, hung from its own spinal graft, wolf skull-face tilted down, forelimbs slack with wire tendons, wide cracked visor band glowing faint, dread not grin
- **Ramps:** storm-gray + char + wire-iron · **emissive:** the visor band (wider, brighter-cracked than Staticur's)
- **Silhouette:** upright but WRONG — strung, not standing; slack arms, down-tilted skull
- **Wrong detail:** the puppet read — weight hangs from the graft, feet barely planted
- **Don't:** werewolf power stance, muscles, grin, hero pose

### 6. Marrowling — Cinder/Bruiser · `creature-Marrowling` · starter (Bone) & wild
- **Blurb:** *A small clatter of bone, patiently reassembling itself into something worse.*
- **Prompt:** small creature assembled from mismatched dry bones around one jagged shard, loosely articulated, gaps between parts, patient hunched posture
- **Ramps:** bone + char shadow-gaps · **emissive:** none (ember-eye pinpricks optional, tiny)
- **Silhouette:** knee-high bone clutter with one blade-like shard raised
- **Wrong detail:** the bones don't match — different creatures' parts
- **Don't:** cute skeleton pet, white bones, skull grin

### 7. Ossclad — Cinder/Bruiser · `creature-Ossclad`
- **Blurb:** *The clatter found its shape: bone lapped over bone like armor grown, not worn.*
- **Prompt:** bone-knight of overlapping plates of lapped bone, armor grown not forged, fused bone weapon in one limb, compact and grim
- **Ramps:** bone + grave-soil char · **emissive:** ember-eye pinpricks
- **Silhouette:** compact armored biped, lapped-plate texture reads at 48px
- **Wrong detail:** the plates lap unevenly, thicker on one side
- **Don't:** paladin armor, white polish, sword-and-shield heroics

### 8. Bonemarch — Cinder/Bruiser · `creature-Bonemarch` · finisher
- **Blurb:** *It does not walk so much as process, tolling. Old graves fall in step behind it.*
- **Prompt:** towering bone-titan mid-procession, accreted armor of old bone, dragging a fused greatweapon too big to lift, funeral stillness
- **Ramps:** bone + grave-soil + char · **emissive:** ember-eye pinpricks only
- **Silhouette:** tall processional figure + the dragged greatweapon breaking the baseline
- **Wrong detail:** the weapon drags — it has stopped pretending to carry it
- **Don't:** lich-king crown drama, green necro-glow, gore

## The wilds — Ashen Wastes

### 9. Ashwhelp — Ember/Striker · `creature-Ashwhelp` · common
- **Blurb:** *A whelp-shaped knot of char and wire that trails anything warm. Nobody's sure it was ever born — the wastes may have just kindled it.*
- **Prompt:** small whelp-shaped creature knotted together from char lumps and scorched wire, ember pinpricks banked inside the knot, eager lean toward the right
- **Ramps:** char + rust wire · **emissive:** interior ember pinpricks
- **Silhouette:** small rounded knot, wire ends sticking out like fur licks
- **Wrong detail:** no face — just the warm points where a face should be
- **Don't:** puppy features, flames, cuteness

### 10. Sporemote — Bloom/Battle Mage · `creature-Sporemote` · common
- **Blurb:** *Not one creature. A drift of spores that votes.*
- **Prompt:** loose hovering drift of gray-green spore motes barely agreeing on a body shape, denser core, edges dissolving, faint pale motes around it
- **Ramps:** fungal flesh + Bloom accent `#6f7d45` · **emissive:** none (pale motes stay dull)
- **Silhouette:** a blob refusing to be a blob — ragged, porous edge
- **Wrong detail:** part of the drift lags behind the rest, still voting
- **Don't:** slime blob with a face, sparkle particles, green goo

### 11. Mycelegion — Bloom/Battle Mage · `creature-Mycelegion` · gated finisher
- **Blurb:** *Enough of them, for long enough, and the drift agrees on a shape. It is very large, and it is still deciding.*
- **Prompt:** huge looming mass of spore-drift compacted into an almost-body, suggestion of limbs and a head that don't fully commit, dense fungal texture, edges still crawling
- **Ramps:** fungal flesh + Bloom · **emissive:** none
- **Silhouette:** big almost-humanoid mass, one "limb" mid-formation
- **Wrong detail:** the head is in the wrong place, slightly
- **Don't:** mushroom-man mascot, eyes, mouth

### 12. Ashcap — Bloom/Warden · `creature-Ashcap` · uncommon
- **Blurb:** *A squat cap of gray flesh that grew where the burning stopped. It does not move out of the way, because nothing has ever made it.*
- **Prompt:** squat immovable fungus cap of thick gray flesh grown low over a root-clump body, ash dusting the cap, planted stance
- **Ramps:** fungal flesh + ash `#6e6a60` dusting · **emissive:** none
- **Silhouette:** low wide dome — a boulder that's alive
- **Wrong detail:** the cap grew lopsided around something buried
- **Don't:** toadstool red, cartoon mushroom, face

### 13. Mycolith — Bloom/Warden · `creature-Mycolith` · post-boss branch
- **Blurb:** *A standing stone that breathes. Travelers stack offerings at its base without knowing why.*
- **Prompt:** tall menhir-shaped fungus, stone-textured gray flesh standing upright, faint gill lines like carved grooves, monument stillness — menhir first, creature second
- **Ramps:** fungal flesh + rock `#6a6e73` · **emissive:** none
- **Silhouette:** a standing stone, very slightly leaning
- **Wrong detail:** it is mid-breath — one flank subtly swollen
- **Don't:** golem with arms, face, moss-cute

## The wilds — Fell-Grass Route

### 14. Mireling — Bloom/Bruiser · `creature-Mireling` · common (Barrow-King counter)
- **Blurb:** *Fungal muscle knotted around old bog-iron. It breathes wet.*
- **Prompt:** compact bruiser of knotted fungal muscle grown around a core of rusted bog-iron scrap, wet sheen kept dull, low wide stance
- **Ramps:** fungal flesh + rust iron · **emissive:** none
- **Silhouette:** fireplug — short, wide, planted
- **Wrong detail:** a bolt-end or iron edge protrudes where no design intended
- **Don't:** swamp slime, drips, gloss

### 15. Fenmoth — Gale/Striker · `creature-Fenmoth` · common (Barrow-King counter)
- **Blurb:** *Ash-winged and jittery, gone before the eye can settle on it.*
- **Prompt:** moth with ragged ash-gray wings mid-hover, dusty wing texture like burnt paper, thin body, antennae bent, caught between wingbeats
- **Ramps:** ash + Gale accent `#8f8aa6` · **emissive:** none
- **Silhouette:** ragged wing pair, hover above baseline, small faint shadow
- **Wrong detail:** wings don't match — one more burnt than the other
- **Don't:** butterfly color, symmetry, sparkle dust

### 16. Snarebriar — Bloom/Trickster · `creature-Snarebriar` · uncommon
- **Blurb:** *A briar-tangle that learned a hare's shape and kept none of its innocence.*
- **Prompt:** hare-shaped tangle of dry briar and thorn vine, hollow where flesh should be, long ear-stalks of bramble, poised to be elsewhere
- **Ramps:** deadtree browns `#453e33` + Bloom green threading · **emissive:** none
- **Silhouette:** unmistakable hare outline, wrong up close
- **Wrong detail:** you can see through parts of it
- **Don't:** rabbit face, eyes, fur, cute

### 17. Fenlight — Tide/Sorcerer · `creature-Fenlight` · rare (the first Sorcerer)
- **Blurb:** *A small cold lantern-glow that walks the ditch-water at dusk. Follow it and the water gets deeper. It knows.*
- **Prompt:** small wisp of cold pale light held in a scrap of drowned lantern-frame, thin dark trailing limbs of silt-water beneath, hovering low
- **Ramps:** murk + drowned bronze frame · **emissive:** the coldlight `#9fb6c4` — the sprite's single bright note
- **Silhouette:** a light with a hanging root system
- **Wrong detail:** the glow is steady — it does not flicker, and that's worse
- **Don't:** cheerful will-o-wisp face, warm yellow light, sparkles

## The Hollow / Deep Hollow

### 18. Sistern — Tide/Warden · `creature-Sistern` · uncommon
- **Blurb:** *A drowned bell-shape that tolls, slow, under still black water.*
- **Prompt:** ancient drowned bell as a body, verdigris bronze, silt-stained, hung from a warped yoke of blackened wood, stillness that implies a slow toll
- **Ramps:** drowned bronze + murk water base · **emissive:** faint coldlight at the bell mouth (optional, dim)
- **Silhouette:** bell profile + crooked yoke above
- **Wrong detail:** the clapper hangs outside the bell
- **Don't:** cracked liberty-bell cliché, water splashes, face

### 19. Borck — Cinder/Warden · `creature-Borck` · uncommon (the Cairn Path waits)
- **Blurb:** *A skeleton that stopped being only bone. Stone grew into the gaps, and now it stands where it's told like something quarried, not born.*
- **Prompt:** stocky skeleton figure with gray stone grown into the gaps between bones, half-quarried look, standing exactly where it was left, arms heavy
- **Ramps:** bone + rock `#6a6e73` · **emissive:** none
- **Silhouette:** squared-off, load-bearing — furniture that stands up
- **Wrong detail:** one limb is more stone than bone
- **Don't:** rock-monster boulders-for-fists, crystals, grin

### 20. Murkmaw — Umbra/Trickster · `creature-Murkmaw` · epic (the hidden chase)
- **Blurb:** *A patch of dark down where no lantern reaches, cast by nothing. It feeds from beneath — even the barrow's dead give it room.*
- **Prompt:** a patch of darkness with a suggestion of a wide mouth beneath, shadow cast by nothing, low to the ground, edges soft into transparency, one pale hint of teeth or bone-glint
- **Ramps:** murk (true black allowed) + Umbra `#5c4f6e` edge · **emissive:** NONE — it absorbs; the bone-glint is dull, not lit
- **Silhouette:** a low stain with a mouth-line — the hardest sprite in the set; if the pipeline can do this, it can do anything
- **Wrong detail:** its edge bends the wrong way from the light
- **Don't:** purple magic wisps, glowing eyes, particle effects, tentacles

## The boss

### 21. The Barrow-King — Cinder boss · `creature-BarrowKing` · defeat-only
- **Brief (bible §9 + live sprite):** towering reassembled bone-titan, wild apex of the same dead Marrowling crawls from. Cloaked hulk filling the frame, ribcage over a dark mass, skull head with a jagged crown of horns, hollow eyes lit with banked ember pinpricks, fused greatweapon over the shoulder. Ancient folklore dread.
- **Prompt:** towering bone-titan boss filling the frame, dark burial-cloak mass, exposed ribcage, horned skull crown, twin ember pinprick eyes in hollow sockets, fused bone greatweapon over one shoulder, ancient buried dread
- **Ramps:** bone + murk cloak + char · **emissive:** the ember eye-pits ONLY
- **Silhouette:** fills 48×48 to 2px margins (3.6× scale does the size); horn crown + weapon-line must read
- **Wrong detail:** the crown horns are broken to different lengths
- **Don't:** lich green, glowing runes, gore, grin — *dread is still*
- **LOCKED:** his numbers never move for art; this is a texture swap only.

---

*Sheet order = a sensible batching order. The spike proves 1, 4, 20 (Slagling, Staticur,
Murkmaw — construct / beast-graft / abstract; if all three pass, the roster is safe).
Names are LOCKED per NAMES.md C-pass — prompts never invent lore.*
