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

export const YARD_THEMES: YardTheme[] = [
  {
    id: 'sunset',
    sky: ['#1B2645', '#3A4574', '#7C5A82', '#D97E58', '#F2B472'],
    sun: '#FFD79A',
    sunOpacity: 0.45,
    moon: false,
    stars: false,
    cloud: '#FFF3E0',
    cloudMin: 0.12,
    cloudMax: 0.34,
    cloudCount: 7,
    treeFar: TREES.far,
    treeNear: TREES.near,
    fence: '#7A5A3A',
    fenceDark: '#4E3A24',
    grass: '#355A32',
    grassEdge: '#6A8F4A',
  },
  {
    id: 'golden',
    sky: ['#243050', '#4A4A78', '#A06070', '#E88858', '#F8C888'],
    sun: '#FFE0A8',
    sunOpacity: 0.52,
    moon: false,
    stars: false,
    cloud: '#FFE8D0',
    cloudMin: 0.14,
    cloudMax: 0.36,
    cloudCount: 6,
    treeFar: TREES.far,
    treeNear: TREES.near,
    fence: '#7A5A3A',
    fenceDark: '#4E3A24',
    grass: '#355A32',
    grassEdge: '#6A8F4A',
  },
  {
    id: 'dusk',
    sky: ['#1A2044', '#3A3868', '#6A4A78', '#C07068', '#E8A878'],
    sun: '#F4C890',
    sunOpacity: 0.32,
    moon: false,
    stars: true,
    cloud: '#F0D8C8',
    cloudMin: 0.1,
    cloudMax: 0.28,
    cloudCount: 5,
    treeFar: 'rgba(32, 48, 40, 0.78)',
    treeNear: 'rgba(22, 36, 28, 0.94)',
    fence: '#6A4E32',
    fenceDark: '#3E2E1C',
    grass: '#2E4E2C',
    grassEdge: '#5A7A42',
  },
  {
    id: 'evening',
    sky: ['#141A38', '#2A3060', '#4A3A70', '#8A5878', '#C88870'],
    sun: '#F4EFE4',
    sunOpacity: 0.55,
    moon: true,
    stars: true,
    cloud: '#D8D0C8',
    cloudMin: 0.1,
    cloudMax: 0.24,
    cloudCount: 4,
    treeFar: 'rgba(24, 40, 32, 0.82)',
    treeNear: 'rgba(16, 28, 22, 0.95)',
    fence: '#5A422C',
    fenceDark: '#322414',
    grass: '#243C28',
    grassEdge: '#4A6840',
  },
];

/** Yard 1 is always the original sunset. Later yards in the sitting go later. */
export function pickYardTheme(stage: number): YardTheme {
  const index = Math.max(0, stage - 1) % YARD_THEMES.length;
  return YARD_THEMES[index];
}

const GREEN_LAWNS: YardTheme[] = [
  {
    id: 'sunset',
    sky: ['#145C32', '#2E8A42', '#6BB85A', '#B6DE86', '#E5F3C4'],
    sun: '#F6F3C4',
    sunOpacity: 0.7,
    moon: false,
    stars: false,
    cloud: '#F4FBEA',
    cloudMin: 0.28,
    cloudMax: 0.5,
    cloudCount: 7,
    treeFar: 'rgba(46, 110, 58, 0.78)',
    treeNear: 'rgba(28, 82, 40, 0.92)',
    fence: '#6E8F48',
    fenceDark: '#3E6A32',
    grass: '#2F8A3A',
    grassEdge: '#8ED45A',
  },
  {
    id: 'golden',
    sky: ['#124E2C', '#287A3C', '#5AAA50', '#A6D47A', '#D8EEC0'],
    sun: '#F4F0B8',
    sunOpacity: 0.62,
    moon: false,
    stars: false,
    cloud: '#F2F8E6',
    cloudMin: 0.24,
    cloudMax: 0.46,
    cloudCount: 6,
    treeFar: 'rgba(46, 110, 58, 0.78)',
    treeNear: 'rgba(28, 82, 40, 0.92)',
    fence: '#648848',
    fenceDark: '#3A6230',
    grass: '#2A7A34',
    grassEdge: '#7EC850',
  },
  {
    id: 'dusk',
    sky: ['#0E4226', '#1F6434', '#3E8A44', '#7AAA60', '#C4E0A0'],
    sun: '#E6F0C0',
    sunOpacity: 0.4,
    moon: false,
    stars: false,
    cloud: '#E4F0D4',
    cloudMin: 0.18,
    cloudMax: 0.36,
    cloudCount: 5,
    treeFar: 'rgba(32, 88, 44, 0.84)',
    treeNear: 'rgba(20, 64, 30, 0.94)',
    fence: '#567A40',
    fenceDark: '#2E5230',
    grass: '#246C30',
    grassEdge: '#6EB248',
  },
  {
    id: 'evening',
    sky: ['#0C3420', '#184828', '#2E6A38', '#5A8A48', '#98C070'],
    sun: '#E4F0C8',
    sunOpacity: 0.35,
    moon: false,
    stars: false,
    cloud: '#D8E8C8',
    cloudMin: 0.14,
    cloudMax: 0.3,
    cloudCount: 4,
    treeFar: 'rgba(20, 64, 34, 0.88)',
    treeNear: 'rgba(12, 44, 24, 0.96)',
    fence: '#4A6A38',
    fenceDark: '#243C22',
    grass: '#1C5C28',
    grassEdge: '#5A9A40',
  },
];

GREEN_LAWNS.forEach((lawn, index) => {
  const theme = YARD_THEMES[index];
  if (!theme) return;
  theme.id = lawn.id;
  theme.sky = lawn.sky;
  theme.sun = lawn.sun;
  theme.sunOpacity = lawn.sunOpacity;
  theme.moon = lawn.moon;
  theme.stars = lawn.stars;
  theme.cloud = lawn.cloud;
  theme.cloudMin = lawn.cloudMin;
  theme.cloudMax = lawn.cloudMax;
  theme.cloudCount = lawn.cloudCount;
  theme.treeFar = lawn.treeFar;
  theme.treeNear = lawn.treeNear;
  theme.fence = lawn.fence;
  theme.fenceDark = lawn.fenceDark;
  theme.grass = lawn.grass;
  theme.grassEdge = lawn.grassEdge;
});
