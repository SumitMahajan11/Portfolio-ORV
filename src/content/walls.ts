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
  'wall-01': {
    id: 'wall-01',
    label: 'Living Wall',
    role: 'living',
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
};

export const DEFAULT_WALL_ID: WallId = 'wall-01';

/**
 * Returns which wall ID maps to a given section id.
 * With the single living wall architecture, wall-01 serves the entire site.
 */
export function getWallIdForSection(sectionId?: string): WallId {
  void sectionId;
  return DEFAULT_WALL_ID;
}
