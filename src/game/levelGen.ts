import { BALLOON, GROUND_Y, MaterialKey, RUN } from './constants';
import { createRng, mixSeed, Rng } from './rng';

export type BlockSpec = {
  id: string;
  material: MaterialKey;
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
};

export type BalloonSpec = {
  id: string;
  x: number;
  y: number;
  color: string;
  /** Where the string is tied. Null means it is wedged in the stack, not tied. */
  anchorY: number | null;
};

export type HoopSpec = {
  id: string;
  x: number;
  y: number;
  outerR: number;
  thickness: number;
  color: string;
};

export type LevelSpec = {
  seed: number;
  dayKey: string | null;
  stage: number;
  title: string;
  difficulty: number;
  throws: number;
  blocks: BlockSpec[];
  balloons: BalloonSpec[];
  hoops: HoopSpec[];
  worldWidth: number;
};

/** Close enough that a slow glide still reaches the first pile on a phone. */
const FIRST_STACK_X = 720;

/** Real objects, at roughly the proportions you would expect them to have. */
const ITEM_SIZE: Record<MaterialKey, { w: number; h: number }> = {
  cardboard: { w: 64, h: 52 },
  glass: { w: 24, h: 62 },
  wood: { w: 58, h: 58 },
  brick: { w: 62, h: 28 },
};

const PLANK_H = 16;

const TITLES = [
  'Back Fence',
  'Side Yard',
  'Garden Path',
  'Bottle Row',
  'The Long Yard',
  'Shed Corner',
  'Washing Line',
  'Gravel Drive',
  'Tool Rack',
  'Compost Heap',
  'Patio Steps',
  'Wood Pile',
];

const HOOP_COLORS = ['#E0605A', '#F2B33D', '#5FB6E0', '#7FC96B', '#D96FA8'];

type StackOutput = {
  blocks: BlockSpec[];
  balloons: BalloonSpec[];
  width: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function rowMaterial(rng: Rng, row: number, rows: number, difficulty: number): MaterialKey {
  // Yard 1 stays cardboard and glass. Wood, then brick, show up as the sitting goes on.
  if (difficulty < 0.2) {
    return rng.chance(0.35) ? 'glass' : 'cardboard';
  }
  const height = row / Math.max(1, rows - 1);
  if (height < 0.4) {
    if (difficulty > 0.5 && rng.chance(0.3 + difficulty * 0.55)) return 'brick';
    return rng.chance(0.45 + difficulty * 0.4) ? 'wood' : 'cardboard';
  }
  if (height < 0.75 && difficulty > 0.32) {
    return rng.chance(0.25 + difficulty * 0.5) ? 'wood' : 'cardboard';
  }
  return rng.chance(0.4) ? 'glass' : 'cardboard';
}

function buildStack(
  rng: Rng,
  baseX: number,
  rows: number,
  difficulty: number,
  withCavity: boolean,
  prefix: string,
): StackOutput {
  const blocks: BlockSpec[] = [];
  const balloons: BalloonSpec[] = [];
  let ids = 0;
  const nextId = () => `${prefix}-${ids++}`;

  const footprint = rng.pick([196, 232, 268]);

  let cursorY = GROUND_Y;
  // No row may overhang the one under it, or the stack topples on its own.
  let supported = footprint;

  // One row gets a gap knocked out of it with a balloon tucked inside, so at
  // least one target has to be dug out rather than simply flown at.
  const cavityRow = withCavity && rows >= 2 ? rng.int(Math.max(0, rows - 3), rows - 2) : -1;

  for (let row = 0; row < rows; row += 1) {
    // The cavity row has to be at least as tall as a balloon, or whatever spans
    // the gap ends up hanging in mid air and the stack sags on its own.
    const material =
      row === cavityRow
        ? rng.pick(['cardboard', 'wood'] as const)
        : rowMaterial(rng, row, rows, difficulty);
    const size = ITEM_SIZE[material];
    const count = Math.max(1, Math.floor(supported / size.w));
    const rowWidth = Math.min(count * size.w, supported);
    const startX = baseX + (footprint - rowWidth) / 2;
    const cavityAt = row === cavityRow && count >= 3 ? rng.int(1, count - 2) : -1;

    for (let i = 0; i < count; i += 1) {
      if (i === cavityAt) {
        balloons.push({
          id: `${prefix}-nest`,
          x: startX + i * size.w + size.w / 2,
          y: cursorY - size.h / 2,
          color: rng.pick(BALLOON.colors),
          anchorY: null,
        });
        continue;
      }
      blocks.push({
        id: nextId(),
        material,
        x: startX + i * size.w + size.w / 2,
        y: cursorY - size.h / 2,
        w: size.w - 3,
        h: size.h,
        angle: 0,
      });
    }

    cursorY -= size.h;
    supported = rowWidth;

    if (row < rows - 1 && (cavityAt >= 0 || rng.chance(0.6))) {
      blocks.push({
        id: nextId(),
        material: 'wood',
        x: baseX + footprint / 2,
        y: cursorY - PLANK_H / 2,
        w: rowWidth,
        h: PLANK_H,
        angle: 0,
      });
      cursorY -= PLANK_H;
    }
  }

  const topY = cursorY;
  const centerX = baseX + footprint / 2;

  // One balloon always floats clear above the stack, so every stack has an
  // opening shot that does not need the pile taken apart first.
  balloons.push({
    id: `${prefix}-float`,
    x: centerX + rng.range(-40, 40),
    y: topY - rng.range(92, 168) - BALLOON.radius,
    color: rng.pick(BALLOON.colors),
    anchorY: topY,
  });

  return { blocks, balloons, width: footprint };
}

function buildHoops(rng: Rng, pressure: number): HoopSpec[] {
  const count = clamp(2 + Math.floor(pressure * 4), 2, 7);
  const hoops: HoopSpec[] = [];
  let x = 420 + rng.range(0, 50);

  for (let i = 0; i < count; i += 1) {
    hoops.push({
      id: `hoop-${i}`,
      x,
      y: rng.range(220, 540),
      outerR: Math.max(26, rng.range(64, 82) - pressure * 28),
      thickness: 12,
      color: HOOP_COLORS[i % HOOP_COLORS.length],
    });
    x += rng.range(110, 150) + pressure * 12;
  }

  return hoops;
}

export function generateLevel(seed: number, dayKey: string | null, stage = 1): LevelSpec {
  const stageIndex = Math.max(1, Math.floor(stage));
  const rng = createRng(mixSeed(seed, `yard-${stageIndex}`));
  // Each next yard steps up. After the piles stop growing, the gaps, hoops, and
  // spare planes keep getting tighter so a later round is never a repeat.
  const difficulty = clamp((stageIndex - 1) * 0.14, 0, 1);
  const pastCap = Math.max(0, stageIndex - 6);

  const hoops = buildHoops(rng, difficulty + pastCap * 0.15);

  const stackCount = clamp(1 + stageIndex, 2, 7);
  const blocks: BlockSpec[] = [];
  const balloons: BalloonSpec[] = [];
  let stackX = FIRST_STACK_X + Math.min(stageIndex - 1, 4) * 36;

  // Stacks step down across the yard so one throw can chain them early on.
  // Later yards start taller and leave wider gaps, so the chain stops paying off.
  const tallest = clamp(2 + stageIndex, 3, 7);

  for (let i = 0; i < stackCount; i += 1) {
    const rows = Math.max(1, tallest - i);
    const withCavity =
      stageIndex >= 2 &&
      rows >= 2 &&
      (stageIndex >= 4 || i === 0 || rng.chance(0.4 + difficulty * 0.45));
    const stack = buildStack(rng, stackX, rows, difficulty, withCavity, `s${i}`);
    blocks.push(...stack.blocks);
    balloons.push(...stack.balloons);
    const gapMin = 100 + (stageIndex - 1) * 18 + pastCap * 24;
    const gap = rng.range(gapMin, gapMin + 70);
    stackX += stack.width + gap;
  }

  if (stageIndex === 1 && balloons.length < 3) {
    balloons.push({
      id: 's-extra',
      x: FIRST_STACK_X - rng.range(80, 140),
      y: GROUND_Y - rng.range(210, 280),
      color: rng.pick(BALLOON.colors),
      anchorY: GROUND_Y - 40,
    });
  }

  let throws: number;
  if (stageIndex <= 1) {
    throws = clamp(Math.max(balloons.length, 2), 2, 3);
  } else if (stageIndex === 2) {
    throws = clamp(balloons.length, 2, 4);
  } else if (stageIndex === 3) {
    throws = clamp(balloons.length - 1, 2, RUN.maxThrows);
  } else {
    throws = clamp(balloons.length - 1 - Math.floor((stageIndex - 2) / 2), 2, RUN.maxThrows);
  }

  return {
    seed,
    dayKey,
    stage: stageIndex,
    title: rng.pick(TITLES),
    difficulty,
    throws,
    blocks,
    balloons,
    hoops,
    worldWidth: stackX + 380,
  };
}
