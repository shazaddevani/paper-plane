/* eslint-disable no-console */
/**
 * Flight envelope probe. Reports how far a plain glide carries the plane, how
 * steeply a held dive drops it, and how much height a dive can be traded back
 * for. The level generator is laid out against these numbers.
 */
const path = require('path');

const OUT = path.join(__dirname, '..', '.sim');
const { GameWorld } = require(path.join(OUT, 'physics.js'));
const { PHYSICS, GROUND_Y, PLANE_START_X, PLANE_START_Y } = require(path.join(OUT, 'constants.js'));

const STEP = PHYSICS.fixedStep;

const emptyLevel = {
  seed: 1,
  dayKey: null,
  title: 'probe',
  stage: 1,
  difficulty: 0,
  throws: 1,
  blocks: [],
  balloons: [],
  hoops: [],
  worldWidth: 6000,
};

function fly(policy, maxSteps = 60 * 30) {
  const world = new GameWorld(emptyLevel, {});
  world.throwPlane({ density: PHYSICS.planeDensity, speed: PHYSICS.launchSpeed });
  const path = [];
  for (let i = 0; i < maxSteps; i += 1) {
    const plane = world.planeBody;
    if (!plane) break;
    path.push({
      t: i,
      x: plane.position.x,
      y: plane.position.y,
      speed: world.planeSpeed(),
    });
    if (plane.position.y >= GROUND_Y - PHYSICS.planeRadius - 4) break;
    const command = policy(i, plane, world);
    world.step(STEP, {
      diving: command === true,
      holding: command === 'climb' || command === 'loop',
      loop: command === 'loop',
    });
  }
  world.destroy();
  return path;
}

function report(name, path) {
  const last = path[path.length - 1];
  const slope = (last.y - PLANE_START_Y) / Math.max(1, last.x - PLANE_START_X);
  console.log(
    `${name.padEnd(22)} lands x=${last.x.toFixed(0).padStart(5)} after ${String(last.t).padStart(
      4,
    )} steps  slope ${slope.toFixed(3)}  final speed ${last.speed.toFixed(1)}`,
  );
  const marks = [400, 800, 1200, 1600, 2000, 2400, 2800];
  const cells = marks
    .map((mx) => {
      const point = path.find((p) => p.x >= mx);
      return point ? `${mx}:${point.y.toFixed(0)}` : `${mx}:--`;
    })
    .join('  ');
  console.log(`   ${cells}`);
}

report(
  'held climb',
  fly(() => 'climb', 60 * 5),
);
report(
  'held loop',
  fly((i) => (i * STEP >= PHYSICS.loopAfterMs ? 'loop' : 'climb'), 60 * 5),
);
report(
  'pure glide',
  fly(() => false),
);
report(
  'held dive',
  fly(() => true),
);

// Dive for a fixed burst, then release and see how much height comes back.
for (const diveSteps of [30, 60, 90]) {
  const path = fly((i) => i < diveSteps);
  const releaseY = path[Math.min(diveSteps, path.length - 1)].y;
  let peak = releaseY;
  for (const point of path) {
    if (point.t > diveSteps) peak = Math.min(peak, point.y);
  }
  console.log(
    `dive ${String(diveSteps).padStart(2)} then glide  release y=${releaseY.toFixed(
      0,
    )}  climbs back to ${peak.toFixed(0)}  (${(releaseY - peak).toFixed(0)} regained)`,
  );
  if (process.argv.includes('--trace')) {
    const after = path.filter((p) => p.t >= diveSteps && p.t <= diveSteps + 90 && p.t % 6 === 0);
    console.log(
      `   ${after
        .map((p) => `t${p.t} y${p.y.toFixed(0)} s${p.speed.toFixed(1)}`)
        .join('  ')}`,
    );
  }
}
