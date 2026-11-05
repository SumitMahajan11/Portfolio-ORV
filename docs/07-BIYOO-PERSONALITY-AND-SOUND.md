# 07 Biyoo: Personality and Sound Sheet

## Look (SOURCE: docs/reference/biyoo/biyoo-01.png)
- **Body shape**: Spherical, fluffy cotton-textured ball-shaped creature with soft tufted edges, tiny rounded nubs for arms, and two small stubby feet.
- **Colors**: Creamy soft-white fur with gentle warm rim lighting along the contours, soft pink cheek blush marks, and amber-gold horns with darker spiraling horizontal stripes.
- **Horns**: Two small curved cone horns protruding from the top of the head with distinct spiral/striped ridges.
- **Face**: Stylized joyful anime expression—happy upward-curved closed eyes (`^^` arcs), an open laughing mouth showing pink inner tongue, and rosy blush lines beneath the eyes.
- **Size relation to the page**: Compact global floating companion scaled dynamically via `clamp(72px, 10vw, 120px)`. Positioned fixed in the bottom-left viewport with safe-area insets.

## Personality
Sleepy, curious, easily startled, loyal, a little dramatic. Never mean. Speaks in short lines, sometimes only sounds. Reacts to the reader, never nags more than once per minute.

## States and lines
| State | Trigger | Animation | Line |
|---|---|---|---|
| sleeping | arrival | slow breathing bob near cursor | (none) |
| yawn-wake | 8s idle | stretch, yawn, nudge screen | "Scroll, reader." |
| startled | stage 7 glitch | jump, squeak | "!!" |
| curious | hover on card | head tilt, lean | "Ooh?" |
| happy | choose a Scenario | bounce | "Good choice." |
| proud | open a proof/test result | chest puff | "Evidence found." |
| sleepy-again | 60s inactive | droops | "...zzz" |
| night | visitor clock 00:00-05:00 | rubbing eyes | "Why are you awake, reader?" (also hidden fragment #4) |
| costume | per world | swap prop | Edge-Cloud: star goggles. Raft: headband. Z3: chain bracelet. Backtrace: magnifier |

## Sound set (short, soft, never loud; each under 1s except breath)
pat/pop (hover/click), squeak (startled), yawn (wake), chirp (choice), boing (bounce), sleepy breath (very quiet loop, only while sleeping).
- Default OFF. One prompt: "Biyoo wants to say hi. Turn sound on?" Remember choice locally.
- Sources: Freesound (CC0 filter), Pixabay, or self-recorded mouth pops. Log license per file in /docs/audio-credits.md.
- Format: mp3 + ogg, normalized, under 30KB each.
- Pause all audio when tab hidden.

## Corner role
Persistent corner Biyoo holds a bounty board sign: "Looking for the bounty board?" -> /wanted.
