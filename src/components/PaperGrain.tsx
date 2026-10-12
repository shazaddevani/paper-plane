import React from 'react';
import { Image, ImageStyle, View } from 'react-native';

import { FILL, NO_TOUCH } from './fill';

const GRAIN = require('../../assets/paper-grain.png');

const FIBERS = [
  { top: '12%', left: '8%', width: '18%', rotate: '-7deg', opacity: 0.07 },
  { top: '31%', left: '62%', width: '14%', rotate: '4deg', opacity: 0.05 },
  { top: '58%', left: '22%', width: '11%', rotate: '-2deg', opacity: 0.06 },
  { top: '74%', left: '71%', width: '16%', rotate: '6deg', opacity: 0.045 },
  { top: '88%', left: '14%', width: '9%', rotate: '-5deg', opacity: 0.05 },
] as const;

const tileStyle: ImageStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  width: '100%',
  height: '100%',
  opacity: 0.05,
};

/** Faint linen speckle sitting on top of the sky, never intercepting touches. */
export function PaperGrain() {
  return (
    <View style={[FILL, NO_TOUCH]}>
      <Image source={GRAIN} resizeMode="repeat" style={tileStyle} />
      {FIBERS.map((fiber, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: fiber.top,
            left: fiber.left,
            width: fiber.width,
            height: 1.2,
            borderRadius: 2,
            backgroundColor: 'rgba(48, 32, 24, 1)',
            opacity: fiber.opacity,
            transform: [{ rotate: fiber.rotate }],
          }}
        />
      ))}
    </View>
  );
}
