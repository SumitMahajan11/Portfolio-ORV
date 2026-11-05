import { WALL_PLACEHOLDERS, type WallId } from './wall-placeholders';

export interface WallDefinition {
  id: WallId;
  label: string;
  role: 'story' | 'worlds' | 'finale';
  sectionIds: string[];
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
  'wall-01': {
    id: 'wall-01',
    label: 'Story Wall (Hero to Scenario Select)',
    role: 'story',
    sectionIds: ['hero-scene-container', 'scenario-select'],
    desktop: {
      avif: '/art/wall/wall-01-desktop.avif',
      webp: '/art/wall/wall-01-desktop.webp',
    },
    portrait: {
      avif: '/art/wall/wall-01-portrait.avif',
      webp: '/art/wall/wall-01-portrait.webp',
    },
    placeholder: WALL_PLACEHOLDERS['wall-01'],
  },
  'wall-02': {
    id: 'wall-02',
    label: 'Worlds Wall (Worlds, Side Quests, Skills)',
    role: 'worlds',
    sectionIds: ['edge-cloud', 'ratify', 'iac-verifier', 'side-quests', 'readers-record'],
    desktop: {
      avif: '/art/wall/wall-02-desktop.avif',
      webp: '/art/wall/wall-02-desktop.webp',
    },
    portrait: {
      avif: '/art/wall/wall-02-portrait.avif',
      webp: '/art/wall/wall-02-portrait.webp',
    },
    placeholder: WALL_PLACEHOLDERS['wall-02'],
  },
  'wall-03': {
    id: 'wall-03',
    label: 'Finale Wall (Finale & Contact)',
    role: 'finale',
    sectionIds: ['contact'],
    desktop: {
      avif: '/art/wall/wall-03-desktop.avif',
      webp: '/art/wall/wall-03-desktop.webp',
    },
    portrait: {
      avif: '/art/wall/wall-03-portrait.avif',
      webp: '/art/wall/wall-03-portrait.webp',
    },
    placeholder: WALL_PLACEHOLDERS['wall-03'],
  },
};

export const DEFAULT_WALL_ID: WallId = 'wall-01';

/**
 * Returns which wall ID maps to a given section id.
 */
export function getWallIdForSection(sectionId: string): WallId {
  for (const def of Object.values(WALL_DEFINITIONS)) {
    if (def.sectionIds.includes(sectionId)) {
      return def.id;
    }
  }
  return DEFAULT_WALL_ID;
}
