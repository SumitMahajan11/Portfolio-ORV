import { WALL_PLACEHOLDERS, type WallId } from './wall-placeholders';

export interface WallDefinition {
  id: WallId;
  label: string;
  role: 'living';
  desktop: {
    avif: string;
    webp: string;
  };
  portrait: {
    avif: string;
    webp: string;
  };
  placeholder: string;
}

export const WALL_DEFINITIONS: Record<WallId, WallDefinition> = {
  archive: {
    id: 'archive',
    label: 'Living Wall',
    role: 'living',
    desktop: {
      avif: '/art/wall/archive-desktop.avif',
      webp: '/art/wall/archive-desktop.webp',
    },
    portrait: {
      avif: '/art/wall/archive-portrait.avif',
      webp: '/art/wall/archive-portrait.webp',
    },
    placeholder: WALL_PLACEHOLDERS['archive'],
  },
};

export const DEFAULT_WALL_ID: WallId = 'archive';

/**
 * Returns which wall ID maps to a given section id.
 * With the single living wall architecture, archive serves the entire site.
 */
export function getWallIdForSection(sectionId?: string): WallId {
  void sectionId;
  return DEFAULT_WALL_ID;
}

// ============================================================================
// Per-Section Tint Layer Definitions (Task wall-W2)
// ============================================================================

export type TintId = 'hub' | 'edge-cloud' | 'raft' | 'z3' | 'backtrace';

export interface WallTintDefinition {
  id: TintId;
  label: string;
  colors: {
    primary: string | null;
    secondary: string | null;
  };
  /** Soft gradient anchored to the light corner at 75% 20% */
  gradient: string | null;
}

/**
 * Per-section tints:
 * - hub: none (untinted base living wall)
 * - edge-cloud: teal (#5EE1E6) + #6EE7A8
 * - raft: #F28C28 + #F1E4C3
 * - z3: #1FA37A + #6B4EFF
 * - backtrace: #0F1B3D + #D4B15F (defined, unused until section exists)
 * Strict rule: NO red on the wall.
 */
export const WALL_TINTS: Record<TintId, WallTintDefinition> = {
  hub: {
    id: 'hub',
    label: 'Hub (Untinted)',
    colors: { primary: null, secondary: null },
    gradient: null,
  },
  'edge-cloud': {
    id: 'edge-cloud',
    label: 'Edge Cloud',
    colors: { primary: '#5EE1E6', secondary: '#6EE7A8' },
    gradient:
      'radial-gradient(ellipse 95% 85% at 75% 20%, #5EE1E6 0%, #6EE7A8 40%, rgba(110, 231, 168, 0) 80%)',
  },
  raft: {
    id: 'raft',
    label: 'Ratify (Raft)',
    colors: { primary: '#F28C28', secondary: '#F1E4C3' },
    gradient:
      'radial-gradient(ellipse 95% 85% at 75% 20%, #F28C28 0%, #F1E4C3 40%, rgba(241, 228, 195, 0) 80%)',
  },
  z3: {
    id: 'z3',
    label: 'iac-verifier (Z3)',
    colors: { primary: '#1FA37A', secondary: '#6B4EFF' },
    gradient:
      'radial-gradient(ellipse 95% 85% at 75% 20%, #1FA37A 0%, #6B4EFF 40%, rgba(107, 78, 255, 0) 80%)',
  },
  backtrace: {
    id: 'backtrace',
    label: 'Backtrace (Conan)',
    colors: { primary: '#0F1B3D', secondary: '#D4B15F' },
    gradient:
      'radial-gradient(ellipse 95% 85% at 75% 20%, #0F1B3D 0%, #D4B15F 40%, rgba(212, 177, 95, 0) 80%)',
  },
};

export const TINT_DEFINITIONS = WALL_TINTS;

/**
 * Section to tint mapping matching existing section IDs:
 * hero-scene, scenario-select = hub
 * edge-cloud = edge-cloud
 * ratify = raft
 * iac-verifier = z3
 * side-quests, readers-record, contact = hub
 */
export const SECTION_TINT_MAP: Record<string, TintId> = {
  'hero-scene': 'hub',
  'scenario-select': 'hub',
  'edge-cloud': 'edge-cloud',
  'ratify': 'raft',
  'iac-verifier': 'z3',
  'side-quests': 'hub',
  'readers-record': 'hub',
  'contact': 'hub',
};

export const MONITORED_SECTION_IDS: readonly string[] = [
  'hero-scene',
  'scenario-select',
  'edge-cloud',
  'ratify',
  'iac-verifier',
  'side-quests',
  'readers-record',
  'contact',
];

/**
 * All active non-hub tints that are rendered as stacked layers.
 */
export const ACTIVE_WALL_TINTS: TintId[] = ['edge-cloud', 'raft', 'z3', 'backtrace'];
export const VISIBLE_TINT_IDS = ACTIVE_WALL_TINTS;

/**
 * Resolve tint ID for a given section DOM ID. Defaults to 'hub'.
 */
export function getTintForSection(sectionId?: string): TintId {
  if (!sectionId) return 'hub';
  return SECTION_TINT_MAP[sectionId] || 'hub';
}
