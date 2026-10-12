import { TextStyle } from 'react-native';

/**
 * The whole game is simulated in fixed "world units" and then scaled to whatever
 * screen it lands on, so a throw behaves identically on a phone and in a browser.
 */
export const WORLD_HEIGHT = 900;
export const GROUND_Y = 782;

export const PLANE_START_X = 160;
export const PLANE_START_Y = 322;

/**
 * Matter normalises acceleration by the step size, so `gravityY * 1000` is the
 * real acceleration in world units per second squared.
 */
export const PHYSICS = {
  gravityY: 0.7,
  fixedStep: 1000 / 60,
  maxStepsPerFrame: 3,

  planeRadius: 14,
  /** Drawn nose-to-tail length of the dart in world units. */
  planeDrawLength: 92,
  planeDensity: 0.0075,
  planeAirFriction: 0.0034,

  launchSpeed: 9.4,
  launchAngle: -0.05,

  /**
   * Flight is modelled by steering the flight path rather than by summing
   * aerodynamic forces. Hold lifts the nose; pull down to dive. Gravity still
   * runs the economy: climb spends speed, a dive pays it back.
   */
  climbAngle: -0.62,
  /** Nose-up a quick tap asks for. The climb steepens to climbAngle as the hold goes on. */
  climbStartAngle: -0.2,
  /** Steps of holding to build from the gentle start to the full climb. */
  climbBuildSteps: 34,
  /** Upward speed a press adds straight away, spread over tapLiftSteps. */
  tapLift: 2.2,
  tapLiftSteps: 6,
  glideAngle: 0.19,
  diveAngle: 0.58,
  /** Radians of path change per step while the finger is held (before speed scaling). */
  climbTurnRate: 0.11,
  /** Extra upward kick each step while climbing, on top of pointing the nose up. */
  climbLift: 0.03,
  /** Hold this long (ms) before the dart loops over the top and flies back. */
  loopAfterMs: 800,
  /** Loop size in world units. Much smaller than the ~92-long dart reads as a spin. */
  loopMinRadius: 62,
  loopMaxRadius: 115,
  /** The top of a loop stays below this world y. */
  loopTopY: 140,
  /** A loop under way keeps at least this much speed so it makes it over the top. */
  loopMinSpeed: 7,
  /** Steps to ease from the climb into the full loop turn. */
  loopRampSteps: 10,
  /** Below this the wing stops flying and the nose drops. */
  stallSpeed: 4,
  /** Hands-off cruising speed. Faster pitches up, slower pitches down. */
  trimSpeed: 9.4,
  /** Radians of nose-up per unit of speed over trim. */
  trimGain: 0.07,
  /** How briskly a hands-off dart pulls out of a dive toward its trim. */
  trimTurnRate: 0.06,
  /** The steepest a hands-off dart will climb when trading speed for height. */
  trimMaxClimb: -0.42,
  /** World y the dart is steered back under, so it never leaves the top of the screen. */
  ceilingY: 70,
  powerDiveAngle: 0.88,
  /** Radians of flight-path change per step at the reference speed. */
  turnRate: 0.028,
  turnRefSpeed: 13,
  maxTurnBoost: 1.6,

  powerDiveSteps: 46,
  powerDiveMass: 2.6,
  powerDiveSpeed: 1.25,

  /** Below this speed for long enough, the world is considered settled. */
  settleSpeed: 0.5,
} as const;

/** Velocity gravity adds in a single fixed step. */
export const GRAVITY_PER_STEP = PHYSICS.gravityY * 0.001 * PHYSICS.fixedStep ** 2;

export const RUN = {
  throws: 3,
  maxThrows: 5,
  comboWindowMs: 1250,
  maxCombo: 8,
  chargeMax: 100,
  chargePerDamage: 0.5,
  hoopCharge: 18,
} as const;

export type MaterialKey = 'cardboard' | 'glass' | 'wood' | 'brick';

export type Material = {
  key: MaterialKey;
  label: string;
  hp: number;
  density: number;
  restitution: number;
  friction: number;
  /** Impact impulse below this is shrugged off entirely. */
  damageThreshold: number;
  fill: string;
  edge: string;
  shard: string;
  score: number;
};

export const MATERIALS: Record<MaterialKey, Material> = {
  cardboard: {
    key: 'cardboard',
    label: 'Cardboard box',
    hp: 13,
    density: 0.0007,
    restitution: 0.04,
    friction: 0.6,
    damageThreshold: 0.9,
    fill: '#B4794A',
    edge: '#D9A472',
    shard: '#E0B183',
    score: 50,
  },
  glass: {
    key: 'glass',
    label: 'Glass bottle',
    hp: 18,
    density: 0.0011,
    restitution: 0.06,
    friction: 0.3,
    damageThreshold: 1,
    fill: 'rgba(150, 214, 205, 0.55)',
    edge: 'rgba(220, 255, 250, 0.8)',
    shard: '#9EE3DA',
    score: 90,
  },
  wood: {
    key: 'wood',
    label: 'Wooden crate',
    hp: 52,
    density: 0.0019,
    restitution: 0.05,
    friction: 0.66,
    damageThreshold: 1.6,
    fill: '#8A5C31',
    edge: '#C08A50',
    shard: '#C08A50',
    score: 120,
  },
  brick: {
    key: 'brick',
    label: 'Brick',
    hp: 120,
    density: 0.0042,
    restitution: 0.02,
    friction: 0.88,
    damageThreshold: 2.4,
    fill: '#8E4436',
    edge: '#C0705C',
    shard: '#C0705C',
    score: 170,
  },
};

/** Balloons pop on contact, the way they should. */
export const BALLOON = {
  radius: 20,
  hp: 4,
  density: 0.0004,
  restitution: 0.4,
  friction: 0.2,
  damageThreshold: 0.25,
  score: 800,
  colors: ['#E0605A', '#F2B33D', '#5FB6E0', '#9A6FE0', '#D96FA8'],
} as const;

export const SCORING = {
  hoopPass: 400,
  throwUnused: 1200,
  clearBonus: 1800,
  powerDiveBonus: 250,
} as const;

export const PALETTE = {
  skyTop: '#1B2645',
  skyHigh: '#3A4574',
  skyMid: '#7C5A82',
  skyLow: '#D97E58',
  horizon: '#F2B472',
  sun: '#FFD79A',

  grass: '#355A32',
  grassDark: '#243E1C',
  grassEdge: '#6A8F4A',
  fence: '#7A5A3A',
  fenceDark: '#4E3A24',

  paper: '#FDF7EC',
  paperFold: '#D6C9B4',

  /** Biro on the page. Menus live here. */
  page: '#EFE3CB',
  pageShadow: '#E0CFAE',
  scrap: '#F7EEDC',
  rule: 'rgba(62, 108, 168, 0.32)',
  margin: 'rgba(188, 62, 54, 0.5)',
  biro: '#1E2A44',
  biroSoft: '#5C5348',
  tape: '#D7C08A',
  sticky: '#F0CE3A',

  text: '#F0E2D0',
  textMuted: '#A89480',
  panel: '#F7EEDC',
  panelEdge: 'rgba(40, 32, 24, 0.2)',

  sky: '#4E8FBF',
  warm: '#E0A12A',
  coin: '#C98A22',
  green: '#3F7A48',
  danger: '#C44A42',
} as const;

/** Soft ink on the dusk garden HUD. */
export const INK: TextStyle = {
  color: PALETTE.text,
  textShadowColor: 'rgba(40, 24, 18, 0.28)',
  textShadowOffset: { width: 0, height: 0.5 },
  textShadowRadius: 1.2,
};

/** Small HUD labels. Light enough to read on the green yard, with a shadow to lift them. */
export const INK_MUTED: TextStyle = {
  color: 'rgba(250, 246, 236, 0.82)',
  textShadowColor: 'rgba(12, 30, 14, 0.55)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
};

/** Ballpoint on cream paper. */
export const BIRO: TextStyle = {
  color: PALETTE.biro,
};

export const BIRO_SOFT: TextStyle = {
  color: PALETTE.biroSoft,
};

Object.assign(PALETTE as unknown as Record<string, string>, {
  grass: '#2F8A3A',
  grassDark: '#1C5C28',
  grassEdge: '#8ED45A',
});
