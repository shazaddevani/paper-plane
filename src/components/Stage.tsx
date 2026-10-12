import React from 'react';
import { View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { GROUND_Y, PALETTE, WORLD_HEIGHT } from '../game/constants';
import { PaperSkin, StreamerSkin } from '../game/catalog';
import { Layout } from '../game/layout';
import { HoopSpec } from '../game/levelGen';
import { GameWorld } from '../game/physics';
import { YardTheme } from '../game/yardTheme';
import { BalloonBody, BlockBody, DebrisBody, PlaneBody } from './bodies';
import { NO_TOUCH } from './fill';

export type HoopFlashRegistry = React.MutableRefObject<Record<number, SharedValue<number>>>;

/** A plastic hula hoop staked in the yard, bright enough to aim at. */
function Hoop({
  hoop,
  index,
  registry,
  scale,
}: {
  hoop: HoopSpec;
  index: number;
  registry: HoopFlashRegistry;
  scale: number;
}) {
  const flash = useSharedValue(0);
  registry.current[index] = flash;

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.9 + flash.value * 0.1,
    transform: [{ scale: 1 + flash.value * 0.16 }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: flash.value * 0.5,
    transform: [{ scale: 1 + flash.value * 0.5 }],
  }));

  return (
    <View
      style={{
        position: 'absolute',
        left: hoop.x * scale,
        top: hoop.y * scale,
        width: 0,
        height: 0,
        ...NO_TOUCH,
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: -hoop.outerR * scale,
            top: -hoop.outerR * scale,
            width: hoop.outerR * 2 * scale,
            height: hoop.outerR * 2 * scale,
            borderRadius: hoop.outerR * scale,
            backgroundColor: hoop.color,
          },
          glowStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: -hoop.outerR * scale,
            top: -hoop.outerR * scale,
            width: hoop.outerR * 2 * scale,
            height: hoop.outerR * 2 * scale,
            borderRadius: hoop.outerR * scale,
            borderWidth: Math.max(4, hoop.thickness * scale),
            borderColor: hoop.color,
          },
          ringStyle,
        ]}
      />
    </View>
  );
}

/** Tufts of grass along the ground line, seeded off their own position. */
function GrassLine({ width, color, scale }: { width: number; color: string; scale: number }) {
  const tufts: React.ReactNode[] = [];
  for (let x = -400; x < width + 400; x += 34) {
    const height = (7 + ((x * 7919) % 11)) * scale;
    tufts.push(
      <View
        key={x}
        style={{
          position: 'absolute',
          left: x * scale,
          top: -height,
          width: Math.max(2, 3 * scale),
          height: height + 4 * scale,
          borderRadius: 2,
          backgroundColor: color,
          opacity: 0.9,
        }}
      />,
    );
  }
  return (
    <View
      style={{ position: 'absolute', left: 0, top: GROUND_Y * scale, width: 0, height: 0, ...NO_TOUCH }}
    >
      {tufts}
    </View>
  );
}

export const Stage = React.memo(function Stage({
  world,
  frame,
  planeFrame,
  cameraX,
  clock,
  divePos,
  diveT,
  layout,
  paper,
  streamer,
  theme,
  hoopRegistry,
}: {
  world: GameWorld;
  frame: SharedValue<number[]>;
  planeFrame: SharedValue<number[]>;
  cameraX: SharedValue<number>;
  clock: SharedValue<number>;
  divePos: SharedValue<{ x: number; y: number }>;
  diveT: SharedValue<number>;
  layout: Layout;
  paper: PaperSkin;
  streamer: StreamerSkin;
  theme: YardTheme;
  hoopRegistry: HoopFlashRegistry;
}) {
  const scale = layout.scale;
  const stageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -cameraX.value * scale }],
  }));

  const diveStyle = useAnimatedStyle(() => {
    const t = diveT.value;
    const origin = divePos.value;
    return {
      opacity: t > 0 && t < 1 ? (1 - t) * 0.85 : 0,
      transform: [
        { translateX: origin.x * scale },
        { translateY: origin.y * scale },
        { scale: 0.35 + t * 1.15 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          top: layout.offsetY,
          width: world.level.worldWidth * scale,
          height: WORLD_HEIGHT * scale,
          ...NO_TOUCH,
        },
        stageStyle,
      ]}
    >
      <View
        style={{
          position: 'absolute',
          left: -600 * scale,
          top: GROUND_Y * scale,
          width: (world.level.worldWidth + 1200) * scale,
          height: 600 * scale,
          backgroundColor: theme.grass,
          borderTopWidth: Math.max(3, 5 * scale),
          borderTopColor: theme.grassEdge,
        }}
      />
      <GrassLine width={world.level.worldWidth} color={theme.grassEdge} scale={scale} />

      {world.level.hoops.map((hoop, index) => (
        <Hoop key={hoop.id} hoop={hoop} index={index} registry={hoopRegistry} scale={scale} />
      ))}

      {world.slots.map((slot) => {
        switch (slot.kind) {
          case 'block':
            return <BlockBody key={slot.id} slot={slot} frame={frame} scale={scale} />;
          case 'balloon':
            return <BalloonBody key={slot.id} slot={slot} frame={frame} scale={scale} clock={clock} />;
          case 'debris':
            return <DebrisBody key={slot.id} slot={slot} frame={frame} scale={scale} />;
          case 'trail':
            // The dotted wake read as a string tied to the tail. The streamer
            // ribbon is the tail now, so the wake stays off.
            return null;
          case 'plane':
            return (
              <PlaneBody
                key={slot.id}
                slot={slot}
                frame={planeFrame}
                skin={paper}
                streamer={streamer}
                scale={scale}
                clock={clock}
              />
            );
          default:
            return null;
        }
      })}

      <Animated.View
        style={[
          {
            position: 'absolute',
            left: -70 * scale,
            top: -70 * scale,
            width: 140 * scale,
            height: 140 * scale,
            borderRadius: 70 * scale,
            borderWidth: Math.max(3, 4 * scale),
            borderColor: PALETTE.warm,
            ...NO_TOUCH,
          },
          diveStyle,
        ]}
      />
    </Animated.View>
  );
});
