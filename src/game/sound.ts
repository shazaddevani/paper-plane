import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { MaterialKey } from './constants';

/**
 * Short sound effects, made by tools/makeSounds.py. Each sound has a small
 * pool of players so a burst of breaks can overlap instead of cutting itself
 * off. Every call is fire-and-forget: a sound that fails to load or play just
 * stays quiet rather than touching the game.
 */
const SOURCES = {
  throw: require('../../assets/sfx/throw.wav'),
  pop: require('../../assets/sfx/pop.wav'),
  crunch: require('../../assets/sfx/crunch.wav'),
  glass: require('../../assets/sfx/glass.wav'),
  wood: require('../../assets/sfx/wood.wav'),
  brick: require('../../assets/sfx/brick.wav'),
  hoop: require('../../assets/sfx/hoop.wav'),
  clear: require('../../assets/sfx/clear.wav'),
  crumple: require('../../assets/sfx/crumple.wav'),
} as const;

export type SfxName = keyof typeof SOURCES;

const POOL_SIZE: Partial<Record<SfxName, number>> = { pop: 3, crunch: 4, glass: 3, wood: 3, brick: 3 };
const VOLUME: Record<SfxName, number> = {
  throw: 0.7,
  pop: 1,
  crunch: 0.8,
  glass: 0.7,
  wood: 0.8,
  brick: 0.85,
  hoop: 0.7,
  clear: 0.8,
  crumple: 0.6,
};
/** Breaks closer together than this share one sound, so a collapsing stack is not a roar. */
const MIN_GAP_MS: Partial<Record<SfxName, number>> = { crunch: 55, glass: 55, wood: 55, brick: 55 };

const pools: Partial<Record<SfxName, { players: AudioPlayer[]; next: number }>> = {};
const lastPlayed: Partial<Record<SfxName, number>> = {};
let enabled = true;
let modeSet = false;

function pool(name: SfxName) {
  let entry = pools[name];
  if (!entry) {
    const size = POOL_SIZE[name] ?? 1;
    const players: AudioPlayer[] = [];
    for (let i = 0; i < size; i += 1) {
      try {
        const player = createAudioPlayer(SOURCES[name]);
        player.volume = VOLUME[name];
        players.push(player);
      } catch {
        // No audio on this device; stay silent.
      }
    }
    entry = { players, next: 0 };
    pools[name] = entry;
  }
  return entry;
}

/** Turn sound on or off for the whole game. */
export function setSoundEnabled(on: boolean) {
  enabled = on;
}

/** Load every sound up front so the first throw is not silent while it loads. */
export function preloadSounds() {
  if (!modeSet) {
    modeSet = true;
    // Respect the phone's silent switch and let the player's own music keep playing.
    setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
      allowsRecording: false,
    }).catch(() => undefined);
  }
  (Object.keys(SOURCES) as SfxName[]).forEach((name) => pool(name));
}

const MUSIC = require('../../assets/sfx/music.wav');
/** Quiet enough to sit under the effects and never tire the ear. */
const MUSIC_VOLUME = 0.3;
let musicPlayer: AudioPlayer | null = null;
let musicWanted = false;

function music(): AudioPlayer | null {
  if (!musicPlayer) {
    try {
      musicPlayer = createAudioPlayer(MUSIC);
      musicPlayer.loop = true;
      musicPlayer.volume = MUSIC_VOLUME;
    } catch {
      musicPlayer = null;
    }
  }
  return musicPlayer;
}

/** Start or stop the background music loop. */
export function setMusicEnabled(on: boolean) {
  musicWanted = on;
  const player = music();
  if (!player) return;
  try {
    if (on) {
      if (!player.playing) player.play();
    } else {
      player.pause();
    }
  } catch {
    // Ignore: music is a nicety.
  }
}

/** Pick the music back up after the app returns, or after a browser blocked autoplay. */
export function resumeMusic() {
  if (!musicWanted) return;
  const player = music();
  try {
    if (player && !player.playing) player.play();
  } catch {
    // Ignore.
  }
}

export function playSfx(name: SfxName) {
  // A tap is a user gesture, which browsers need before they allow music.
  resumeMusic();
  if (!enabled) return;
  const now = Date.now();
  const gap = MIN_GAP_MS[name];
  if (gap && now - (lastPlayed[name] ?? 0) < gap) return;
  lastPlayed[name] = now;

  const entry = pool(name);
  const player = entry.players[entry.next % Math.max(1, entry.players.length)];
  entry.next += 1;
  if (!player) return;
  try {
    player.seekTo(0).catch(() => undefined);
    player.play();
  } catch {
    // Ignore: a missed sound effect should never interrupt play.
  }
}

/** The breaking sound that suits each material. */
export function breakSound(material: MaterialKey | undefined): SfxName {
  switch (material) {
    case 'glass':
      return 'glass';
    case 'wood':
      return 'wood';
    case 'brick':
      return 'brick';
    default:
      return 'crunch';
  }
}
