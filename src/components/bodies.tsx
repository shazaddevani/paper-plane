import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  SharedValue,
  interpolateColor,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { MATERIALS, MaterialKey, PALETTE, PHYSICS } from '../game/constants';
import { PaperSkin, StreamerSkin } from '../game/catalog';
import { DEBRIS_COLORS, RenderSlot, STRIDE } from '../game/physics';
import { PaperDart, CrumpledDart, dartSpan } from './PaperDart';
import { StreamerTail } from './StreamerTail';
import { FILL, NO_TOUCH } from './fill';

type SlotProps = {
  slot: RenderSlot;
  frame: SharedValue<number[]>;
};

/** Markings that make each material read as the object it is meant to be. */
function BlockDecor({ material }: { material: MaterialKey }) {
  switch (material) {
    case 'cardboard':
      return (
        <>
          <View style={[styles.tape, { top: '38%' }]} />
          <View style={styles.boxSeam} />
        </>
      );
    case 'glass':
      return (
        <>
          <View style={styles.bottleNeck} />
          <View style={styles.bottleShine} />
        </>
      );
    case 'wood':
      return (
        <>
          <View style={[styles.slat, { top: '30%' }]} />
          <View style={[styles.slat, { top: '64%' }]} />
        </>
      );
    case 'brick':
      return <View style={styles.mortar} />;
    default:
      return null;
  }
}

export const BlockBody = React.memo(function BlockBody({
  slot,
  frame,
  scale,
}: SlotProps & { scale: number }) {
  const material = MATERIALS[slot.material ?? 'cardboard'];
  const index = slot.index;

  const animated = useAnimatedStyle(() => {
    const base = index * STRIDE;
    const buffer = frame.value;
    if (buffer.length <= base + 4) return { opacity: 0 };
    const opacity = buffer[base + 3];
    const bursting = opacity > 0 && opacity < 1;
    return {
      opacity,
      backgroundColor: interpolateColor(buffer[base + 4], [0, 1], [material.fill, material.shard]),
      transform: [
        { translateX: buffer[base] * scale },
        { translateY: buffer[base + 1] * scale },
        { rotate: `${buffer[base + 2]}rad` },
        { scale: bursting ? 1 + (1 - opacity) * 0.22 : 1 },
      ],
    };
  });

  // A dent that deepens as the item takes damage, so a battered box reads as
  // nearly gone before it actually breaks.
  const wear = useAnimatedStyle(() => {
    const base = index * STRIDE;
    const buffer = frame.value;
    if (buffer.length <= base + 4) return { opacity: 0 };
    return { opacity: Math.max(0, buffer[base + 4] - 0.25) * 0.8 };
  });

  return (
    <Animated.View
      style={[
        styles.body,
        {
          left: (-slot.w * scale) / 2,
          top: (-slot.h * scale) / 2,
          width: slot.w * scale,
          height: slot.h * scale,
          borderColor: material.edge,
          borderWidth: Math.max(2, 2.2 * scale),
          borderRadius: material.key === 'glass' ? Math.min(10, (slot.w * scale) / 2) : 4,
          overflow: 'hidden',
        },
        animated,
      ]}
    >
      <BlockDecor material={material.key} />
      <Animated.View style={[styles.wear, wear]} />
    </Animated.View>
  );
});

export const BalloonBody = React.memo(function BalloonBody({
  slot,
  frame,
  scale,
}: SlotProps & { scale: number; clock: SharedValue<number> }) {
  const index = slot.index;
  const diameter = slot.w * scale;
  const radius = diameter / 2;
  const color = slot.color ?? PALETTE.danger;
  // stringLength runs from the balloon's center to the tie point. The cord
  // starts at the knot, so it is shorter by one radius and actually meets the stack.
  const drop = Math.max(0, (slot.stringLength ?? 0) - slot.w / 2) * scale;

  // The physics leans the balloon so its string points at the tie, and swells
  // it for a moment when it pops.
  const animated = useAnimatedStyle(() => {
    const base = index * STRIDE;
    const buffer = frame.value;
    if (buffer.length <= base + 4) return { opacity: 0 };
    const opacity = buffer[base + 3];
    const bursting = opacity > 0 && opacity < 1;
    return {
      opacity,
      transform: [
        { translateX: buffer[base] * scale },
        { translateY: buffer[base + 1] * scale },
        { rotate: `${buffer[base + 2]}rad` },
        { scale: bursting ? 1 + (1 - opacity) * 0.7 : 1 },
      ],
    };
  });

  const cord = useAnimatedStyle(() => {
    const base = index * STRIDE;
    const buffer = frame.value;
    if (buffer.length <= base + 4) return { opacity: 0 };
    return { opacity: buffer[base + 3] >= 1 ? 1 : 0 };
  });

  return (
    <Animated.View
      style={[
        styles.body,
        { left: -radius, top: -radius, width: diameter, height: diameter },
        animated,
      ]}
    >
      {drop > 10 ? (
        <Animated.View style={[styles.cord, cord]}>
          <BalloonString drop={drop} center={radius} />
        </Animated.View>
      ) : null}
      <View
        style={[
          styles.balloon,
          { backgroundColor: color, width: diameter, height: diameter, borderRadius: radius },
        ]}
      />
      <View style={[styles.knot, { backgroundColor: color, left: radius - 4, top: diameter - 5 }]} />
      <View style={[styles.balloonShine, { borderRadius: radius }]} />
    </Animated.View>
  );
});

/** A slack cord from the knot down to the tie point, not a stick. */
function BalloonString({ drop, center }: { drop: number; center: number }) {
  const bow = Math.min(22, drop * 0.08);
  const width = bow * 2 + 8;
  const x0 = width / 2;
  return (
    <Svg
      width={width}
      height={drop}
      style={{ position: 'absolute', left: center - width / 2, top: center * 2 - 2 }}
    >
      <Path
        d={`M ${x0} 2 Q ${x0 + bow} ${drop * 0.45} ${x0 - bow * 0.25} ${drop * 0.72} T ${x0} ${drop - 1}`}
        stroke="#5A4032"
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export const DebrisBody = React.memo(function DebrisBody({
  slot,
  frame,
  scale,
}: SlotProps & { scale: number }) {
  const index = slot.index;

  const animated = useAnimatedStyle(() => {
    const base = index * STRIDE;
    const buffer = frame.value;
    if (buffer.length <= base + 4) return { opacity: 0 };
    const tint = Math.round(buffer[base + 4]);
    return {
      opacity: buffer[base + 3],
      backgroundColor: DEBRIS_COLORS[tint] ?? DEBRIS_COLORS[0],
      transform: [
        { translateX: buffer[base] * scale },
        { translateY: buffer[base + 1] * scale },
        { rotate: `${buffer[base + 2]}rad` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.body,
        {
          left: (-slot.w * scale) / 2,
          top: (-slot.h * scale) / 2,
          width: slot.w * scale,
          height: slot.h * scale,
          borderRadius: 2,
        },
        animated,
      ]}
    />
  );
});

export const TrailDot = React.memo(function TrailDot({
  slot,
  frame,
  color,
}: SlotProps & { color: string }) {
  const index = slot.index;

  const animated = useAnimatedStyle(() => {
    const base = index * STRIDE;
    const buffer = frame.value;
    if (buffer.length <= base + 4) return { opacity: 0 };
    return {
      opacity: buffer[base + 3],
      transform: [
        { translateX: buffer[base] },
        { translateY: buffer[base + 1] },
        { rotate: `${buffer[base + 2]}rad` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.body,
        {
          left: -slot.w / 2,
          top: -slot.h / 2,
          width: slot.w,
          height: slot.h,
          borderRadius: slot.h / 2,
          backgroundColor: color,
        },
        animated,
      ]}
    />
  );
});

/**
 * The paper dart in flight. SVG paths, not CSS triangles — those vanish on iOS.
 */
export const PlaneBody = React.memo(function PlaneBody({
  slot,
  frame,
  skin,
  streamer,
  scale,
  clock,
}: SlotProps & { skin: PaperSkin; streamer: StreamerSkin; scale: number; clock: SharedValue<number> }) {
  // Fed its own five-number frame, so it always reads from 0.
  void slot;
  // Drawn at screen size. A parent scale transform would rasterize the SVG and soften it.
  const length = PHYSICS.planeRadius * 9.2 * scale;
  const span = dartSpan(length, skin.foldKind);

  const animated = useAnimatedStyle(() => {
    const base = 0;
    const buffer = frame.value;
    if (buffer.length <= base + 4) return { opacity: 0 };
    return {
      opacity: buffer[base + 3],
      transform: [
        { translateX: buffer[base] * scale },
        { translateY: buffer[base + 1] * scale },
        { rotate: `${buffer[base + 2]}rad` },
      ],
    };
  });

  const heat = useAnimatedStyle(() => {
    const base = 0;
    const buffer = frame.value;
    if (buffer.length <= base + 4) return { opacity: 0 };
    const extra = buffer[base + 4];
    return { opacity: extra > 0.5 && extra < 1.5 ? 0.85 : 0 };
  });

  const live = useAnimatedStyle(() => {
    const base = 0;
    const buffer = frame.value;
    if (buffer.length <= base + 4) return { opacity: 1 };
    const extra = buffer[base + 4];
    const crushT = extra >= 2 ? Math.min(1, extra - 2) : 0;
    return { opacity: 1 - crushT };
  });

  const wad = useAnimatedStyle(() => {
    const base = 0;
    const buffer = frame.value;
    if (buffer.length <= base + 4) return { opacity: 0 };
    const extra = buffer[base + 4];
    const crushT = extra >= 2 ? Math.min(1, extra - 2) : 0;
    return {
      opacity: crushT,
      transform: [{ rotate: `${(1 - crushT) * 0.45}rad` }],
    };
  });

  const flutter = useAnimatedStyle(() => {
    // A gentle ripple. A big flap made the whole dart look shaky.
    const flap = Math.sin(clock.value * 0.011);
    return {
      transform: [{ translateY: flap * span * 0.16 }, { rotate: `${flap * 0.07}rad` }],
    };
  });

  const tailRoom = length * 0.8;

  return (
    <Animated.View
      style={[
        styles.body,
        {
          left: -length * 0.55 - tailRoom,
          top: -span,
          width: length + tailRoom,
          height: span * 2,
          overflow: 'visible',
        },
        animated,
      ]}
    >
      <View style={{ position: 'absolute', left: tailRoom, top: 0, width: length, height: span * 2 }}>
        <Animated.View
          style={[
            styles.heat,
            { borderRadius: span, backgroundColor: PALETTE.warm },
            heat,
          ]}
        />
        <Animated.View style={live}>
          <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, flutter]}>
            <StreamerTail streamer={streamer} length={length} />
          </Animated.View>
          <PaperDart paper={skin} length={length} />
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, wad]}>
          <CrumpledDart paper={skin} length={length} />
        </Animated.View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  body: {
    position: 'absolute',
    ...NO_TOUCH,
  },
  wear: {
    ...FILL,
    backgroundColor: '#1B1013',
  },
  tape: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: '#E4C79C',
    opacity: 0.55,
  },
  boxSeam: {
    position: 'absolute',
    left: '48%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#7A4E28',
    opacity: 0.5,
  },
  slat: {
    position: 'absolute',
    left: 2,
    right: 2,
    height: 2,
    backgroundColor: '#5E3A1B',
    opacity: 0.65,
  },
  mortar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '46%',
    height: 2,
    backgroundColor: '#E4C0A8',
    opacity: 0.35,
  },
  bottleNeck: {
    position: 'absolute',
    left: '32%',
    right: '32%',
    top: 0,
    height: '22%',
    backgroundColor: '#DFF6F1',
    opacity: 0.3,
  },
  bottleShine: {
    position: 'absolute',
    left: '20%',
    top: '26%',
    width: 3,
    bottom: '14%',
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    opacity: 0.5,
  },
  balloon: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  balloonShine: {
    position: 'absolute',
    left: '22%',
    top: '18%',
    width: '26%',
    height: '30%',
    backgroundColor: '#FFFFFF',
    opacity: 0.45,
  },
  cord: {
    ...FILL,
    overflow: 'visible',
  },
  knot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heat: {
    ...FILL,
    transform: [{ scale: 1.45 }],
  },
});
