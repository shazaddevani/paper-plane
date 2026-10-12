/**
 * Everything you can unlock is a real thing you could pick up and fold, or a
 * real change you could make to a paper plane. Nothing invented.
 */

import { createRng } from './rng';

export type FoldKind = 'dart' | 'glider' | 'arrow' | 'wide' | 'bulldog' | 'delta';

export type PaperPattern = 'none' | 'ruled' | 'grid' | 'stripes';

export type FoldPower = {
  name: string;
  detail: string;
};

export type FoldFlight = {
  densityScale: number;
  turnScale: number;
  speedScale: number;
  climbScale: number;
  /** Bigger = the loop-back starts sooner and turns harder. */
  loopScale: number;
  /** 1 is normal gravity. Below 1 the sheet floats; above 1 it drops. */
  gravityScale: number;
  airFrictionScale: number;
  damageScale: number;
  restitution: number;
  radiusScale: number;
  /** 1 is a gentle sink on release. Lower stays flatter. */
  glideScale: number;
  diveScale: number;
  hoopScoreScale: number;
  chargeScale: number;
  extraThrows: number;
  /** Keeps speed after punching cardboard or glass. */
  pierce: boolean;
  /** Extra wrecking force against stacks. */
  smash: boolean;
};

export type PaperSkin = {
  id: string;
  name: string;
  blurb: string;
  price: number;
  levelRequired: number;
  sheet: string;
  fold: string;
  crease: string;
  foldKind: FoldKind;
  pattern: PaperPattern;
  stripe?: string;
  /** Generated each level in the workshop. The shelf never runs out. */
  workshop?: boolean;
  power: FoldPower;
  flight: FoldFlight;
};

export type StreamerSkin = {
  id: string;
  name: string;
  blurb: string;
  price: number;
  levelRequired: number;
  color: string;
  /** Extra colours woven through the tail. Empty means a single ribbon. */
  stripes: string[];
  /** False = nothing taped on. */
  taped: boolean;
  wave: 'soft' | 'curl' | 'wild';
};

export type UpgradeEffect = {
  densityScale?: number;
  turnScale?: number;
  damageScale?: number;
  extraThrows?: number;
};

export type Upgrade = {
  id: string;
  name: string;
  blurb: string;
  price: number;
  levelRequired: number;
  effect: UpgradeEffect;
};

function tune(power: FoldPower, patch: Partial<FoldFlight> = {}): { power: FoldPower; flight: FoldFlight } {
  return {
    power,
    flight: {
      densityScale: 1,
      turnScale: 1,
      speedScale: 1,
      climbScale: 1,
      loopScale: 1,
      gravityScale: 1,
      airFrictionScale: 1,
      damageScale: 1,
      restitution: 0.22,
      radiusScale: 1,
      glideScale: 1,
      diveScale: 1,
      hoopScoreScale: 1,
      chargeScale: 1,
      extraThrows: 0,
      pierce: false,
      smash: false,
      ...patch,
    },
  };
}

export const PAPERS: PaperSkin[] = [
  {
    id: 'paper-notebook',
    name: 'Classic Dart',
    blurb: 'Torn out of a spiral pad and folded the way everybody learns first.',
    price: 0,
    levelRequired: 1,
    sheet: '#FDF7EC',
    fold: '#DFD4C2',
    crease: '#B9AB95',
    foldKind: 'dart',
    pattern: 'ruled',
    ...tune(
      { name: 'Textbook', detail: 'Balanced throw. The yard plays the way it was written.' },
    ),
  },
  {
    id: 'paper-graph',
    name: 'School Glider',
    blurb: 'Wide wings on graph paper. Floats, turns lazily, loves a long hold.',
    price: 320,
    levelRequired: 2,
    sheet: '#F4F8F2',
    fold: '#D2E0D6',
    crease: '#8FB49B',
    foldKind: 'glider',
    pattern: 'grid',
    ...tune(
      { name: 'Float', detail: 'Barely sinks. Hold and it hangs in the air.' },
      {
        densityScale: 0.68,
        turnScale: 1.28,
        speedScale: 0.74,
        climbScale: 1.7,
        loopScale: 0.78,
        gravityScale: 0.46,
        airFrictionScale: 1.45,
        damageScale: 0.58,
        glideScale: 0.28,
        diveScale: 0.75,
      },
    ),
  },
  {
    id: 'paper-kraft',
    name: 'Arrow Dart',
    blurb: 'Cut off a grocery bag and folded skinny. Fast, pointy, snaps around.',
    price: 640,
    levelRequired: 3,
    sheet: '#D6A874',
    fold: '#B4854F',
    crease: '#8A5F31',
    foldKind: 'arrow',
    pattern: 'none',
    ...tune(
      { name: 'Pierce', detail: 'Punches cardboard and glass and keeps its speed.' },
      {
        densityScale: 0.92,
        turnScale: 0.9,
        speedScale: 1.42,
        climbScale: 0.62,
        loopScale: 1.4,
        gravityScale: 1.08,
        airFrictionScale: 0.48,
        damageScale: 1.35,
        glideScale: 1.15,
        diveScale: 1.2,
        pierce: true,
      },
    ),
  },
  {
    id: 'paper-index',
    name: 'Bulldog Dart',
    blurb: 'An index card, folded short and thick. Hits like a thrown book.',
    price: 780,
    levelRequired: 4,
    sheet: '#F3E6C8',
    fold: '#D9C49A',
    crease: '#A89068',
    foldKind: 'bulldog',
    pattern: 'none',
    ...tune(
      { name: 'Smash', detail: 'Wrecks crates. Heavy, and it drops like a brick.' },
      {
        densityScale: 1.9,
        turnScale: 0.78,
        speedScale: 0.9,
        climbScale: 0.55,
        loopScale: 0.7,
        gravityScale: 1.35,
        airFrictionScale: 1.15,
        damageScale: 2.2,
        glideScale: 1.85,
        diveScale: 1.35,
        smash: true,
      },
    ),
  },
  {
    id: 'paper-newsprint',
    name: 'Wide Wing',
    blurb: "Yesterday's sport section. Soft folds and a lot of wing.",
    price: 980,
    levelRequired: 5,
    sheet: '#E8E4D8',
    fold: '#C4BFB0',
    crease: '#6E6A5E',
    foldKind: 'wide',
    pattern: 'ruled',
    ...tune(
      { name: 'Lift', detail: 'Hold and the nose rockets up. Slow, floaty, huge turns.' },
      {
        densityScale: 0.72,
        turnScale: 1.45,
        speedScale: 0.78,
        climbScale: 2.05,
        loopScale: 0.68,
        gravityScale: 0.58,
        airFrictionScale: 1.35,
        damageScale: 0.62,
        glideScale: 0.35,
        diveScale: 0.7,
      },
    ),
  },
  {
    id: 'paper-stealth',
    name: 'Stealth',
    blurb: 'Black construction paper in a delta fold. Hard to see, easy to throw.',
    price: 1350,
    levelRequired: 6,
    sheet: '#3A3A42',
    fold: '#2A2A32',
    crease: '#1A1A22',
    foldKind: 'delta',
    pattern: 'none',
    ...tune(
      { name: 'Slip', detail: 'Skinny hitbox. Slides through gaps other folds clip.' },
      {
        densityScale: 0.88,
        turnScale: 1.32,
        speedScale: 1.22,
        climbScale: 1.08,
        loopScale: 1.18,
        gravityScale: 0.92,
        airFrictionScale: 0.42,
        damageScale: 0.88,
        radiusScale: 0.58,
        glideScale: 0.85,
      },
    ),
  },
  {
    id: 'paper-foil',
    name: 'Foil Dart',
    blurb: 'Kitchen foil. Shiny, loud, and it holds a crease forever.',
    price: 1500,
    levelRequired: 7,
    sheet: '#E8EEF4',
    fold: '#B8C4D2',
    crease: '#7A8798',
    foldKind: 'dart',
    pattern: 'none',
    ...tune(
      { name: 'Rebound', detail: 'Bounces off stacks and keeps flying.' },
      {
        densityScale: 1.2,
        turnScale: 0.88,
        speedScale: 1.16,
        climbScale: 0.78,
        loopScale: 1.08,
        gravityScale: 1.1,
        airFrictionScale: 0.7,
        damageScale: 1.2,
        restitution: 0.86,
        glideScale: 1.1,
        diveScale: 1.15,
      },
    ),
  },
  {
    id: 'paper-wrapping',
    name: 'Party Glider',
    blurb: 'Left over from a birthday. Same wide fold, purely for show — until the hoops.',
    price: 2200,
    levelRequired: 9,
    sheet: '#F6C6D8',
    fold: '#D98FB0',
    crease: '#A8607F',
    foldKind: 'glider',
    pattern: 'stripes',
    stripe: '#F2B33D',
    ...tune(
      { name: 'Showboat', detail: 'Hoops pay double. The dive meter fills faster.' },
      {
        densityScale: 0.8,
        turnScale: 1.2,
        speedScale: 0.86,
        climbScale: 1.45,
        loopScale: 0.84,
        gravityScale: 0.66,
        airFrictionScale: 1.2,
        damageScale: 0.72,
        glideScale: 0.4,
        hoopScoreScale: 2.2,
        chargeScale: 1.75,
      },
    ),
  },
  {
    id: 'paper-legal',
    name: 'Legal Pad',
    blurb: 'Torn off a yellow pad. Long, ruled, and it wants to fly straight.',
    price: 280,
    levelRequired: 2,
    sheet: '#F3E27A',
    fold: '#D4C056',
    crease: '#9A8A28',
    foldKind: 'dart',
    pattern: 'ruled',
    ...tune(
      { name: 'Ruler', detail: 'Tracks dead straight. Gentle climb, honest glide.' },
      { turnScale: 0.82, climbScale: 0.9, glideScale: 0.7, speedScale: 1.08 },
    ),
  },
  {
    id: 'paper-postit',
    name: 'Yellow Post-it',
    blurb: 'Peeled off a monitor. Tiny, sticky, and it turns on a thought.',
    price: 420,
    levelRequired: 3,
    sheet: '#FFE56A',
    fold: '#E0C84A',
    crease: '#B89A22',
    foldKind: 'bulldog',
    pattern: 'none',
    ...tune(
      { name: 'Flick', detail: 'Snaps into a climb. Short throw, sharp turns.' },
      {
        densityScale: 0.7,
        turnScale: 1.55,
        speedScale: 0.82,
        climbScale: 1.5,
        loopScale: 1.25,
        gravityScale: 0.8,
        radiusScale: 0.78,
      },
    ),
  },
  {
    id: 'paper-receipt',
    name: 'Till Receipt',
    blurb: 'Thermal paper from a corner shop. Light, noisy, disappears in a dive.',
    price: 510,
    levelRequired: 3,
    sheet: '#F4EFE4',
    fold: '#D8D0C0',
    crease: '#8A8274',
    foldKind: 'arrow',
    pattern: 'none',
    ...tune(
      { name: 'Zip', detail: 'Launches fast and cuts the air. Poor at hanging around.' },
      {
        densityScale: 0.62,
        speedScale: 1.38,
        climbScale: 0.7,
        loopScale: 1.32,
        airFrictionScale: 0.5,
        gravityScale: 1.12,
        damageScale: 0.75,
      },
    ),
  },
  {
    id: 'paper-manila',
    name: 'Manila Envelope',
    blurb: 'Office stationery with a hard crease. Built to go through a stack.',
    price: 860,
    levelRequired: 4,
    sheet: '#E8C98A',
    fold: '#C9A66A',
    crease: '#8E7040',
    foldKind: 'arrow',
    pattern: 'none',
    ...tune(
      { name: 'Spike', detail: 'A cheap pierce. Cardboard does not slow it much.' },
      {
        densityScale: 1.15,
        speedScale: 1.2,
        climbScale: 0.72,
        damageScale: 1.45,
        pierce: true,
        glideScale: 1.12,
      },
    ),
  },
  {
    id: 'paper-construction',
    name: 'Red Construction',
    blurb: 'School-cupboard card. Heavy colour, heavy hit.',
    price: 920,
    levelRequired: 4,
    sheet: '#C44A42',
    fold: '#9A322C',
    crease: '#6A201C',
    foldKind: 'bulldog',
    pattern: 'none',
    ...tune(
      { name: 'Thump', detail: 'Softer than the bulldog, still a crate problem.' },
      {
        densityScale: 1.55,
        speedScale: 0.94,
        climbScale: 0.7,
        gravityScale: 1.18,
        damageScale: 1.7,
        smash: true,
        glideScale: 1.4,
      },
    ),
  },
  {
    id: 'paper-napkin',
    name: 'Cafe Napkin',
    blurb: 'Stolen from a table. Soft as nothing and it will not dive on purpose.',
    price: 1100,
    levelRequired: 5,
    sheet: '#FFF8F0',
    fold: '#E8DCCE',
    crease: '#C4B4A4',
    foldKind: 'glider',
    pattern: 'none',
    ...tune(
      { name: 'Feather', detail: 'Almost no weight. Climb forever, hit like a sigh.' },
      {
        densityScale: 0.52,
        turnScale: 1.4,
        speedScale: 0.68,
        climbScale: 1.85,
        gravityScale: 0.38,
        airFrictionScale: 1.6,
        damageScale: 0.42,
        glideScale: 0.2,
        diveScale: 0.55,
      },
    ),
  },
  {
    id: 'paper-origami',
    name: 'Kami Sheet',
    blurb: 'A square of origami paper. Thin, bright, and it wants the sky.',
    price: 1280,
    levelRequired: 6,
    sheet: '#E0605A',
    fold: '#F4EFE4',
    crease: '#8A3230',
    foldKind: 'wide',
    pattern: 'none',
    ...tune(
      { name: 'Kite', detail: 'Hold and it goes up like it has somewhere to be.' },
      {
        densityScale: 0.7,
        turnScale: 1.38,
        speedScale: 0.84,
        climbScale: 2.15,
        loopScale: 0.8,
        gravityScale: 0.52,
        glideScale: 0.3,
        damageScale: 0.68,
      },
    ),
  },
  {
    id: 'paper-magazine',
    name: 'Magazine Page',
    blurb: 'Glossy, inked, and it ricochets off a bottle like it meant to.',
    price: 1440,
    levelRequired: 6,
    sheet: '#5FB6E0',
    fold: '#3A8FB8',
    crease: '#246078',
    foldKind: 'delta',
    pattern: 'stripes',
    stripe: '#F2B33D',
    ...tune(
      { name: 'Glance', detail: 'Bouncy gloss. Stacks send it on instead of stopping it.' },
      {
        densityScale: 1.08,
        speedScale: 1.14,
        climbScale: 0.88,
        restitution: 0.72,
        damageScale: 1.1,
        airFrictionScale: 0.75,
      },
    ),
  },
  {
    id: 'paper-parchment',
    name: 'Baking Parchment',
    blurb: 'Cut from a roll. Greaseproof, whisper-thin, hates the ground.',
    price: 1620,
    levelRequired: 7,
    sheet: '#F7F1DC',
    fold: '#E4D8B8',
    crease: '#B8A878',
    foldKind: 'glider',
    pattern: 'none',
    ...tune(
      { name: 'Hang', detail: 'Glides flat for ages. A dive has to be asked for twice.' },
      {
        densityScale: 0.6,
        turnScale: 1.22,
        speedScale: 0.8,
        climbScale: 1.35,
        gravityScale: 0.42,
        airFrictionScale: 1.25,
        glideScale: 0.18,
        diveScale: 0.62,
        damageScale: 0.55,
      },
    ),
  },
  {
    id: 'paper-blueprint',
    name: 'Blueprint',
    blurb: 'Cyanotype paper from a drawer. Folds on the grid and turns precisely.',
    price: 1750,
    levelRequired: 7,
    sheet: '#3A6FA0',
    fold: '#2A557C',
    crease: '#1A3348',
    foldKind: 'dart',
    pattern: 'grid',
    ...tune(
      { name: 'Draft', detail: 'Sharp steering. The line you ask for is the line you get.' },
      {
        turnScale: 1.48,
        climbScale: 1.15,
        loopScale: 1.2,
        speedScale: 1.04,
        glideScale: 0.75,
      },
    ),
  },
  {
    id: 'paper-map',
    name: 'Road Map',
    blurb: 'An old A-to-Z page. Huge wings and a habit of climbing over the houses.',
    price: 1980,
    levelRequired: 8,
    sheet: '#D7E4C8',
    fold: '#A8C090',
    crease: '#6A8A52',
    foldKind: 'wide',
    pattern: 'grid',
    ...tune(
      { name: 'Overfly', detail: 'Wide and floaty. Best for balloons you would otherwise undershoot.' },
      {
        densityScale: 0.74,
        turnScale: 1.3,
        speedScale: 0.8,
        climbScale: 1.9,
        gravityScale: 0.55,
        glideScale: 0.32,
        damageScale: 0.7,
      },
    ),
  },
  {
    id: 'paper-postcard',
    name: 'Postcard',
    blurb: 'A seaside card, folded once. Stiff, short, and it arrives with a bang.',
    price: 2100,
    levelRequired: 8,
    sheet: '#F0D2B4',
    fold: '#D8B48C',
    crease: '#A07850',
    foldKind: 'bulldog',
    pattern: 'stripes',
    stripe: '#5FB6E0',
    ...tune(
      { name: 'Stamp', detail: 'Stubby and dense. Wood notices.' },
      {
        densityScale: 1.7,
        speedScale: 0.98,
        climbScale: 0.68,
        gravityScale: 1.22,
        damageScale: 1.9,
        smash: true,
        loopScale: 0.8,
      },
    ),
  },
  {
    id: 'paper-junkmail',
    name: 'Junk Mail',
    blurb: 'A pizza leaflet. Ugly, proud, and the hoops treat it like a parade.',
    price: 2400,
    levelRequired: 10,
    sheet: '#F6A12E',
    fold: '#D48418',
    crease: '#8A5410',
    foldKind: 'dart',
    pattern: 'stripes',
    stripe: '#C44A42',
    ...tune(
      { name: 'Flyer', detail: 'Hoops and the meter both like the attention.' },
      {
        hoopScoreScale: 1.85,
        chargeScale: 1.5,
        speedScale: 1.06,
        climbScale: 1.1,
        gravityScale: 0.9,
      },
    ),
  },
];

export const STREAMERS: StreamerSkin[] = [
  {
    id: 'streamer-none',
    name: 'No Streamer',
    blurb: 'Nothing taped on. Cleanest flight there is.',
    price: 0,
    levelRequired: 1,
    color: 'rgba(255, 246, 234, 0.5)',
    stripes: [],
    taped: false,
    wave: 'soft',
  },
  {
    id: 'streamer-red',
    name: 'Red Ribbon',
    blurb: 'A hand of ribbon off a present, taped to the tail.',
    price: 0,
    levelRequired: 1,
    color: '#E0605A',
    stripes: [],
    taped: true,
    wave: 'soft',
  },
  {
    id: 'streamer-yarn',
    name: 'Blue Yarn',
    blurb: 'Pulled off a jumper. Easy to follow against the sky.',
    price: 180,
    levelRequired: 1,
    color: '#5FB6E0',
    stripes: [],
    taped: true,
    wave: 'soft',
  },
  {
    id: 'streamer-pink',
    name: 'Birthday Crepe',
    blurb: 'Leftover from a party bag. Flutters like mad.',
    price: 240,
    levelRequired: 2,
    color: '#D96FA8',
    stripes: [],
    taped: true,
    wave: 'wild',
  },
  {
    id: 'streamer-curling',
    name: 'Curling Ribbon',
    blurb: 'Run over a scissor blade until it springs.',
    price: 320,
    levelRequired: 2,
    color: '#F2B33D',
    stripes: [],
    taped: true,
    wave: 'curl',
  },
  {
    id: 'streamer-party',
    name: 'Party Streamer',
    blurb: 'Crepe paper, torn to length. Three colours at once.',
    price: 480,
    levelRequired: 3,
    color: '#7FC96B',
    stripes: ['#7FC96B', '#D96FA8', '#F2B33D'],
    taped: true,
    wave: 'wild',
  },
  {
    id: 'streamer-twine',
    name: 'Garden Twine',
    blurb: 'Off the ball by the shed. Reads against a bright sky.',
    price: 400,
    levelRequired: 3,
    color: '#C4A05A',
    stripes: ['#C4A05A', '#6A4A28'],
    taped: true,
    wave: 'soft',
  },
  {
    id: 'streamer-foil',
    name: 'Foil Strip',
    blurb: 'A snip of wrapping foil. Catches whatever light is left.',
    price: 640,
    levelRequired: 4,
    color: '#D8DEE8',
    stripes: ['#D8DEE8', '#F4EFE4'],
    taped: true,
    wave: 'curl',
  },
];

export const UPGRADES: Upgrade[] = [
  {
    id: 'upgrade-cardstock',
    name: 'Cardstock',
    blurb: 'Folded from card instead of paper. Hits much harder, sinks quicker.',
    price: 900,
    levelRequired: 3,
    effect: { densityScale: 1.65, turnScale: 0.88 },
  },
  {
    id: 'upgrade-tissue',
    name: 'Tissue Paper',
    blurb: 'Barely there. Turns on a coin, but it lands soft.',
    price: 1150,
    levelRequired: 4,
    effect: { densityScale: 0.72, turnScale: 1.28, damageScale: 0.8 },
  },
  {
    id: 'upgrade-paperclip',
    name: 'Paperclip Nose',
    blurb: 'One paperclip bent over the nose. Goes through wood and brick.',
    price: 1400,
    levelRequired: 6,
    effect: { damageScale: 1.55 },
  },
  {
    id: 'upgrade-spare',
    name: 'Spare Sheet',
    blurb: 'Keep a folded spare in your back pocket. One extra plane a level.',
    price: 1900,
    levelRequired: 8,
    effect: { extraThrows: 1 },
  },
];

export const DEFAULT_PAPER = PAPERS[0].id;
export const DEFAULT_STREAMER = 'streamer-red';

export const SCRAPS_PER_LEVEL = 3;
const WORKSHOP_LOOKAHEAD = 2;
const WORKSHOP_WINDOW = 16;
const WORKSHOP_BOX_LEVELS = 80;

type StockSheet = {
  name: string;
  sheet: string;
  fold: string;
  crease: string;
  pattern: PaperPattern;
  stripe?: string;
};

const WORKSHOP_SHEETS: StockSheet[] = [
  { name: 'Notebook', sheet: '#FDF7EC', fold: '#DFD4C2', crease: '#B9AB95', pattern: 'ruled' },
  { name: 'Graph', sheet: '#F4F8F2', fold: '#D2E0D6', crease: '#8FB49B', pattern: 'grid' },
  { name: 'Kraft', sheet: '#D6A874', fold: '#B4854F', crease: '#8A5F31', pattern: 'none' },
  { name: 'Newsprint', sheet: '#E8E4D8', fold: '#C4BFB0', crease: '#6E6A5E', pattern: 'ruled' },
  { name: 'Manila', sheet: '#E8C98A', fold: '#C9A66A', crease: '#8E7040', pattern: 'none' },
  { name: 'Post-it', sheet: '#FFE56A', fold: '#E0C84A', crease: '#B89A22', pattern: 'none' },
  { name: 'Receipt', sheet: '#F4EFE4', fold: '#D8D0C0', crease: '#8A8274', pattern: 'none' },
  { name: 'Legal', sheet: '#F3E27A', fold: '#D4C056', crease: '#9A8A28', pattern: 'ruled' },
  { name: 'Pink note', sheet: '#F6C6D8', fold: '#D98FB0', crease: '#A8607F', pattern: 'none' },
  { name: 'Sky note', sheet: '#C8E4F6', fold: '#9EC8E0', crease: '#5A8AA8', pattern: 'none' },
  { name: 'Mint note', sheet: '#C8E8C0', fold: '#98C890', crease: '#5A8A52', pattern: 'none' },
  { name: 'Envelope', sheet: '#F7F1DC', fold: '#E4D8B8', crease: '#B8A878', pattern: 'none' },
  { name: 'Magazine', sheet: '#5FB6E0', fold: '#3A8FB8', crease: '#246078', pattern: 'stripes', stripe: '#F2B33D' },
  { name: 'Construction', sheet: '#C44A42', fold: '#9A322C', crease: '#6A201C', pattern: 'none' },
  { name: 'Kami', sheet: '#E0605A', fold: '#F4EFE4', crease: '#8A3230', pattern: 'none' },
  { name: 'Blueprint', sheet: '#3A6FA0', fold: '#2A557C', crease: '#1A3348', pattern: 'grid' },
  { name: 'Map', sheet: '#D7E4C8', fold: '#A8C090', crease: '#6A8A52', pattern: 'grid' },
  { name: 'Foil scrap', sheet: '#E8EEF4', fold: '#B8C4D2', crease: '#7A8798', pattern: 'none' },
  { name: 'Napkin', sheet: '#FFF8F0', fold: '#E8DCCE', crease: '#C4B4A4', pattern: 'none' },
  { name: 'Junk mail', sheet: '#F6A12E', fold: '#D48418', crease: '#8A5410', pattern: 'stripes', stripe: '#C44A42' },
];

const WORKSHOP_FOLDS: { kind: FoldKind; label: string }[] = [
  { kind: 'dart', label: 'Dart' },
  { kind: 'glider', label: 'Glider' },
  { kind: 'arrow', label: 'Arrow' },
  { kind: 'wide', label: 'Wing' },
  { kind: 'bulldog', label: 'Bulldog' },
  { kind: 'delta', label: 'Delta' },
];

const WORKSHOP_NICKS = ['', 'Soft', 'Tight', 'Crooked', 'Fat', 'Skinny', 'Lucky', 'Sunday', 'Rainy', 'Spare'];

const WORKSHOP_KITS: { power: FoldPower; patch: Partial<FoldFlight> }[] = [
  { power: { name: 'Textbook', detail: 'A plain workshop throw. Nothing fancy.' }, patch: {} },
  {
    power: { name: 'Float', detail: 'Hangs in the air. Climb is cheap.' },
    patch: { gravityScale: 0.48, climbScale: 1.6, speedScale: 0.76, damageScale: 0.6, glideScale: 0.3 },
  },
  {
    power: { name: 'Pierce', detail: 'Punches cardboard and keeps going.' },
    patch: { pierce: true, speedScale: 1.32, damageScale: 1.3, airFrictionScale: 0.55, climbScale: 0.7 },
  },
  {
    power: { name: 'Smash', detail: 'Wrecks crates. Heavy in the hand.' },
    patch: { smash: true, densityScale: 1.7, damageScale: 1.95, gravityScale: 1.25, climbScale: 0.62 },
  },
  {
    power: { name: 'Lift', detail: 'Hold and the nose goes hunting the clouds.' },
    patch: { climbScale: 2.0, gravityScale: 0.55, turnScale: 1.35, speedScale: 0.8 },
  },
  {
    power: { name: 'Slip', detail: 'Skinny. Slides through gaps.' },
    patch: { radiusScale: 0.58, airFrictionScale: 0.45, speedScale: 1.18, turnScale: 1.28 },
  },
  {
    power: { name: 'Rebound', detail: 'Bounces off a stack and stays in the air.' },
    patch: { restitution: 0.84, speedScale: 1.12, densityScale: 1.12 },
  },
  {
    power: { name: 'Showboat', detail: 'Hoops pay extra. The meter likes it too.' },
    patch: { hoopScoreScale: 1.9, chargeScale: 1.55, gravityScale: 0.75 },
  },
  {
    power: { name: 'Feather', detail: 'Almost no weight. Hits like a sigh.' },
    patch: { densityScale: 0.5, gravityScale: 0.4, damageScale: 0.45, climbScale: 1.7, speedScale: 0.7 },
  },
  {
    power: { name: 'Zip', detail: 'Leaves the hand fast and hates hanging around.' },
    patch: { speedScale: 1.4, airFrictionScale: 0.5, loopScale: 1.3, climbScale: 0.72 },
  },
  {
    power: { name: 'Needle', detail: 'A tight fold. Turns on a coin.' },
    patch: { turnScale: 1.55, radiusScale: 0.7, loopScale: 1.22, speedScale: 1.06 },
  },
  {
    power: { name: 'Anvil', detail: 'Drops hard. Wood pays attention.' },
    patch: { smash: true, densityScale: 1.85, gravityScale: 1.32, damageScale: 2.05, glideScale: 1.7 },
  },
];

export function scrapId(level: number, slot: number): string {
  return `scrap-${level}-${slot}`;
}

function parseScrapId(id: string): { level: number; slot: number } | null {
  const match = /^scrap-(\d+)-(\d+)$/.exec(id);
  if (!match) return null;
  const level = Number(match[1]);
  const slot = Number(match[2]);
  if (!Number.isFinite(level) || !Number.isFinite(slot) || level < 1 || slot < 0 || slot >= SCRAPS_PER_LEVEL) {
    return null;
  }
  return { level, slot };
}

function jitter(rng: ReturnType<typeof createRng>, value: number, amount: number) {
  return value * (1 + (rng.next() - 0.5) * amount);
}

export function makeScrap(level: number, slot: number): PaperSkin {
  const rng = createRng(`workshop::${level}::${slot}`);
  const stock = rng.pick(WORKSHOP_SHEETS);
  const fold = rng.pick(WORKSHOP_FOLDS);
  const kit = rng.pick(WORKSHOP_KITS);
  const nick = rng.pick(WORKSHOP_NICKS);
  const patched = { ...kit.patch };
  const numericKeys: (keyof FoldFlight)[] = [
    'densityScale',
    'turnScale',
    'speedScale',
    'climbScale',
    'loopScale',
    'gravityScale',
    'airFrictionScale',
    'damageScale',
    'glideScale',
    'diveScale',
    'hoopScoreScale',
    'chargeScale',
  ];
  for (const key of numericKeys) {
    const current = patched[key];
    if (typeof current === 'number') patched[key] = jitter(rng, current, 0.12) as never;
  }

  const title = nick ? `${nick} ${stock.name} ${fold.label}` : `${stock.name} ${fold.label}`;
  return {
    id: scrapId(level, slot),
    name: title,
    blurb: `Workshop fold, level ${level}. New ones show up every time you level.`,
    price: 120 + level * 80 + slot * 30,
    levelRequired: Math.max(1, level),
    sheet: stock.sheet,
    fold: stock.fold,
    crease: stock.crease,
    foldKind: fold.kind,
    pattern: stock.pattern,
    stripe: stock.stripe,
    workshop: true,
    ...tune(kit.power, patched),
  };
}

/** Signature folds plus a sliding window of workshop scraps — three new ones every level, forever. */
export function planesOnShelf(playerLevel: number, ownedIds: string[] = []): PaperSkin[] {
  const level = Math.max(1, Math.floor(playerLevel));
  const end = level + WORKSHOP_LOOKAHEAD;
  const start = Math.max(1, end - WORKSHOP_WINDOW + 1);
  const listed = new Set<string>();
  const out: PaperSkin[] = [];

  for (const paper of PAPERS) {
    listed.add(paper.id);
    out.push(paper);
  }

  for (let lv = start; lv <= end; lv += 1) {
    for (let slot = 0; slot < SCRAPS_PER_LEVEL; slot += 1) {
      const plane = makeScrap(lv, slot);
      listed.add(plane.id);
      out.push(plane);
    }
  }

  for (const id of ownedIds) {
    if (listed.has(id)) continue;
    if (!id.startsWith('scrap-')) continue;
    const plane = findPaper(id);
    if (plane.id !== id) continue;
    listed.add(id);
    out.push(plane);
  }

  return out;
}

export function findPaper(id: string): PaperSkin {
  const named = PAPERS.find((item) => item.id === id);
  if (named) return named;
  const scrap = parseScrapId(id);
  if (scrap) return makeScrap(scrap.level, scrap.slot);
  return PAPERS[0];
}

export function findStreamer(id: string): StreamerSkin {
  return STREAMERS.find((item) => item.id === id) ?? STREAMERS[0];
}

export function findUpgrade(id: string | null): Upgrade | null {
  if (!id) return null;
  return UPGRADES.find((item) => item.id === id) ?? null;
}

/** Plane fold plus the equipped upgrade, ready to throw. */
export function mergeFlight(paper: PaperSkin, upgrade: Upgrade | null): FoldFlight {
  const flight = paper.flight;
  return {
    ...flight,
    densityScale: flight.densityScale * (upgrade?.effect.densityScale ?? 1),
    turnScale: flight.turnScale * (upgrade?.effect.turnScale ?? 1),
    damageScale: flight.damageScale * (upgrade?.effect.damageScale ?? 1),
    extraThrows: flight.extraThrows + (upgrade?.effect.extraThrows ?? 0),
  };
}

export function describeItem(id: string): { name: string; kind: string } | null {
  if (id.startsWith('scrap-') || PAPERS.some((item) => item.id === id)) {
    const paper = findPaper(id);
    if (paper.id === id) return { name: paper.name, kind: 'Plane' };
  }
  const streamer = STREAMERS.find((item) => item.id === id);
  if (streamer) return { name: streamer.name, kind: 'Streamer' };
  const upgrade = UPGRADES.find((item) => item.id === id);
  if (upgrade) return { name: upgrade.name, kind: 'Upgrade' };
  return null;
}

function workshopUnlockIds(maxLevel: number): string[] {
  const ids: string[] = [];
  for (let lv = 1; lv <= maxLevel; lv += 1) {
    for (let slot = 0; slot < SCRAPS_PER_LEVEL; slot += 1) {
      ids.push(scrapId(lv, slot));
    }
  }
  return ids;
}

export const ALL_UNLOCKABLE_IDS = [
  ...PAPERS.map((item) => item.id),
  ...STREAMERS.map((item) => item.id),
  ...UPGRADES.map((item) => item.id),
  ...workshopUnlockIds(WORKSHOP_BOX_LEVELS),
];
