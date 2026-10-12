import Matter from 'matter-js';

import {
  BALLOON,
  GROUND_Y,

  MATERIALS,
  MaterialKey,
  PHYSICS,
  PLANE_START_X,
  PLANE_START_Y,
  WORLD_HEIGHT,
} from './constants';
import { HoopSpec, LevelSpec } from './levelGen';

const { Bodies, Body, Composite, Constraint, Engine, Events, Vector } = Matter;

/** How long a smashed box or popped balloon takes to burst before it is gone. */
const BURST_MS = 170;
/** Debris fades over its last stretch instead of blinking out. */
const DEBRIS_FADE_MS = 320;
/** Helium: how hard a balloon pulls up, as a fraction of gravity. */
const BALLOON_LIFT = 1.45;
/** A loose balloon rises until here and hovers, still on screen to pop. */
const BALLOON_CEILING_Y = 150;

export const STRIDE = 5;
export const TRAIL_LENGTH = 16;
export const DEBRIS_POOL = 28;

/** Debris colours, indexed from the frame buffer inside a worklet. */
export const DEBRIS_COLORS = [
  MATERIALS.cardboard.shard,
  MATERIALS.glass.shard,
  MATERIALS.wood.shard,
  MATERIALS.brick.shard,
  ...BALLOON.colors,
  '#FDF7EC',
  '#E4D8B8',
  '#D6C9B4',
  '#FFF6E4',
];

const PAPER_SCRAP_A = DEBRIS_COLORS.length - 4;
const PAPER_SCRAP_B = DEBRIS_COLORS.length - 3;

const MATERIAL_DEBRIS_INDEX: Record<MaterialKey, number> = {
  cardboard: 0,
  glass: 1,
  wood: 2,
  brick: 3,
};

function wrapAngle(angle: number) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Mirror a right-facing flight angle onto the left-facing heading. */
function headingCommand(facing: number, rightAngle: number) {
  if (facing >= 0) return rightAngle;
  return wrapAngle(Math.PI - rightAngle);
}

export const CATEGORY = {
  plane: 0x0001,
  stack: 0x0002,
  ground: 0x0004,
  debris: 0x0008,
  balloon: 0x0010,
};

export type SlotKind = 'block' | 'balloon' | 'debris' | 'trail' | 'plane';

export type RenderSlot = {
  index: number;
  id: string;
  kind: SlotKind;
  shape: 'rect' | 'circle';
  w: number;
  h: number;
  material?: MaterialKey;
  color?: string;
  /** Length of a balloon's string down to whatever it is tied to. */
  stringLength?: number;
};

export type DamageEvent = {
  id: string;
  x: number;
  y: number;
  amount: number;
  impulse: number;
  destroyed: boolean;
  kind: 'block' | 'balloon';
  material?: MaterialKey;
};

export type HoopPassEvent = { hoopIndex: number; x: number; y: number };

export type WorldCallbacks = {
  onDamage?: (event: DamageEvent) => void;
  onHoopPass?: (event: HoopPassEvent) => void;
  /** Multiplies the plane's impact damage, for the paperclip nose upgrade. */
  damageScale?: number;
};

type BodyMeta = {
  slot: number;
  kind: 'block' | 'balloon' | 'debris' | 'plane';
  hp: number;
  maxHp: number;
  material?: MaterialKey;
  debrisColor: number;
  threshold: number;
  dead?: boolean;
  expiresAt?: number;
  /** When the body was destroyed, so it can burst instead of vanishing. */
  diedAt?: number;
};

type BalloonTie = {
  balloon: Matter.Body;
  constraint: Matter.Constraint;
  /** The block it is tied to, or null for a peg in the grass. */
  block: Matter.Body | null;
};

/** How much harder the plane hits than one falling box hitting another. */
const PLANE_DAMAGE_FACTOR = 3;
const STACK_DAMAGE_FACTOR = 1.15;

function metaOf(body: Matter.Body): BodyMeta | undefined {
  return (body.plugin as { meta?: BodyMeta } | undefined)?.meta;
}

function setMeta(body: Matter.Body, meta: BodyMeta) {
  body.plugin = { ...(body.plugin ?? {}), meta };
}

export type FlightInput = { holding?: boolean; diving?: boolean; loop?: boolean };

export class GameWorld {
  readonly engine: Matter.Engine;
  readonly slots: RenderSlot[] = [];
  readonly level: LevelSpec;
  readonly balloonTotal: number;

  private callbacks: WorldCallbacks;
  private bodies: (Matter.Body | null)[] = [];
  private frames: [number[], number[]];
  private frameToggle = 0;
  private clock = 0;

  private plane: Matter.Body | null = null;
  private planeSlot = 0;
  private pitch = 0;
  private turnScale = 1;
  private climbScale = 1;
  private loopScale = 1;
  private gravityScale = 1;
  private glideScale = 1;
  private diveScale = 1;
  private hitScale = 1;
  private baseDensity: number = PHYSICS.planeDensity;
  private pierce = false;
  private smash = false;
  /** +1 flying right, -1 flying left. Set by launch and by finishing a loop. */
  private facing: 1 | -1 = 1;
  private looping = false;
  private didLoopThisHold = false;
  /** 1 upright, -1 rolled over. Follows `facing` so a loop-back rolls upright. */
  private roll = 1;
  private loopStartFacing: 1 | -1 = 1;
  private loopSteps = 0;
  private holdSteps = 0;
  private loopRadius: number = PHYSICS.loopMaxRadius;
  private prevRoll = 1;
  private grounded = false;
  private crushed = false;
  private crushAt = 0;
  /**
   * Pose of every slot after the last two physics steps. The screen refreshes
   * faster than the sim steps, so each drawn frame blends between the two
   * instead of holding still and then jumping.
   */
  private prevPose: Float64Array = new Float64Array(0);
  private currPose: Float64Array = new Float64Array(0);
  private snapSlots = new Set<number>();
  private shownPlaneX = PLANE_START_X;
  private ties: BalloonTie[] = [];
  private powerDiveUntil = 0;
  /** Set once the stacks have settled; impacts before that are not the player's. */
  private armed = false;

  private stillSteps = 0;
  private trailStart = 0;
  private debrisStart = 0;
  private debrisBodies: Matter.Body[] = [];
  private debrisCursor = 0;
  private trail: { x: number; y: number }[] = [];

  private balloonBodies: Matter.Body[] = [];
  private hoopState: { spec: HoopSpec; passed: boolean }[] = [];
  private prevPlaneX = 0;
  private prevPlanePos = { x: 0, y: 0 };

  balloonsRemaining: number;

  constructor(level: LevelSpec, callbacks: WorldCallbacks = {}) {
    this.level = level;
    this.callbacks = callbacks;
    this.engine = Engine.create({ enableSleeping: true });
    this.engine.gravity.y = PHYSICS.gravityY;
    this.engine.positionIterations = 8;
    this.engine.velocityIterations = 6;

    this.balloonTotal = level.balloons.length;
    this.balloonsRemaining = level.balloons.length;

    this.buildStatics();
    this.buildStacks();
    this.buildBalloons();
    this.buildDebrisPool();
    this.buildTrailSlots();
    this.planeSlot = this.addSlot(
      {
        id: 'plane',
        kind: 'plane',
        shape: 'rect',
        w: PHYSICS.planeRadius * 4,
        h: PHYSICS.planeRadius * 2.4,
      },
      null,
    );

    const size = this.slots.length * STRIDE;
    this.frames = [new Array(size).fill(0), new Array(size).fill(0)];
    this.prevPose = new Float64Array(this.slots.length * 3);
    this.currPose = new Float64Array(this.slots.length * 3);

    Events.on(this.engine, 'collisionStart', this.handleCollisions);
    this.bedIn();
  }

  /**
   * Stacks are authored flush, so the first few frames of contact resolution
   * shuffle everything a unit or two into its real resting place. Left alone
   * that reads as impacts, and the player opens the yard on a non-zero score
   * for damage they did not do. Settle the world before anyone is watching and
   * only start counting hits afterwards.
   */
  private bedIn() {
    // Nothing has velocity on the first frame, so a settled check would pass
    // before a single contact has been resolved. Always run the warm-up.
    for (let i = 0; i < 90; i += 1) {
      this.liftBalloons();
      Engine.update(this.engine, PHYSICS.fixedStep);
      if (i >= 45 && this.isSettled()) break;
    }
    this.armed = true;
    this.capturePose();
    this.prevPose.set(this.currPose);
  }

  destroy() {
    Events.off(this.engine, 'collisionStart', this.handleCollisions);
    Composite.clear(this.engine.world, false, true);
    Engine.clear(this.engine);
  }

  private addSlot(slot: Omit<RenderSlot, 'index'>, body: Matter.Body | null): number {
    const index = this.slots.length;
    this.slots.push({ ...slot, index });
    this.bodies.push(body);
    return index;
  }

  private buildStatics() {
    const ground = Bodies.rectangle(
      this.level.worldWidth / 2,
      GROUND_Y + 200,
      this.level.worldWidth + 2400,
      400,
      {
        isStatic: true,
        friction: 0.92,
        restitution: 0.02,
        collisionFilter: {
          category: CATEGORY.ground,
          mask: CATEGORY.plane | CATEGORY.stack | CATEGORY.debris,
        },
      },
    );

    const backstop = Bodies.rectangle(-160, WORLD_HEIGHT / 2, 60, WORLD_HEIGHT * 2, {
      isStatic: true,
      collisionFilter: {
        category: CATEGORY.ground,
        mask: CATEGORY.plane | CATEGORY.stack | CATEGORY.debris,
      },
    });

    // Hoops are scored, not solid. Bouncing off a rim would end an otherwise
    // good flight on a shape the player cannot read precisely.
    for (const hoop of this.level.hoops) {
      this.hoopState.push({ spec: hoop, passed: false });
    }

    Composite.add(this.engine.world, [ground, backstop]);
  }

  private buildStacks() {
    const bodies: Matter.Body[] = [];

    for (const spec of this.level.blocks) {
      const material = MATERIALS[spec.material];
      const body = Bodies.rectangle(spec.x, spec.y, spec.w, spec.h, {
        angle: spec.angle,
        density: material.density,
        restitution: material.restitution,
        friction: material.friction,
        frictionStatic: material.friction + 0.2,
        frictionAir: 0.004,
        collisionFilter: {
          category: CATEGORY.stack,
          mask: CATEGORY.stack | CATEGORY.ground | CATEGORY.plane | CATEGORY.balloon,
        },
      });
      const slot = this.addSlot(
        { id: spec.id, kind: 'block', shape: 'rect', w: spec.w, h: spec.h, material: spec.material },
        body,
      );
      setMeta(body, {
        slot,
        kind: 'block',
        hp: material.hp,
        maxHp: material.hp,
        material: spec.material,
        debrisColor: MATERIAL_DEBRIS_INDEX[spec.material],
        threshold: material.damageThreshold,
      });
      bodies.push(body);
    }

    Composite.add(this.engine.world, bodies);
  }

  private buildBalloons() {
    const bodies: Matter.Body[] = [];
    const blocks = this.bodies.filter((body): body is Matter.Body => body !== null);

    this.level.balloons.forEach((spec, i) => {
      // A real balloon: light, pulled up by helium, and held down by its string.
      // Knock the stack it is tied to and it sways; smash the block and it gets
      // away. One wedged in a stack is held in by whatever is around it.
      const body = Bodies.circle(spec.x, spec.y, BALLOON.radius, {
        density: BALLOON.density,
        restitution: BALLOON.restitution,
        friction: BALLOON.friction,
        frictionAir: 0.05,
        sleepThreshold: Infinity,
        collisionFilter: {
          category: CATEGORY.balloon,
          mask: CATEGORY.stack,
        },
      });
      const colorIndex = BALLOON.colors.indexOf(spec.color as (typeof BALLOON.colors)[number]);
      const stringLength = spec.anchorY === null ? 0 : Math.max(0, spec.anchorY - spec.y);
      const slot = this.addSlot(
        {
          id: spec.id,
          kind: 'balloon',
          shape: 'circle',
          w: BALLOON.radius * 2,
          h: BALLOON.radius * 2,
          color: spec.color,
          stringLength,
        },
        body,
      );
      setMeta(body, {
        slot,
        kind: 'balloon',
        hp: BALLOON.hp,
        maxHp: BALLOON.hp,
        debrisColor: 4 + (colorIndex >= 0 ? colorIndex : i % BALLOON.colors.length),
        threshold: BALLOON.damageThreshold,
      });
      bodies.push(body);

      if (spec.anchorY !== null) {
        const anchorY = spec.anchorY;
        const block = this.findTieBlock(blocks, spec.x, anchorY);
        let constraint: Matter.Constraint;
        if (block) {
          const halfW = (block.bounds.max.x - block.bounds.min.x) / 2 - 4;
          const offsetX = Math.max(-halfW, Math.min(halfW, spec.x - block.position.x));
          const pointA = { x: offsetX, y: anchorY - block.position.y };
          constraint = Constraint.create({
            bodyA: block,
            pointA,
            bodyB: body,
            length: Math.hypot(block.position.x + offsetX - spec.x, anchorY - spec.y),
            stiffness: 0.08,
            damping: 0.08,
          });
        } else {
          constraint = Constraint.create({
            pointA: { x: spec.x, y: anchorY },
            bodyB: body,
            length: stringLength,
            stiffness: 0.08,
            damping: 0.08,
          });
        }
        this.ties.push({ balloon: body, constraint, block });
        Composite.add(this.engine.world, constraint);
      }
    });

    this.balloonBodies = bodies;
    Composite.add(this.engine.world, bodies);
  }

  /** The block whose top the string was tied to: the one under the balloon at that height. */
  private findTieBlock(blocks: Matter.Body[], x: number, anchorY: number): Matter.Body | null {
    let best: Matter.Body | null = null;
    let bestGap = Infinity;
    for (const block of blocks) {
      const top = block.bounds.min.y;
      if (Math.abs(top - anchorY) > 3) continue;
      const gap = Math.abs(block.position.x - x);
      if (gap < bestGap) {
        bestGap = gap;
        best = block;
      }
    }
    return best;
  }

  private untie(predicate: (tie: BalloonTie) => boolean) {
    this.ties = this.ties.filter((tie) => {
      if (!predicate(tie)) return true;
      Composite.remove(this.engine.world, tie.constraint);
      return false;
    });
  }

  /** Helium, plus a breath of wind so nothing hangs perfectly still. */
  private liftBalloons() {
    const gScale = this.engine.gravity.scale ?? 0.001;
    for (let i = 0; i < this.balloonBodies.length; i += 1) {
      const body = this.balloonBodies[i];
      const meta = metaOf(body);
      if (!meta || meta.dead) continue;
      const weight = body.mass * PHYSICS.gravityY * gScale;
      const breeze = Math.sin(this.clock * 0.0011 + i * 1.7) * 0.06;
      // Lift fades out near the ceiling so a loose balloon settles there.
      const room = Math.max(-1, Math.min(1, (body.position.y - BALLOON_CEILING_Y) / 80));
      const lift = room >= 1 ? BALLOON_LIFT : 1 + (BALLOON_LIFT - 1) * room;
      Body.applyForce(body, body.position, { x: weight * breeze, y: -weight * lift });
    }
  }


  /**
   * The plane covers more ground in one step than a balloon is wide, so a
   * discrete collision test skips straight over them. Sweep the segment the
   * plane actually travelled instead.
   */
  private sweepBalloons() {
    const plane = this.plane;
    if (!plane) return;

    const ax = this.prevPlanePos.x;
    const ay = this.prevPlanePos.y;
    const dx = plane.position.x - ax;
    const dy = plane.position.y - ay;
    const lengthSq = dx * dx + dy * dy;
    const reach = BALLOON.radius + PHYSICS.planeRadius + 6;

    for (const body of this.balloonBodies) {
      const meta = metaOf(body);
      if (!meta || meta.dead) continue;

      const px = body.position.x - ax;
      const py = body.position.y - ay;
      const t = lengthSq > 0 ? Math.max(0, Math.min(1, (px * dx + py * dy) / lengthSq)) : 0;
      const gapX = px - dx * t;
      const gapY = py - dy * t;
      if (gapX * gapX + gapY * gapY > reach * reach) continue;

      this.applyDamage(body, meta.hp, Vector.magnitude(plane.velocity) * plane.mass);
    }
  }

  private buildDebrisPool() {
    this.debrisStart = this.slots.length;
    for (let i = 0; i < DEBRIS_POOL; i += 1) {
      const size = 8 + (i % 3) * 4;
      const body = Bodies.rectangle(-600, -600, size, size, {
        density: 0.0007,
        restitution: 0.35,
        friction: 0.4,
        frictionAir: 0.014,
        collisionFilter: { category: CATEGORY.debris, mask: CATEGORY.ground },
      });
      const slot = this.addSlot(
        { id: `debris-${i}`, kind: 'debris', shape: 'rect', w: size, h: size },
        body,
      );
      setMeta(body, {
        slot,
        kind: 'debris',
        hp: 1,
        maxHp: 1,
        debrisColor: 0,
        threshold: Infinity,
        dead: true,
      });
      this.debrisBodies.push(body);
    }
  }

  private buildTrailSlots() {
    this.trailStart = this.slots.length;
    for (let i = 0; i < TRAIL_LENGTH; i += 1) {
      const t = i / TRAIL_LENGTH;
      const w = 9 * (1 - t * 0.5);
      const h = 3.4 * (1 - t * 0.28);
      this.addSlot({ id: `trail-${i}`, kind: 'trail', shape: 'circle', w, h }, null);
    }
  }

  get frameSize() {
    return this.slots.length * STRIDE;
  }

  get planeBody() {
    return this.plane;
  }

  get isPowerDiving() {
    return this.clock < this.powerDiveUntil;
  }

  get isLooping() {
    return this.looping;
  }

  get facingSign() {
    return this.facing;
  }

  get hasLanded() {
    return this.grounded;
  }

  get isCrushed() {
    return this.crushed;
  }

  get isCrushFinished() {
    return this.crushed && this.clock - this.crushAt > 640;
  }

  /** Fold the dart into a wad and throw a few scraps. */
  crushPlane() {
    if (!this.plane || this.crushed) return;
    this.crushed = true;
    this.crushAt = this.clock;
    this.grounded = true;
    this.looping = false;
    this.trail = [];

    const plane = this.plane;
    const onGrass = plane.position.y > GROUND_Y - PHYSICS.planeRadius * 4;
    Body.setVelocity(plane, { x: plane.velocity.x * 0.08, y: 0 });
    Body.setAngularVelocity(plane, 0);
    if (onGrass) {
      Body.setPosition(plane, { x: plane.position.x, y: GROUND_Y - 8 });
      this.snapSlots.add(this.planeSlot);
      Body.setAngle(plane, this.facing >= 0 ? 0.4 : Math.PI - 0.4);
    }
    this.spawnDebris(plane.position.x, plane.position.y, PAPER_SCRAP_A, 3);
    this.spawnDebris(plane.position.x, plane.position.y, PAPER_SCRAP_B, 2);
  }

  throwPlane(options: {
    density: number;
    speed: number;
    turnScale?: number;
    climbScale?: number;
    loopScale?: number;
    gravityScale?: number;
    glideScale?: number;
    diveScale?: number;
    damageScale?: number;
    airFriction?: number;
    restitution?: number;
    radiusScale?: number;
    pierce?: boolean;
    smash?: boolean;
  }) {
    this.removePlane();
    this.turnScale = options.turnScale ?? 1;
    this.climbScale = options.climbScale ?? 1;
    this.loopScale = options.loopScale ?? 1;
    this.gravityScale = options.gravityScale ?? 1;
    this.glideScale = options.glideScale ?? 1;
    this.diveScale = options.diveScale ?? 1;
    this.hitScale = options.damageScale ?? 1;
    this.baseDensity = options.density;
    this.pierce = Boolean(options.pierce);
    this.smash = Boolean(options.smash);
    this.facing = 1;
    this.roll = 1;
    this.prevRoll = 1;
    this.looping = false;
    this.didLoopThisHold = false;
    const radius = PHYSICS.planeRadius * (options.radiusScale ?? 1);
    const body = Bodies.circle(PLANE_START_X, PLANE_START_Y, radius, {
      density: options.density,
      restitution: options.restitution ?? 0.22,
      friction: 0.5,
      frictionAir: options.airFriction ?? PHYSICS.planeAirFriction,
      collisionFilter: {
        category: CATEGORY.plane,
        // Balloons pop off the swept path. Letting them collide as well made the
        // dart bounce off them as if they were solid.
        mask: CATEGORY.stack | CATEGORY.ground,
      },
    });
    setMeta(body, {
      slot: this.planeSlot,
      kind: 'plane',
      hp: Infinity,
      maxHp: Infinity,
      debrisColor: 0,
      threshold: Infinity,
    });

    this.pitch = PHYSICS.launchAngle;
    Body.setAngle(body, this.pitch);
    Body.setVelocity(body, {
      x: Math.cos(this.pitch) * options.speed,
      y: Math.sin(this.pitch) * options.speed,
    });

    Composite.add(this.engine.world, body);
    this.plane = body;
    this.snapSlots.add(this.planeSlot);
    this.grounded = false;
    this.powerDiveUntil = 0;
    this.stillSteps = 0;
    this.prevPlaneX = PLANE_START_X;
    this.prevPlanePos = { x: PLANE_START_X, y: PLANE_START_Y };
    this.trail = [];
    for (const hoop of this.hoopState) hoop.passed = false;
  }

  removePlane() {
    if (this.plane) {
      Composite.remove(this.engine.world, this.plane);
      this.plane = null;
    }
    this.snapSlots.add(this.planeSlot);
    this.grounded = false;
    this.crushed = false;
    this.crushAt = 0;
  }

  startPowerDive() {
    if (!this.plane || this.grounded || this.isPowerDiving) return false;
    this.powerDiveUntil = this.clock + PHYSICS.powerDiveSteps * PHYSICS.fixedStep;
    Body.setDensity(this.plane, this.baseDensity * PHYSICS.powerDiveMass);
    Body.setVelocity(this.plane, {
      x: this.plane.velocity.x * PHYSICS.powerDiveSpeed,
      y: this.plane.velocity.y * PHYSICS.powerDiveSpeed + 1.4,
    });
    return true;
  }

  planeSpeed() {
    return this.plane ? Vector.magnitude(this.plane.velocity) : 0;
  }

  /**
   * Paper-plane flight. Rather than summing aerodynamic forces, the wing steers
   * the flight path toward the angle the player is asking for, and only as hard
   * as the current speed allows. Gravity, applied by the engine right after
   * this, supplies the economy: point down and it pays out speed, point up and
   * it charges for the height. Slow down too far and the turn rate collapses,
   * so the plane stops answering and falls out of the sky.
   *
   * Hold climbs. Keep holding and the dart loops over the top and comes back
   * the other way, still a paper plane, just pointed at the throwing line.
   */
  private applyFlight(input: FlightInput) {
    const plane = this.plane;
    if (!plane || this.grounded || this.crushed) return;

    const diving = Boolean(input.diving) && !this.isPowerDiving;
    const pressed = Boolean(input.holding) && !diving && !this.isPowerDiving;
    // Once a hold has looped the dart round, it has done its job: keep
    // holding and the dart simply flies on the new way instead of clawing for
    // height it no longer has the speed for.
    const holding = pressed && !this.didLoopThisHold;
    const wantLoop = Boolean(input.loop) && holding;

    // How long this press has been held, so the climb can build with it.
    this.holdSteps = pressed ? this.holdSteps + 1 : 0;

    if (!pressed) {
      this.looping = false;
      this.didLoopThisHold = false;
    } else if (!holding) {
      this.looping = false;
    } else if (wantLoop && !this.didLoopThisHold && !this.looping) {
      this.looping = true;
      this.loopStartFacing = this.facing;
      this.loopSteps = 0;
      // Size the loop to the sky above the dart so it stays on screen.
      const headroom = plane.position.y - PHYSICS.loopTopY;
      this.loopRadius = Math.max(
        PHYSICS.loopMinRadius,
        Math.min(PHYSICS.loopMaxRadius, headroom / 2),
      );
    }

    const velocity = plane.velocity;
    let speed = Vector.magnitude(velocity);
    // Only a loop already under way gets help over the top. A plain climb pays
    // for its height in speed and runs out, the way a paper dart does.
    if (this.looping && speed < PHYSICS.loopMinSpeed) speed = PHYSICS.loopMinSpeed;
    if (speed < 0.4) return;

    const flightPath = Math.atan2(velocity.y, velocity.x);
    // 0 at the stall speed, 1 once there is real airspeed over the wing.
    const airflow = Math.max(0, Math.min(1, (speed - PHYSICS.stallSpeed) / 1.5));

    let commanded = 0;
    let rate: number = PHYSICS.turnRate;
    if (this.isPowerDiving) {
      commanded = headingCommand(this.facing, PHYSICS.powerDiveAngle);
      rate = PHYSICS.turnRate * 2.4;
    } else {
      if (this.powerDiveUntil > 0 && this.clock >= this.powerDiveUntil) {
        this.powerDiveUntil = 0;
        Body.setDensity(plane, this.baseDensity);
      }
      // Left alone, a dart trims itself: too fast and the nose comes up and
      // trades speed for height, too slow and it drops to pick speed back up.
      const trim = Math.max(
        PHYSICS.trimMaxClimb,
        Math.min(
          PHYSICS.diveAngle,
          PHYSICS.glideAngle * this.glideScale - (speed - PHYSICS.trimSpeed) * PHYSICS.trimGain,
        ),
      );
      if (this.looping) {
        // A round loop of a set size: turn rate is speed over radius. Ease in
        // so the climb rolls into it instead of kinking.
        this.loopSteps += 1;
        const ease = Math.min(1, this.loopSteps / PHYSICS.loopRampSteps);
        rate = (speed / this.loopRadius) * this.loopScale * (0.3 + 0.7 * ease);
      } else if (diving) {
        commanded = headingCommand(this.facing, PHYSICS.diveAngle * this.diveScale);
        rate = PHYSICS.turnRate * Math.max(0.7, this.diveScale);
      } else if (holding) {
        // A tap lifts the nose a little; the longer the hold, the steeper the
        // climb, until it rolls into the loop. Near stall the wing stops
        // answering and the nose falls through.
        const build = Math.min(1, this.holdSteps / PHYSICS.climbBuildSteps);
        const wanted = PHYSICS.climbStartAngle + (PHYSICS.climbAngle - PHYSICS.climbStartAngle) * build;
        const climb = Math.min(trim, wanted) * airflow + trim * (1 - airflow);
        commanded = headingCommand(this.facing, climb);
        rate = PHYSICS.climbTurnRate * this.climbScale;
      } else {
        commanded = headingCommand(this.facing, trim);
        rate = PHYSICS.trimTurnRate;
      }
      // Keep the dart under the top of the yard instead of climbing out of view.
      if (!this.looping && plane.position.y < PHYSICS.ceilingY) {
        const push = Math.min(1, (PHYSICS.ceilingY - plane.position.y) / 60);
        const level = headingCommand(this.facing, 0.12);
        commanded = wrapAngle(commanded + wrapAngle(level - commanded) * push);
      }
    }

    const speedFactor = holding || this.looping
      ? Math.max(0.85, Math.min(PHYSICS.maxTurnBoost, (speed / PHYSICS.turnRefSpeed) ** 2))
      : Math.min(PHYSICS.maxTurnBoost, (speed / PHYSICS.turnRefSpeed) ** 2);
    const authority = this.looping ? rate * this.turnScale : rate * this.turnScale * speedFactor;

    let steered: number;
    if (this.looping) {
      const dir = this.loopStartFacing >= 0 ? -1 : 1;
      steered = wrapAngle(flightPath + dir * authority);
    } else {
      let delta = wrapAngle(commanded - flightPath);
      delta = Math.max(-authority, Math.min(authority, delta));
      steered = wrapAngle(flightPath + delta);
    }

    this.pitch = steered;
    Body.setAngle(plane, this.pitch);
    Body.setAngularVelocity(plane, 0);

    let vx = Math.cos(steered) * speed;
    let vy = Math.sin(steered) * speed;
    if (holding && !this.looping) {
      const build = Math.min(1, this.holdSteps / PHYSICS.climbBuildSteps);
      vy -= PHYSICS.climbLift * this.climbScale * airflow * build;
      // The moment a finger goes down the dart answers with a small lift,
      // spread over a few steps so it rises rather than jolts.
      if (this.holdSteps <= PHYSICS.tapLiftSteps) {
        vy -= (PHYSICS.tapLift / PHYSICS.tapLiftSteps) * this.climbScale;
      }
    }

    if (this.looping) {
      // Turn the facing once the dart is past straight up, but keep the loop
      // going over the top until it is flying level the other way. Ending it
      // at the vertical left the dart hanging nose-up until it stalled.
      if (this.facing >= 0 && vx < -0.45) this.facing = -1;
      else if (this.facing < 0 && vx > 0.45) this.facing = 1;
      const level = this.facing * Math.cos(steered);
      const turned = this.loopStartFacing !== this.facing;
      if (turned && level > 0.94) {
        this.looping = false;
        this.didLoopThisHold = true;
      }
    } else if (!holding) {
      if (vx > 0.7) this.facing = 1;
      else if (vx < -0.7) this.facing = -1;
    }

    Body.setVelocity(plane, { x: vx, y: vy });

    if (Math.abs(this.gravityScale - 1) > 0.001) {
      const gScale = this.engine.gravity.scale ?? 0.001;
      const fy = -plane.mass * PHYSICS.gravityY * gScale * (1 - this.gravityScale);
      Body.applyForce(plane, plane.position, { x: 0, y: fy });
    }
  }

  private handleCollisions = (event: Matter.IEventCollision<Matter.Engine>) => {
    if (!this.armed) return;
    for (const pair of event.pairs) {
      const { bodyA, bodyB } = pair;
      const metaA = metaOf(bodyA);
      const metaB = metaOf(bodyB);
      const involvesPlane = metaA?.kind === 'plane' || metaB?.kind === 'plane';

      if (involvesPlane && (bodyA.isStatic || bodyB.isStatic)) {
        const other = metaA?.kind === 'plane' ? metaB : metaA;
        if (!other) this.grounded = true;
      }

      const speed = Vector.magnitude(Vector.sub(bodyA.velocity, bodyB.velocity));
      if (speed < 1) continue;

      const massA = bodyA.isStatic ? Infinity : bodyA.mass;
      const massB = bodyB.isStatic ? Infinity : bodyB.mass;
      let reduced: number;
      if (!Number.isFinite(massA)) reduced = massB;
      else if (!Number.isFinite(massB)) reduced = massA;
      else reduced = (massA * massB) / (massA + massB);

      const impulse = speed * reduced;
      let factor = involvesPlane
        ? PLANE_DAMAGE_FACTOR * this.hitScale
        : STACK_DAMAGE_FACTOR;
      if (involvesPlane && this.smash) factor *= 1.4;

      this.damageFromImpact(bodyA, metaA, impulse, factor);
      this.damageFromImpact(bodyB, metaB, impulse, factor);

      if (involvesPlane && this.pierce) {
        const other = metaA?.kind === 'plane' ? metaB : metaA;
        const planeBody = metaA?.kind === 'plane' ? bodyA : bodyB;
        if (other?.material === 'cardboard' || other?.material === 'glass') {
          const v = planeBody.velocity;
          const spd = Vector.magnitude(v);
          if (spd > 0.3) {
            const keep = Math.max(spd * 1.12, 6);
            Body.setVelocity(planeBody, {
              x: (v.x / spd) * keep,
              y: (v.y / spd) * keep * 0.88,
            });
          }
        }
      }
    }
  };

  private damageFromImpact(
    body: Matter.Body,
    meta: BodyMeta | undefined,
    impulse: number,
    factor: number,
  ) {
    if (!meta || meta.dead) return;
    if (meta.kind === 'plane' || meta.kind === 'debris') return;
    if (impulse < meta.threshold) return;
    this.applyDamage(body, (impulse - meta.threshold) * factor, impulse);
  }

  private applyDamage(body: Matter.Body, amount: number, impulse: number) {
    const meta = metaOf(body);
    if (!meta || meta.dead || amount <= 0) return;
    if (meta.kind !== 'block' && meta.kind !== 'balloon') return;

    meta.hp -= amount;
    const destroyed = meta.hp <= 0;

    if (destroyed) {
      meta.dead = true;
      meta.diedAt = this.clock;
      Composite.remove(this.engine.world, body);
      if (meta.kind === 'balloon') this.untie((tie) => tie.balloon === body);
      else this.untie((tie) => tie.block === body);
      this.spawnDebris(
        body.position.x,
        body.position.y,
        meta.debrisColor,
        meta.kind === 'balloon' ? 10 : 6,
      );
      if (meta.kind === 'balloon') {
        this.balloonsRemaining = Math.max(0, this.balloonsRemaining - 1);
      }
    }

    this.callbacks.onDamage?.({
      id: this.slots[meta.slot].id,
      x: body.position.x,
      y: body.position.y,
      amount,
      impulse,
      destroyed,
      kind: meta.kind,
      material: meta.material,
    });
  }

  private spawnDebris(x: number, y: number, colorIndex: number, count: number) {
    for (let i = 0; i < count; i += 1) {
      const body = this.debrisBodies[this.debrisCursor % DEBRIS_POOL];
      this.debrisCursor += 1;
      const meta = metaOf(body);
      if (!meta) continue;
      if (!meta.dead) Composite.remove(this.engine.world, body);
      meta.dead = false;
      meta.expiresAt = this.clock + 1400 + (i % 4) * 200;
      meta.debrisColor = colorIndex;
      Body.setPosition(body, {
        x: x + (Math.random() - 0.5) * 26,
        y: y + (Math.random() - 0.5) * 26,
      });
      Body.setAngle(body, Math.random() * Math.PI);
      Body.setVelocity(body, { x: (Math.random() - 0.35) * 12, y: -Math.random() * 12 - 3 });
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.9);
      Composite.add(this.engine.world, body);
      this.snapSlots.add(meta.slot);
    }
  }

  private retireDebris() {
    for (const body of this.debrisBodies) {
      const meta = metaOf(body);
      if (!meta || meta.dead || meta.expiresAt === undefined) continue;
      if (this.clock >= meta.expiresAt) {
        meta.dead = true;
        Composite.remove(this.engine.world, body);
      }
    }
  }

  private checkHoops() {
    if (!this.plane) return;
    const { x, y } = this.plane.position;
    for (let i = 0; i < this.hoopState.length; i += 1) {
      const state = this.hoopState[i];
      if (state.passed) continue;
      const crossedRight = this.prevPlaneX < state.spec.x && x >= state.spec.x;
      const crossedLeft = this.prevPlaneX > state.spec.x && x <= state.spec.x;
      if (!crossedRight && !crossedLeft) continue;
      if (Math.abs(y - state.spec.y) <= state.spec.outerR - state.spec.thickness) {
        state.passed = true;
        this.callbacks.onHoopPass?.({ hoopIndex: i, x: state.spec.x, y: state.spec.y });
      }
    }
    this.prevPlaneX = x;
  }

  step(deltaMs: number, input: FlightInput = {}) {
    this.clock += deltaMs;
    if (this.plane) {
      this.prevPlanePos.x = this.plane.position.x;
      this.prevPlanePos.y = this.plane.position.y;
    }
    this.applyFlight(input);
    this.prevRoll = this.roll;
    // Roll toward the way the dart faces, quickly but not instantly.
    this.roll += Math.max(-0.14, Math.min(0.14, this.facing - this.roll));
    this.liftBalloons();
    Engine.update(this.engine, deltaMs);
    this.sweepBalloons();
    this.checkHoops();
    this.retireDebris();

    if (this.plane && !this.crushed) {
      if (this.plane.position.y > GROUND_Y - PHYSICS.planeRadius - 2) this.grounded = true;
      this.stillSteps = this.planeSpeed() < PHYSICS.settleSpeed ? this.stillSteps + 1 : 0;
      this.trail.unshift({ x: this.plane.position.x, y: this.plane.position.y });
      if (this.trail.length > TRAIL_LENGTH) this.trail.length = TRAIL_LENGTH;
    } else if (this.trail.length) {
      this.trail.pop();
    }

    this.prevPose.set(this.currPose);
    this.capturePose();
  }

  /** Record where every slot is after this step. */
  private capturePose() {
    const pose = this.currPose;
    for (let i = 0; i < this.slots.length; i += 1) {
      const slot = this.slots[i];
      const p = i * 3;
      if (slot.kind === 'trail') continue;

      if (slot.kind === 'plane') {
        if (this.plane) {
          pose[p] = this.plane.position.x;
          pose[p + 1] = this.plane.position.y;
          pose[p + 2] = this.crushed ? (this.facing >= 0 ? 0.42 : Math.PI - 0.42) : this.plane.angle;
        } else {
          pose[p] = PLANE_START_X;
          pose[p + 1] = PLANE_START_Y;
          pose[p + 2] = PHYSICS.launchAngle;
        }
      } else {
        const body = slot.kind === 'debris' ? this.debrisBodies[i - this.debrisStart] : this.bodies[i];
        const meta = body ? metaOf(body) : undefined;
        // A burst body stays where it died while it pops.
        if (!body || !meta || meta.dead) continue;
        pose[p] = body.position.x;
        pose[p + 1] = body.position.y;
        pose[p + 2] = slot.kind === 'balloon' ? this.balloonTilt(body) : body.angle;
      }

      if (this.snapSlots.has(i)) {
        this.prevPose[p] = pose[p];
        this.prevPose[p + 1] = pose[p + 1];
        this.prevPose[p + 2] = pose[p + 2];
      }
    }
    this.snapSlots.clear();
  }

  /** Lean the balloon so its string points at whatever it is tied to. */
  private balloonTilt(body: Matter.Body) {
    const tie = this.ties.find((t) => t.balloon === body);
    if (!tie) {
      // Loose: the string trails behind as it drifts.
      return Math.max(-0.5, Math.min(0.5, -body.velocity.x * 0.12));
    }
    const anchor = Constraint.pointAWorld(tie.constraint);
    return Math.atan2(-(anchor.x - body.position.x), anchor.y - body.position.y);
  }

  /**
   * True once the dart has come to rest on the grass or in the stacks.
   * A slow moment at the top of a climb is not a landing — crumpling there
   * kills the throw in mid-air.
   */
  isPlaneStopped() {
    if (!this.plane) return true;
    const stillInTheSky = !this.grounded && this.plane.position.y < GROUND_Y - 300;
    if (stillInTheSky) return false;
    return this.stillSteps > 28;
  }

  isSettled() {
    for (const body of Composite.allBodies(this.engine.world)) {
      if (body.isStatic) continue;
      const meta = metaOf(body);
      if (!meta || meta.dead || meta.kind === 'debris' || meta.kind === 'balloon') continue;
      if (Vector.magnitude(body.velocity) > PHYSICS.settleSpeed) return false;
    }
    return true;
  }

  isPlaneOutOfBounds() {
    if (!this.plane) return true;
    const { x, y } = this.plane.position;
    // Behind the throwing line the camera cannot follow, so a dart that loops
    // back off the left edge is done as soon as it leaves the screen.
    return y > GROUND_Y + 160 || x > this.level.worldWidth + 240 || x < -70;
  }

  /** Where the dart is drawn this frame, for the camera to follow. */
  get renderPlaneX() {
    return this.shownPlaneX;
  }

  get planeFrameOffset() {
    return this.planeSlot * STRIDE;
  }

  /** 1 upright, -1 rolled over, blended like the pose. */
  rollAt(alpha = 1) {
    const t = Math.max(0, Math.min(1, alpha));
    return this.prevRoll + (this.roll - this.prevRoll) * t;
  }

  private published: number[] | null = null;

  /**
   * The frame to send to the screen, or null when nothing but the dart has
   * moved since the last one. Most of a flight the stacks sit still, and
   * resending ~150 bodies every frame is what made the dart stutter on phones.
   */
  takeChangedFrame(frame: number[]): number[] | null {
    const last = this.published;
    const skipFrom = this.planeSlot * STRIDE;
    const skipTo = skipFrom + STRIDE;
    if (last && last.length === frame.length) {
      let changed = false;
      for (let i = 0; i < frame.length; i += 1) {
        if (i >= skipFrom && i < skipTo) continue;
        if (Math.abs(frame[i] - last[i]) > 0.02) {
          changed = true;
          break;
        }
      }
      if (!changed) return null;
    }
    const copy = frame.slice();
    this.published = copy;
    return copy;
  }

  /**
   * @param alpha How far the screen is between the last physics step and the
   * next one, 0..1. Drawing the blend is what keeps motion smooth on 120 Hz
   * phones, where most frames fall between steps.
   */
  buildFrame(alpha = 1): number[] {
    const frame = this.frames[this.frameToggle];
    this.frameToggle = this.frameToggle === 0 ? 1 : 0;
    const t = Math.max(0, Math.min(1, alpha));
    const prev = this.prevPose;
    const curr = this.currPose;

    for (let i = 0; i < this.slots.length; i += 1) {
      const slot = this.slots[i];
      const base = i * STRIDE;
      const p = i * 3;

      if (slot.kind === 'trail') {
        frame[base + 3] = 0;
        continue;
      }

      const x = prev[p] + (curr[p] - prev[p]) * t;
      const y = prev[p + 1] + (curr[p + 1] - prev[p + 1]) * t;
      const angle = wrapAngle(prev[p + 2] + wrapAngle(curr[p + 2] - prev[p + 2]) * t);

      if (slot.kind === 'plane') {
        const crushT = this.plane && this.crushed ? Math.min(1, (this.clock - this.crushAt) / 460) : 0;
        frame[base] = x;
        frame[base + 1] = y + crushT * 6;
        frame[base + 2] = angle;
        frame[base + 3] = 1;
        frame[base + 4] = this.plane && this.crushed ? 2 + crushT : this.isPowerDiving ? 1 : 0;
        this.shownPlaneX = x;
        continue;
      }

      const body = slot.kind === 'debris' ? this.debrisBodies[i - this.debrisStart] : this.bodies[i];
      const meta = body ? metaOf(body) : undefined;
      if (!body || !meta) {
        frame[base + 3] = 0;
        continue;
      }

      let opacity = 1;
      if (meta.dead) {
        // Debris just goes; smashed boxes and popped balloons burst first.
        const since = meta.diedAt === undefined ? Infinity : this.clock - meta.diedAt;
        if (slot.kind === 'debris' || since >= BURST_MS) {
          frame[base + 3] = 0;
          continue;
        }
        // Just under 1 tells the view it is bursting.
        opacity = Math.min(0.99, 1 - since / BURST_MS);
      } else if (slot.kind === 'debris' && meta.expiresAt !== undefined) {
        opacity = Math.max(0, Math.min(1, (meta.expiresAt - this.clock) / DEBRIS_FADE_MS));
      }

      frame[base] = x;
      frame[base + 1] = y;
      frame[base + 2] = angle;
      frame[base + 3] = opacity;
      frame[base + 4] =
        slot.kind === 'debris'
          ? meta.debrisColor
          : 1 - Math.max(0, Math.min(1, meta.hp / meta.maxHp));
    }

    return frame;
  }
}
