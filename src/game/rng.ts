export type Rng = {
  next: () => number;
  range: (min: number, max: number) => number;
  int: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  chance: (probability: number) => boolean;
};

export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Stable mix so today's yard chain stays the same while each stage is its own garden. */
export function mixSeed(base: number, salt: string | number): number {
  return hashString(`${base}::${salt}`);
}

export function createRng(seed: number | string): Rng {
  let state = (typeof seed === 'string' ? hashString(seed) : seed >>> 0) || 1;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const range = (min: number, max: number) => min + next() * (max - min);

  return {
    next,
    range,
    int: (min, max) => Math.floor(range(min, max + 1)),
    pick: <T,>(items: readonly T[]) => items[Math.floor(next() * items.length) % items.length],
    chance: (probability: number) => next() < probability,
  };
}

/** Local calendar day as YYYY-MM-DD. Days roll over at the player's midnight. */
export function todayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dailySeed(dayKey: string): number {
  return hashString(`paperplane::${dayKey}`);
}

export function msUntilNextDay(now: Date = new Date()): number {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, tomorrow.getTime() - now.getTime());
}

export function daysBetween(fromKey: string, toKey: string): number {
  const parse = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1).getTime();
  };
  const diff = parse(toKey) - parse(fromKey);
  return Math.round(diff / 86400000);
}
