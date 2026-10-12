import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_PAPER, DEFAULT_STREAMER } from '../game/catalog';
import { daysBetween } from '../game/rng';
import {
  BoxReward,
  CoinBreakdown,
  LevelInfo,
  RunSummary,
  STICKERS,
  Sticker,
  coinsForRun,
  levelFromXp,
  rollBox,
  xpForRun,
} from '../game/rewards';

const STORAGE_KEY = 'paperplane/profile';
const PROFILE_VERSION = 2;
const MAX_TRACKED_DAYS = 60;

export type EquippedSlots = {
  paper: string;
  streamer: string;
  upgrade: string | null;
};

export type Profile = {
  version: number;
  coins: number;
  xp: number;
  streak: number;
  bestStreak: number;
  lastClearedDay: string | null;
  lastPlayedDay: string | null;
  bestScoreByDay: Record<string, number>;
  stickers: string[];
  unlocked: string[];
  equipped: EquippedSlots;
  totals: {
    runs: number;
    clears: number;
    balloons: number;
    hoops: number;
    powerDives: number;
    items: number;
  };
};

export const DEFAULT_PROFILE: Profile = {
  version: PROFILE_VERSION,
  coins: 0,
  xp: 0,
  streak: 0,
  bestStreak: 0,
  lastClearedDay: null,
  lastPlayedDay: null,
  bestScoreByDay: {},
  stickers: [],
  unlocked: [DEFAULT_PAPER, 'streamer-none', DEFAULT_STREAMER],
  equipped: { paper: DEFAULT_PAPER, streamer: DEFAULT_STREAMER, upgrade: null },
  totals: { runs: 0, clears: 0, balloons: 0, hoops: 0, powerDives: 0, items: 0 },
};

/** Merges a stored record onto the defaults so new fields never wipe a profile. */
function normalize(raw: unknown): Profile {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PROFILE };
  const stored = raw as Partial<Profile>;

  const unlocked = Array.from(
    new Set([...(stored.unlocked ?? []), DEFAULT_PAPER, 'streamer-none', DEFAULT_STREAMER]),
  );

  const equipped = { ...DEFAULT_PROFILE.equipped, ...(stored.equipped ?? {}) };
  const storedVersion = typeof stored.version === 'number' ? stored.version : 1;
  // 1.7 equipped "No Streamer" by default, and the trail was too faint to see.
  if (storedVersion < 2 && (!equipped.streamer || equipped.streamer === 'streamer-none')) {
    equipped.streamer = DEFAULT_STREAMER;
  }

  return {
    ...DEFAULT_PROFILE,
    ...stored,
    version: PROFILE_VERSION,
    unlocked,
    stickers: stored.stickers ?? [],
    bestScoreByDay: stored.bestScoreByDay ?? {},
    equipped,
    totals: { ...DEFAULT_PROFILE.totals, ...(stored.totals ?? {}) },
  };
}

export async function loadProfile(): Promise<Profile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    return normalize(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // A full or unavailable disk shouldn't take the game down mid-session.
  }
}

export async function resetProfile(): Promise<Profile> {
  const fresh = { ...DEFAULT_PROFILE };
  await saveProfile(fresh);
  return fresh;
}

/** A streak only counts while it is still alive: cleared today or yesterday. */
export function effectiveStreak(profile: Profile, today: string): number {
  if (!profile.lastClearedDay) return 0;
  const gap = daysBetween(profile.lastClearedDay, today);
  return gap <= 1 && gap >= 0 ? profile.streak : 0;
}

export function hasClearedToday(profile: Profile, today: string): boolean {
  return profile.lastClearedDay === today;
}

function trimHistory(history: Record<string, number>): Record<string, number> {
  const keys = Object.keys(history).sort();
  if (keys.length <= MAX_TRACKED_DAYS) return history;
  const trimmed: Record<string, number> = {};
  for (const key of keys.slice(keys.length - MAX_TRACKED_DAYS)) {
    trimmed[key] = history[key];
  }
  return trimmed;
}

export type RunApplication = {
  profile: Profile;
  coins: CoinBreakdown;
  stickerCoins: number;
  totalCoins: number;
  xpGained: number;
  levelBefore: LevelInfo;
  levelAfter: LevelInfo;
  leveledUp: boolean;
  newStickers: Sticker[];
  box: BoxReward | null;
  streakBefore: number;
  streakAfter: number;
  bestScore: number;
  isNewBest: boolean;
};

export function applyRun(profile: Profile, summary: RunSummary): RunApplication {
  const next: Profile = {
    ...profile,
    bestScoreByDay: { ...profile.bestScoreByDay },
    stickers: [...profile.stickers],
    unlocked: [...profile.unlocked],
    totals: { ...profile.totals },
  };

  const streakBefore = effectiveStreak(profile, summary.dayKey);
  const coins = coinsForRun(summary);
  const xpGained = xpForRun(summary);
  const levelBefore = levelFromXp(profile.xp);

  next.xp += xpGained;
  next.coins += coins.total;
  next.lastPlayedDay = summary.dayKey;
  next.totals.runs += 1;
  next.totals.hoops += summary.hoopPasses;
  next.totals.powerDives += summary.powerDives;
  next.totals.items += summary.itemsSmashed;
  next.totals.balloons += summary.balloonsPopped;
  if (summary.cleared) next.totals.clears += 1;

  let streakAfter = streakBefore;
  let box: BoxReward | null = null;

  if (summary.mode === 'daily') {
    const previousBest = profile.bestScoreByDay[summary.dayKey] ?? 0;
    if (summary.score > previousBest) {
      next.bestScoreByDay[summary.dayKey] = summary.score;
    }
    next.bestScoreByDay = trimHistory(next.bestScoreByDay);

    const alreadyClearedToday = profile.lastClearedDay === summary.dayKey;
    if (summary.cleared && !alreadyClearedToday) {
      streakAfter = streakBefore + 1;
      next.streak = streakAfter;
      next.bestStreak = Math.max(profile.bestStreak, streakAfter);
      next.lastClearedDay = summary.dayKey;

      box = rollBox(summary.dayKey, streakAfter, next.unlocked);
      next.coins += box.coins;
      if (box.bonusItemId && !next.unlocked.includes(box.bonusItemId)) {
        next.unlocked.push(box.bonusItemId);
      }
    }
  }

  const levelAfter = levelFromXp(next.xp);
  const context = {
    streak: streakAfter,
    level: levelAfter.level,
    coins: next.coins,
    totalClears: next.totals.clears,
  };

  const newStickers: Sticker[] = [];
  let stickerCoins = 0;
  for (const sticker of STICKERS) {
    if (next.stickers.includes(sticker.id)) continue;
    if (!sticker.test(summary, context)) continue;
    next.stickers.push(sticker.id);
    stickerCoins += sticker.coins;
    newStickers.push(sticker);
  }
  next.coins += stickerCoins;

  const bestScore = Math.max(summary.score, profile.bestScoreByDay[summary.dayKey] ?? 0);

  return {
    profile: next,
    coins,
    stickerCoins,
    totalCoins: coins.total + stickerCoins + (box?.coins ?? 0),
    xpGained,
    levelBefore,
    levelAfter,
    leveledUp: levelAfter.level > levelBefore.level,
    newStickers,
    box,
    streakBefore,
    streakAfter,
    bestScore,
    isNewBest: summary.score > (profile.bestScoreByDay[summary.dayKey] ?? 0),
  };
}

export function purchaseItem(profile: Profile, itemId: string, price: number): Profile | null {
  if (profile.unlocked.includes(itemId)) return null;
  if (profile.coins < price) return null;
  return {
    ...profile,
    coins: profile.coins - price,
    unlocked: [...profile.unlocked, itemId],
  };
}

export function equipItem(
  profile: Profile,
  slot: keyof EquippedSlots,
  itemId: string | null,
): Profile {
  return { ...profile, equipped: { ...profile.equipped, [slot]: itemId } };
}
