import React from 'react';
import { View } from 'react-native';
import Animated, { SharedValue, useAnimatedProps, useSharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { StreamerSkin } from '../game/catalog';
import { dartSpan } from './PaperDart';
import { NO_TOUCH } from './fill';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Samples along the ribbon. Enough for a smooth curve at phone size. */
const SAMPLES = 14;

type Wave = { amp: number; freq: number; speed: number; wobble: number };

function waveFor(kind: StreamerSkin['wave']): Wave {
  if (kind === 'curl') return { amp: 9, freq: 0.15, speed: 0.011, wobble: 0.25 };
  if (kind === 'wild') return { amp: 11, freq: 0.19, speed: 0.014, wobble: 0.5 };
  return { amp: 7, freq: 0.11, speed: 0.009, wobble: 0.15 };
}

/**
 * A paper ribbon taped under the dart's tail. The taped end is pinned to the
 * tail and the wave grows toward the free end, so the ribbon never pulls away
 * from the dart. Drawn in a 100×40 box, tail end at x = 100, centred on y = 20.
 */
export function StreamerTail({
  streamer,
  length,
  clock,
}: {
  streamer: StreamerSkin;
  length: number;
  /** Drives the wave. Menu previews leave it out and get a still ribbon. */
  clock?: SharedValue<number>;
}) {
  const still = useSharedValue(1800);
  const time = clock ?? still;
  const wave = waveFor(streamer.wave);
  const colors = streamer.stripes.length > 0 ? streamer.stripes : [streamer.color];

  const body = useAnimatedProps(() => {
    const phase = time.value * wave.speed;
    const top: string[] = [];
    const bottom: string[] = [];
    for (let i = 0; i <= SAMPLES; i += 1) {
      const u = i / SAMPLES; // 0 at the tail, 1 at the free end
      const x = 100 - u * 98;
      const reach = Math.pow(u, 1.25);
      const y =
        20 +
        wave.amp * reach * Math.sin(u * 100 * wave.freq - phase) +
        wave.amp * wave.wobble * reach * Math.sin(u * 100 * wave.freq * 2.3 - phase * 1.7);
      const half = 6.5 - u * 2.2; // tapers a little toward the end
      top.push(`${x.toFixed(2)} ${(y - half).toFixed(2)}`);
      bottom.push(`${x.toFixed(2)} ${(y + half).toFixed(2)}`);
    }
    bottom.reverse();
    return { d: `M ${top.join(' L ')} L ${bottom.join(' L ')} Z` };
  });

  const stripe = useAnimatedProps(() => {
    const phase = time.value * wave.speed;
    const points: string[] = [];
    for (let i = 0; i <= SAMPLES; i += 1) {
      const u = i / SAMPLES;
      const x = 100 - u * 98;
      const reach = Math.pow(u, 1.25);
      const y =
        20 +
        wave.amp * reach * Math.sin(u * 100 * wave.freq - phase) +
        wave.amp * wave.wobble * reach * Math.sin(u * 100 * wave.freq * 2.3 - phase * 1.7);
      points.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return { d: `M ${points.join(' L ')}` };
  });

  if (!streamer.taped) return null;

  const dartH = dartSpan(length, 'dart') * 2;
  // Match the viewBox ratio (100×40) or the band gets letterboxed into a hairline.
  const ribbonH = dartH * 1.1;
  const ribbonW = ribbonH * 2.5;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: ribbonW,
        height: ribbonH,
        // Tucked well under the tail so the taped end is hidden by the dart.
        left: -ribbonW + length * 0.22,
        top: (dartH - ribbonH) / 2,
        ...NO_TOUCH,
      }}
    >
      <Svg width={ribbonW} height={ribbonH} viewBox="0 0 100 40">
        <AnimatedPath animatedProps={body} fill={colors[0]} opacity={0.97} />
        {colors.slice(1, 3).map((color, i) => (
          <AnimatedPath
            key={`${color}-${i}`}
            animatedProps={stripe}
            fill="none"
            stroke={color}
            strokeWidth={i === 0 ? 3.2 : 1.4}
            strokeLinecap="round"
            opacity={0.9}
          />
        ))}
      </Svg>
    </View>
  );
}
