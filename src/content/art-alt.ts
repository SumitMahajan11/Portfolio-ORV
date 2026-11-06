/**
 * Art Asset Accessibility & Alt Text Registry
 *
 * Rules per Phase 5-1 / docs/08-ART-ASSET-LIST.md:
 * - Meaningful visual elements receive descriptive alt text.
 * - Purely decorative layers (wings, coat, glow, horns, particle sprites, costume props)
 *   receive empty alt strings ("") and aria-hidden: true.
 */

export interface ArtAssetMetadata {
  id: string;
  category: "dokja" | "biyoo" | "wall" | "wanted" | "meta";
  alt: string;
  ariaHidden: boolean;
  decorative: boolean;
  description: string;
}

export const ART_ALT_REGISTRY: Record<string, ArtAssetMetadata> = {
  // =========================================================================
  // DOKJA HERO CHARACTER LAYERS
  // =========================================================================
  "dokja_body_base": {
    id: "dokja_body_base",
    category: "dokja",
    alt: "Dokja standing facing forward in dark undersuit and boots",
    ariaHidden: false,
    decorative: false,
    description: "Neutral standing figure base layer",
  },
  "dokja_body_reading": {
    id: "dokja_body_reading",
    category: "dokja",
    alt: "Dokja standing holding smartphone reading a webnovel",
    ariaHidden: false,
    decorative: false,
    description: "Posture with hands raised holding smartphone",
  },
  "dokja_body_irritated": {
    id: "dokja_body_irritated",
    category: "dokja",
    alt: "Dokja standing with tense posture gripping the phone",
    ariaHidden: false,
    decorative: false,
    description: "Tense stance reflecting disruption from reader scrolling",
  },
  "dokja_head_reading": {
    id: "dokja_head_reading",
    category: "dokja",
    alt: "Dokja looking down at glowing smartphone screen",
    ariaHidden: false,
    decorative: false,
    description: "Downcast gaze absorbed in reading",
  },
  "dokja_head_notice": {
    id: "dokja_head_notice",
    category: "dokja",
    alt: "Dokja looking up directly at the reader with calm observant eyes",
    ariaHidden: false,
    decorative: false,
    description: "Eye contact established with visitor",
  },
  "dokja_head_irritated": {
    id: "dokja_head_irritated",
    category: "dokja",
    alt: "Dokja with furrowed brow and tightened expression",
    ariaHidden: false,
    decorative: false,
    description: "Irritated reaction to continued scrolling input",
  },
  "dokja_head_final": {
    id: "dokja_head_final",
    category: "dokja",
    alt: "Dokja in resolute final form looking forward",
    ariaHidden: false,
    decorative: false,
    description: "Awakened expression in final scenario stage",
  },
  "dokja_coat": {
    id: "dokja_coat",
    category: "dokja",
    alt: "",
    ariaHidden: true,
    decorative: true,
    description: "White trench coat with cold rim lighting",
  },
  "dokja_horns": {
    id: "dokja_horns",
    category: "dokja",
    alt: "",
    ariaHidden: true,
    decorative: true,
    description: "Red-black curved horns with thin red rim light stroke",
  },
  "dokja_wings_back_L": {
    id: "dokja_wings_back_L",
    category: "dokja",
    alt: "",
    ariaHidden: true,
    decorative: true,
    description: "Left rear white feathered wing unfolding from shoulder",
  },
  "dokja_wings_back_R": {
    id: "dokja_wings_back_R",
    category: "dokja",
    alt: "",
    ariaHidden: true,
    decorative: true,
    description: "Right rear white feathered wing unfolding from shoulder",
  },
  "dokja_wings_front_L": {
    id: "dokja_wings_front_L",
    category: "dokja",
    alt: "",
    ariaHidden: true,
    decorative: true,
    description: "Left front primary white feathered wing",
  },
  "dokja_wings_front_R": {
    id: "dokja_wings_front_R",
    category: "dokja",
    alt: "",
    ariaHidden: true,
    decorative: true,
    description: "Right front primary white feathered wing",
  },
  "dokja_phone": {
    id: "dokja_phone",
    category: "dokja",
    alt: "Smartphone displaying illuminated webnovel text",
    ariaHidden: false,
    decorative: false,
    description: "Illuminated device held in Dokja's hands",
  },
  "dokja_phone_glow": {
    id: "dokja_phone_glow",
    category: "dokja",
    alt: "",
    ariaHidden: true,
    decorative: true,
    description: "Cyan ambient light cast from phone screen",
  },
  "dokja_hand_phone_closed": {
    id: "dokja_hand_phone_closed",
    category: "dokja",
    alt: "Dokja's hand holding phone lowered to side",
    ariaHidden: false,
    decorative: false,
    description: "Finale pose with phone closed/lowered",
  },
  "feathers_particles": {
    id: "feathers_particles",
    category: "dokja",
    alt: "",
    ariaHidden: true,
    decorative: true,
    description: "Floating white feather stardust particles",
  },
  "white_squares": {
    id: "white_squares",
    category: "dokja",
    alt: "",
    ariaHidden: true,
    decorative: true,
    description: "Shattered white square grid motes bridging to Scenario Select",
  },

  // =========================================================================
  // BIYOO MASCOT LAYERS & STATES
  // =========================================================================
  "biyoo_body_base": {
    id: "biyoo_body_base",
    category: "biyoo",
    alt: "Biyoo, a fluffy spherical cotton mascot with two small striped amber horns",
    ariaHidden: false,
    decorative: false,
    description: "Base spherical cotton body",
  },
  "biyoo_happy": {
    id: "biyoo_happy",
    category: "biyoo",
    alt: "Biyoo laughing with joyful upward curved eyes and rosy cheeks",
    ariaHidden: false,
    decorative: false,
    description: "Happy expression responding to reader action",
  },
  "biyoo_joyful": {
    id: "biyoo_joyful",
    category: "biyoo",
    alt: "Biyoo cheering enthusiastically with open mouth",
    ariaHidden: false,
    decorative: false,
    description: "Cheering celebratory mascot pose",
  },
  "biyoo_sleepy": {
    id: "biyoo_sleepy",
    category: "biyoo",
    alt: "Biyoo peacefully sleeping curled like a cotton puff",
    ariaHidden: false,
    decorative: false,
    description: "Sleeping initial state with gentle breathing",
  },
  "biyoo_startled": {
    id: "biyoo_startled",
    category: "biyoo",
    alt: "Biyoo startled jumping with wide alert eyes",
    ariaHidden: false,
    decorative: false,
    description: "Startled reaction to Stage 7 glitch arrival",
  },
  "biyoo_curious": {
    id: "biyoo_curious",
    category: "biyoo",
    alt: "Biyoo tilting head with an inquisitive expression",
    ariaHidden: false,
    decorative: false,
    description: "Curious reaction to card hover or interaction",
  },
  "biyoo_proud": {
    id: "biyoo_proud",
    category: "biyoo",
    alt: "Biyoo puffing chest with proud satisfaction",
    ariaHidden: false,
    decorative: false,
    description: "Proud reaction upon discovering test proof or evidence",
  },
  "biyoo_waving": {
    id: "biyoo_waving",
    category: "biyoo",
    alt: "Biyoo waving a tiny arm nub in friendly greeting",
    ariaHidden: false,
    decorative: false,
    description: "Friendly greeting gesture",
  },
  "biyoo_poked": {
    id: "biyoo_poked",
    category: "biyoo",
    alt: "Biyoo gently squishing in response to user poke",
    ariaHidden: false,
    decorative: false,
    description: "Squash-and-stretch interaction state",
  },
  "biyoo_thinking": {
    id: "biyoo_thinking",
    category: "biyoo",
    alt: "Biyoo looking upward thoughtfully",
    ariaHidden: false,
    decorative: false,
    description: "Contemplative thinking state",
  },
  "biyoo_costume_goggles": {
    id: "biyoo_costume_goggles",
    category: "biyoo",
    alt: "",
    ariaHidden: true,
    decorative: true,
    description: "Teal star-shaped wireframe goggles accessory",
  },
  "biyoo_costume_headband": {
    id: "biyoo_costume_headband",
    category: "biyoo",
    alt: "",
    ariaHidden: true,
    decorative: true,
    description: "Green leaf-village style headband accessory",
  },
  "biyoo_costume_chain": {
    id: "biyoo_costume_chain",
    category: "biyoo",
    alt: "",
    ariaHidden: true,
    decorative: true,
    description: "Dark Nen chain bracelet accessory",
  },
  "biyoo_costume_magnifier": {
    id: "biyoo_costume_magnifier",
    category: "biyoo",
    alt: "",
    ariaHidden: true,
    decorative: true,
    description: "Brass detective magnifying glass accessory",
  },

  // =========================================================================
  // WALL BACKGROUNDS
  // =========================================================================
  "wall-01": {
    id: "wall-01",
    category: "wall",
    alt: "Dark starlit cosmic void with ethereal blue nebula and floating pages",
    ariaHidden: false,
    decorative: false,
    description: "Story Wall background for Hero through Scenario Select",
  },
  "wall-02": {
    id: "wall-02",
    category: "wall",
    alt: "Digital neon archive with illuminated terminal screens and grid corridors",
    ariaHidden: false,
    decorative: false,
    description: "Worlds Wall background for Worlds, Side Quests, and Skills",
  },
  "wall-03": {
    id: "wall-03",
    category: "wall",
    alt: "Cyan-lit paper wall with cascading manuscript sheets and constellation lines",
    ariaHidden: false,
    decorative: false,
    description: "Finale Wall background for Finale and Contact Form",
  },
  "wall-04": {
    id: "wall-04",
    category: "wall",
    alt: "Alternative starlit paper archive background",
    ariaHidden: false,
    decorative: false,
    description: "Alternative wall intake asset",
  },

  // =========================================================================
  // WANTED POSTER & META ASSETS
  // =========================================================================
  "wanted_poster_frame": {
    id: "wanted_poster_frame",
    category: "wanted",
    alt: "Parchment bounty poster frame with bold WANTED headline",
    ariaHidden: false,
    decorative: false,
    description: "One Piece-inspired parchment frame for /wanted",
  },
  "og_image": {
    id: "og_image",
    category: "meta",
    alt: "Sumit Mahajan distributed systems and correctness portfolio preview card",
    ariaHidden: false,
    decorative: false,
    description: "Open Graph preview banner",
  },
  "favicon": {
    id: "favicon",
    category: "meta",
    alt: "Icon of Biyoo's spiraled amber horn",
    ariaHidden: false,
    decorative: false,
    description: "Site favicon and browser tab icon",
  },
};

/**
 * Helper to retrieve accessible alt and aria attributes for any asset ID.
 */
export function getArtAlt(id: string): { alt: string; "aria-hidden"?: boolean } {
  const asset = ART_ALT_REGISTRY[id];
  if (!asset) {
    return { alt: "", "aria-hidden": true };
  }
  if (asset.decorative || asset.ariaHidden) {
    return { alt: "", "aria-hidden": true };
  }
  return { alt: asset.alt };
}
