/**
 * Backyard skies. Every theme is the same garden at a different hour so the
 * original sunset look stays the backbone, and later yards just go later.
 */
export type YardTheme = {
  id: string;
  sky: [string, string, string, string, string];
  sun: string;
  sunOpacity: number;
  moon: boolean;
  stars: boolean;
  cloud: string;
  cloudMin: number;
  cloudMax: number;
  cloudCount: number;
  treeFar: string;
  treeNear: string;
  fence: string;
  fenceDark: string;
  grass: string;
  grassEdge: string;
};

const TREES = {
  far: 'rgba(38, 58, 46, 0.72)',
  near: 'rgba(28, 45, 33, 0.9)',
};

/**
 * One sky per yard, so every new yard looks like a new place. The lawn stays
 * green in all of them; the sky, light and trees carry the change.
 */
export const YARD_THEMES: YardTheme[] = [
  {
    // Yard 1: the green meadow players already know.
    id: 'meadow',
    sky: ['#145C32', '#2E8A42', '#6BB85A', '#B6DE86', '#E5F3C4'],
    sun: '#F6F3C4',
    sunOpacity: 0.7,
    moon: false,
    stars: false,
    cloud: '#F4FBEA',
    cloudMin: 0.4,
    cloudMax: 0.62,
    cloudCount: 6,
    treeFar: 'rgba(46, 110, 58, 0.78)',
    treeNear: 'rgba(28, 82, 40, 0.92)',
    fence: '#6E8F48',
    fenceDark: '#3E6A32',
    grass: '#2F8A3A',
    grassEdge: '#8ED45A',
  },
  {
    id: 'morning',
    sky: ['#2F6FC0', '#4B8FD8', '#78B2E8', '#AED4F2', '#E2F1FB'],
    sun: '#FFF6D6',
    sunOpacity: 0.85,
    moon: false,
    stars: false,
    cloud: '#FFFFFF',
    cloudMin: 0.75,
    cloudMax: 0.95,
    cloudCount: 6,
    treeFar: 'rgba(56, 120, 78, 0.8)',
    treeNear: 'rgba(34, 92, 52, 0.94)',
    fence: '#B98A5A',
    fenceDark: '#7E5A36',
    grass: '#3A9A44',
    grassEdge: '#9EDC64',
  },
  {
    id: 'golden',
    sky: ['#3E78B8', '#7FA8C8', '#E6C48A', '#F4A65A', '#FBD992'],
    sun: '#FFE7A8',
    sunOpacity: 0.85,
    moon: false,
    stars: false,
    cloud: '#FFF2DC',
    cloudMin: 0.6,
    cloudMax: 0.85,
    cloudCount: 5,
    treeFar: 'rgba(70, 96, 52, 0.82)',
    treeNear: 'rgba(44, 70, 34, 0.94)',
    fence: '#A87444',
    fenceDark: '#6E4626',
    grass: '#3C8A36',
    grassEdge: '#A8D25A',
  },
  {
    id: 'sunset',
    sky: ['#2A2C5E', '#5E4182', '#B65A86', '#F07A62', '#FFC07A'],
    sun: '#FFD79A',
    sunOpacity: 0.8,
    moon: false,
    stars: false,
    cloud: '#FFD2C2',
    cloudMin: 0.45,
    cloudMax: 0.7,
    cloudCount: 5,
    treeFar: 'rgba(48, 44, 60, 0.82)',
    treeNear: 'rgba(30, 36, 34, 0.94)',
    fence: '#7A5A3A',
    fenceDark: '#4E3A24',
    grass: '#2E7434',
    grassEdge: '#7CB84E',
  },
  {
    id: 'twilight',
    sky: ['#121A3E', '#26306A', '#4A3E86', '#8A5A9A', '#D08AA0'],
    sun: '#F4C8D0',
    sunOpacity: 0.35,
    moon: false,
    stars: true,
    cloud: '#C8B8E0',
    cloudMin: 0.25,
    cloudMax: 0.45,
    cloudCount: 4,
    treeFar: 'rgba(30, 32, 58, 0.86)',
    treeNear: 'rgba(18, 24, 34, 0.95)',
    fence: '#5A4630',
    fenceDark: '#32261A',
    grass: '#24603A',
    grassEdge: '#5E9E4E',
  },
  {
    id: 'night',
    sky: ['#060A1E', '#0E1638', '#18245A', '#24346E', '#36507E'],
    sun: '#F4EFE4',
    sunOpacity: 0.9,
    moon: true,
    stars: true,
    cloud: '#8A96B8',
    cloudMin: 0.18,
    cloudMax: 0.32,
    cloudCount: 4,
    treeFar: 'rgba(14, 22, 40, 0.88)',
    treeNear: 'rgba(8, 14, 24, 0.96)',
    fence: '#40382E',
    fenceDark: '#241E18',
    grass: '#1E5432',
    grassEdge: '#4E8E50',
  },
];

/** A different sky for each yard in the sitting, cycling after the last. */
export function pickYardTheme(stage: number): YardTheme {
  const index = Math.max(0, stage - 1) % YARD_THEMES.length;
  return YARD_THEMES[index];
}
