/* eslint-disable no-console */
/**
 * Headless flight simulation. Compiles src/game to CommonJS (see `npm run sim`)
 * and flies an autopilot through generated levels, so tuning changes can be
 * checked without opening the app.
 */
const path = require('path');

const OUT = path.join(__dirname, '..', '.sim');
const { generateLevel } = require(path.join(OUT, 'levelGen.js'));
const { GameWorld } = require(path.join(OUT, 'physics.js'));
const { PHYSICS, RUN, GROUND_Y } = require(path.join(OUT, 'constants.js'));

const STEP = PHYSICS.fixedStep;
const MAX_STEPS = 60 * 20;

/**
 * Stands in for a competent player: pick the next balloon still up, then hold
 * the nose down whenever the plane is sitting above it.
 */
function autopilot(world, level, popped) {
  const plane = world.planeBody;
  if (!plane) return false;

  // Go for balloons in the open first; the buried ones need the stack taken
  // apart, which mostly happens as a side effect of the flights before them.
  let target = null;
  for (const pass of [0, 1]) {
    for (const balloon of level.balloons) {
      if (popped.has(balloon.id)) continue;
      if (pass === 0 && balloon.anchorY === null) continue;
      if (balloon.x < plane.position.x + 20) continue;
      if (!target || balloon.x < target.x) target = balloon;
    }
    if (target) break;
  }
  if (!target) return { holding: false, diving: false };

  // Descend at whatever rate lands the plane level with the balloon exactly
  // when it arrives, rather than diving flat out and sailing past underneath.
  const dx = Math.max(40, target.x - plane.position.x);
  const dy = target.y - plane.position.y;
  const desiredVy = Math.max(-6, Math.min(9, (dy / dx) * Math.max(1, plane.velocity.x)));
  const wantDown = plane.velocity.y < desiredVy;
  return { holding: true, diving: wantDown };
}

function flyOne(world, level, popped, stats) {
  world.throwPlane({ density: PHYSICS.planeDensity, speed: PHYSICS.launchSpeed });

  let steps = 0;
  let maxX = 0;
  let minY = Infinity;
  let maxY = 0;
  let peakSpeed = 0;

  while (steps < MAX_STEPS) {
    const input = autopilot(world, level, popped);
    if (input.diving && stats.charge >= RUN.chargeMax) {
      if (world.startPowerDive()) stats.charge = 0;
    }
    world.step(STEP, input);
    steps += 1;

    const plane = world.planeBody;
    if (plane) {
      maxX = Math.max(maxX, plane.position.x);
      minY = Math.min(minY, plane.position.y);
      maxY = Math.max(maxY, plane.position.y);
      peakSpeed = Math.max(peakSpeed, world.planeSpeed());
    }
    if (plane) {
      for (const balloon of level.balloons) {
        const d = Math.hypot(balloon.x - plane.position.x, balloon.y - plane.position.y);
        stats.nearest[balloon.id] = Math.min(stats.nearest[balloon.id] ?? Infinity, d);
      }
    }
    stats.charge = Math.min(RUN.chargeMax, stats.charge + 0.35);

    if (stats.trace && steps % 12 === 0 && world.planeBody) {
      const p = world.planeBody;
      let target = null;
      for (const balloon of level.balloons) {
        if (popped.has(balloon.id)) continue;
        if (balloon.x < p.position.x + 20) continue;
        if (!target || balloon.x < target.x) target = balloon;
      }
      console.log(
        `    t=${steps} x=${p.position.x.toFixed(0)} y=${p.position.y.toFixed(0)} vy=${p.velocity.y.toFixed(
          2,
        )} vx=${p.velocity.x.toFixed(2)} dive=${input.diving ? 1 : 0} climb=${
          input.holding && !input.diving ? 1 : 0
        } target=${
          target ? `${target.id}@${Math.round(target.x)},${Math.round(target.y)}` : 'none'
        }`,
      );
    }

    if (world.isPlaneOutOfBounds()) break;
    if (world.isPlaneStopped()) break;
  }

  let settleSteps = 0;
  while (settleSteps < 60 * 5 && !world.isSettled()) {
    world.step(STEP, { diving: false });
    settleSteps += 1;
  }
  world.removePlane();

  return { steps, maxX, minY, maxY, peakSpeed };
}

function runLevel(seed, verbose, trace) {
  const level = generateLevel(seed, null);
  const popped = new Set();
  let broken = 0;
  let hoops = 0;

  const world = new GameWorld(level, {
    onDamage: (event) => {
      if (!event.destroyed) return;
      if (event.kind === 'balloon') popped.add(event.id);
      else broken += 1;
    },
    onHoopPass: () => {
      hoops += 1;
    },
  });

  const stats = { charge: 0, nearest: {}, trace: false };
  const flights = [];
  for (let i = 0; i < level.throws; i += 1) {
    stats.trace = trace && i === 0;
    flights.push(flyOne(world, level, popped, stats));
    stats.trace = false;
    if (world.balloonsRemaining === 0) break;
  }

  if (verbose) {
    console.log(`seed ${seed} "${level.title}" balloons at:`);
    for (const balloon of level.balloons) {
      console.log(
        `  ${balloon.id} x=${Math.round(balloon.x)} y=${Math.round(balloon.y)} ${
          popped.has(balloon.id) ? 'POPPED' : 'left up'
        } closest approach ${Math.round(stats.nearest[balloon.id] ?? -1)}`,
      );
    }
    flights.forEach((f, i) =>
      console.log(
        `  throw ${i + 1}: ${f.steps} steps, x to ${Math.round(f.maxX)}, y ${Math.round(
          f.minY,
        )}..${Math.round(f.maxY)}, peak speed ${f.peakSpeed.toFixed(1)}`,
      ),
    );
  }

  const out = {
    seed,
    difficulty: +level.difficulty.toFixed(2),
    blocks: level.blocks.length,
    balloons: level.balloons.length,
    popped: popped.size,
    cleared: world.balloonsRemaining === 0,
    broken,
    hoops,
    reach: Math.round(Math.max(...flights.map((f) => f.maxX))),
    throwsUsed: flights.length,
    throwsAllowed: level.throws,
    worldWidth: level.worldWidth,
  };
  world.destroy();
  return out;
}

/** Stability check: nothing should move while nobody has thrown anything. */
function restCheck(seed) {
  const level = generateLevel(seed, null);
  const world = new GameWorld(level, {});
  for (let i = 0; i < 60 * 3; i += 1) world.step(STEP, { diving: false });
  const frame = world.buildFrame();
  let maxDrift = 0;
  world.slots.forEach((slot, i) => {
    if (slot.kind !== 'block') return;
    const base = i * 5;
    const spec = level.blocks.find((b) => b.id === slot.id);
    if (!spec) return;
    if (frame[base + 3] === 0) {
      maxDrift = Math.max(maxDrift, 999);
      return;
    }
    maxDrift = Math.max(maxDrift, Math.hypot(frame[base] - spec.x, frame[base + 1] - spec.y));
  });
  world.destroy();
  return maxDrift;
}

/** Hold the whole flight: the dart must actually gain height. */
function climbProbe() {
  const empty = {
    seed: 1,
    dayKey: null,
    title: 'climb-probe',
    stage: 1,
    difficulty: 0,
    throws: 1,
    blocks: [],
    balloons: [],
    hoops: [],
    worldWidth: 6000,
  };
  const world = new GameWorld(empty, {});
  world.throwPlane({ density: PHYSICS.planeDensity, speed: PHYSICS.launchSpeed });
  const startY = world.planeBody.position.y;
  let minY = startY;
  for (let i = 0; i < 90; i += 1) {
    world.step(STEP, { holding: true, diving: false });
    const plane = world.planeBody;
    if (!plane) break;
    minY = Math.min(minY, plane.position.y);
  }
  const climbed = startY - minY;
  world.destroy();
  console.log(`hold-to-climb probe: rose ${climbed.toFixed(1)} world units (need ≥ 50)`);
  if (climbed < 50) {
    console.error('HOLD TO CLIMB IS TOO WEAK');
    process.exit(1);
  }
}

/** Keep holding: after the climb window the dart must reverse. */
function loopProbe() {
  const empty = {
    seed: 1,
    dayKey: null,
    title: 'loop-probe',
    stage: 1,
    difficulty: 0,
    throws: 1,
    blocks: [],
    balloons: [],
    hoops: [],
    worldWidth: 6000,
  };
  const world = new GameWorld(empty, {});
  world.throwPlane({ density: PHYSICS.planeDensity, speed: PHYSICS.launchSpeed });
  let reversedAt = -1;
  for (let i = 0; i < 150; i += 1) {
    const holdMs = i * STEP;
    world.step(STEP, {
      holding: true,
      diving: false,
      loop: holdMs >= PHYSICS.loopAfterMs,
    });
    const plane = world.planeBody;
    if (!plane) break;
    if (reversedAt < 0 && plane.velocity.x < -0.5) reversedAt = i;
    // Judge it shortly after the turn: by the end of the window a fast
    // return can already have reached the backstop behind the throwing line.
    if (reversedAt >= 0 && i >= reversedAt + 40) break;
  }
  const plane = world.planeBody;
  const vx = plane ? plane.velocity.x : 0;
  world.destroy();
  console.log(
    `loop-back probe: reversed at step ${reversedAt}  final vx=${vx.toFixed(2)} (need vx < 0)`,
  );
  if (reversedAt < 0 || vx >= 0) {
    console.error('LOOP BACK DID NOT REVERSE');
    process.exit(1);
  }
}

climbProbe();
loopProbe();

const count = Number(process.argv[2] ?? 12);
const verbose = process.argv.includes('-v');
const trace = process.argv.includes('--trace');
const rows = [];
let cleared = 0;
let worstDrift = 0;

for (let i = 0; i < count; i += 1) {
  const seed = 1000 + i * 7919;
  const drift = restCheck(seed);
  worstDrift = Math.max(worstDrift, drift);
  const result = runLevel(seed, verbose, trace);
  result.drift = +drift.toFixed(2);
  if (result.cleared) cleared += 1;
  rows.push(result);
}

console.table(
  rows.map((r) => ({
    seed: r.seed,
    diff: r.difficulty,
    blocks: r.blocks,
    balloons: r.balloons,
    popped: r.popped,
    cleared: r.cleared,
    broken: r.broken,
    hoops: r.hoops,
    reach: r.reach,
    width: r.worldWidth,
    throws: `${r.throwsUsed}/${r.throwsAllowed}`,
    drift: r.drift,
  })),
);
console.log(`cleared ${cleared}/${count}  worst rest drift ${worstDrift.toFixed(2)}`);

console.log('\nstage curve (seed 1000):');
for (const stage of [1, 2, 3, 4, 5]) {
  const level = generateLevel(1000, null, stage);
  const nested = level.balloons.filter((b) => b.anchorY === null).length;
  console.log(
    `  yard ${stage}  diff=${level.difficulty.toFixed(2)}  balloons=${level.balloons.length}  nested=${nested}  throws=${level.throws}  blocks=${level.blocks.length}  hoops=${level.hoops.length}  width=${level.worldWidth}  "${level.title}"`,
  );
}
