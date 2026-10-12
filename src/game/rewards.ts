import { ALL_UNLOCKABLE_IDS } from './catalog';
import { createRng } from './rng';

export type RunSummary = {
  mode: 'daily' | 'practice';
  dayKey: string;
  levelTitle: string;
  score: number;
  cleared: boolean;
  yardsCleared: number;
  planesUsed: number;
  planesTotal: number;
  hoopPasses: number;
  bestThrowHoops: number;
  powerDives: number;
  bestCombo: number;
  itemsSmashed: number;
  balloonsPopped: number;
  balloonsTotal: number;
  /** Fewest planes any single cleared yard took this sitting, or null if none was cleared. */
  fewestPlanesForClear: number | null;
  /** Most planes left unthrown when a yard was cleared. */
  mostSparePlanes: number;
  /** Most things smashed in any one yard. */
  bestYardSmashed: number;
  /** Most power dives in any one yard. */
  bestYardPowerDives: number;
};

export type StickerContext = {
  streak: number;
  level: number;
  coins: number;
  totalClears: number;
};

export type Sticker = {
  id: string;
  name: string;
  requirement: string;
  coins: number;
  test: (summary: RunSummary, context: StickerContext) => boolean;
};

export const STICKERS: Sticker[] = [
  {
    id: 'sticker-first-throw',
    name: 'First Throw',
    requirement: 'Throw your first plane.',
    coins: 120,
    test: () => true,
  },
  {
    id: 'sticker-clean-yard',
    name: 'Clean Yard',
    requirement: 'Pop every balloon in a yard.',
    coins: 240,
    test: (summary) => summary.cleared,
  },
  {
    id: 'sticker-one-plane',
    name: 'One Plane',
    requirement: 'Clear a yard with a single plane.',
    coins: 700,
    test: (summary) => summary.fewestPlanesForClear !== null && summary.fewestPlanesForClear <= 1,
  },
  {
    id: 'sticker-three-hoops',
    name: 'Three Hoops',
    requirement: 'Fly through three hoops in one throw.',
    coins: 450,
    test: (summary) => summary.bestThrowHoops >= 3,
  },
  {
    id: 'sticker-pocket-spare',
    name: 'Two In Pocket',
    requirement: 'Clear a yard with two planes unthrown.',
    coins: 500,
    test: (summary) => summary.mostSparePlanes >= 2,
  },
  {
    id: 'sticker-wrecking',
    name: 'Wrecking Ball',
    requirement: 'Smash 30 things in one yard.',
    coins: 380,
    test: (summary) => summary.bestYardSmashed >= 30,
  },
  {
    id: 'sticker-nosedive',
    name: 'Nosedive',
    requirement: 'Use three power dives in one yard.',
    coins: 420,
    test: (summary) => summary.bestYardPowerDives >= 3,
  },
  {
    id: 'sticker-chain',
    name: 'Chain of Six',
    requirement: 'Reach a 6x chain.',
    coins: 520,
    test: (summary) => summary.bestCombo >= 6,
  },
  {
    id: 'sticker-week',
    name: 'One Week',
    requirement: 'Play seven days running.',
    coins: 900,
    test: (_summary, context) => context.streak >= 7,
  },
  {
    id: 'sticker-month',
    name: 'One Month',
    requirement: 'Play thirty days running.',
    coins: 3000,
    test: (_summary, context) => context.streak >= 30,
  },
  {
    id: 'sticker-level-ten',
    name: 'Level Ten',
    requirement: 'Reach level 10.',
    coins: 1200,
    test: (_summary, context) => context.level >= 10,
  },
  {
    id: 'sticker-piggy-bank',
    name: 'Piggy Bank',
    requirement: 'Hold 5,000 coins at once.',
    coins: 600,
    test: (_summary, context) => context.coins >= 5000,
  },
];

export function xpForLevel(level: number): number {
  return 220 + Math.max(0, level - 1) * 160;
}

export type LevelInfo = {
  level: number;
  intoLevel: number;
  needed: number;
  progress: number;
};

export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, xp);
  let needed = xpForLevel(level);

  while (remaining >= needed && level < 999) {
    remaining -= needed;
    level += 1;
    needed = xpForLevel(level);
  }

  return {
    level,
    intoLevel: remaining,
    needed,
    progress: needed > 0 ? remaining / needed : 0,
  };
}

export function xpForRun(summary: RunSummary): number {
  return Math.round(summary.score / 24) + (summary.cleared ? 90 : 0) + summary.hoopPasses * 8;
}

export type CoinBreakdown = {
  base: number;
  hoops: number;
  clear: number;
  total: number;
};

export function coinsForRun(summary: RunSummary): CoinBreakdown {
  const base = Math.floor(summary.score / 45);
  const hoops = summary.hoopPasses * 12;
  const clear = summary.cleared ? 60 : 0;
  return { base, hoops, clear, total: base + hoops + clear };
}

export type BoxTier = 'bag' | 'box' | 'crate' | 'tin';

export const BOX_TIERS: Record<
  BoxTier,
  { label: string; color: string; edge: string; range: [number, number]; bonusChance: number }
> = {
  bag: {
    label: 'Paper Bag',
    color: '#C98A5A',
    edge: '#F0BE8E',
    range: [130, 230],
    bonusChance: 0.06,
  },
  box: {
    label: 'Cardboard Box',
    color: '#B4794A',
    edge: '#D9A472',
    range: [250, 410],
    bonusChance: 0.14,
  },
  crate: {
    label: 'Wooden Crate',
    color: '#8A5C31',
    edge: '#C08A50',
    range: [430, 720],
    bonusChance: 0.24,
  },
  tin: {
    label: 'Biscuit Tin',
    color: '#7A8798',
    edge: '#DCE4EC',
    range: [760, 1240],
    bonusChance: 0.42,
  },
};

export function boxTierForStreak(streak: number): BoxTier {
  if (streak >= 14) return 'tin';
  if (streak >= 7) return 'crate';
  if (streak >= 3) return 'box';
  return 'bag';
}

export type BoxReward = {
  tier: BoxTier;
  coins: number;
  bonusItemId: string | null;
};

export function rollBox(dayKey: string, streak: number, ownedIds: string[]): BoxReward {
  const tier = boxTierForStreak(streak);
  const config = BOX_TIERS[tier];
  const rng = createRng(`box::${dayKey}::${streak}`);
  const coins = Math.round(rng.range(config.range[0], config.range[1]) / 10) * 10;

  let bonusItemId: string | null = null;
  const locked = ALL_UNLOCKABLE_IDS.filter((id) => !ownedIds.includes(id));
  if (locked.length > 0 && rng.chance(config.bonusChance)) {
    bonusItemId = rng.pick(locked);
  }

  return { tier, coins, bonusItemId };
}
