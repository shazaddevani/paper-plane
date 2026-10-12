import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { StreamerSkin } from '../game/catalog';
import { dartSpan } from './PaperDart';
import { NO_TOUCH } from './fill';

/** A filled paper ribbon, not a stroke. A stroke reads as a string on the tail. */
function ribbonBand(kind: StreamerSkin['wave']): string {
  if (kind === 'curl') {
    return 'M 98 12 C 80 4 64 20 48 12 C 34 6 18 16 4 14 L 6 28 C 20 30 36 18 50 26 C 66 34 82 16 98 26 Z';
  }
  if (kind === 'wild') {
    return 'M 98 10 C 78 24 58 4 42 16 C 28 24 16 8 2 12 L 6 26 C 18 22 32 36 46 28 C 62 18 80 34 98 24 Z';
  }
  return 'M 98 13 C 76 8 58 22 40 15 C 26 10 14 18 2 15 L 5 29 C 18 32 30 20 44 28 C 62 36 80 18 98 27 Z';
}

/** A short ribbon taped to the tail. Wide enough to read as a streamer. */
export function StreamerTail({
  streamer,
  length,
}: {
  streamer: StreamerSkin;
  length: number;
}) {
  if (!streamer.taped) return null;

  const dartH = dartSpan(length, 'dart') * 2;
  // Match the viewBox ratio (100×40) or the band gets letterboxed into a hairline.
  const ribbonH = dartH * 0.92;
  const ribbonW = ribbonH * 2.5;
  const colors = streamer.stripes.length > 0 ? streamer.stripes : [streamer.color];

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: ribbonW,
        height: ribbonH,
        left: -ribbonW + length * 0.18,
        top: (dartH - ribbonH) / 2,
        ...NO_TOUCH,
      }}
    >
      <Svg width={ribbonW} height={ribbonH} viewBox="0 0 100 40">
        <Path d={ribbonBand(streamer.wave)} fill={colors[0]} opacity={0.96} />
        {colors.slice(1).map((color, i) => (
          <Path
            key={`${color}-${i}`}
            d={ribbonBand(streamer.wave)}
            fill="none"
            stroke={color}
            strokeWidth={2.4}
            opacity={0.9}
          />
        ))}
      </Svg>
    </View>
  );
}
