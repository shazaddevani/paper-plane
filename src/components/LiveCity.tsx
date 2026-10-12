import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { PAPERS } from '../game/catalog';
import { createRng } from '../game/rng';
import { FILL, NO_TOUCH } from './fill';
import { PaperDart } from './PaperDart';

/** One rounded tree in a drifting garden strip. */
type Tree = { key: string; x: number; w: number; h: number };
type TreeStrip = { trees: Tree[]; strip: number };

/** A seeded row of round-topped trees, long enough to scroll and wrap. */
function buildTrees(seed: string, approxWidth: number, baseH: number): TreeStrip {
  const rng = createRng(seed);
  const trees: Tree[] = [];
  let x = 0;
  let i = 0;
  while (x < approxWidth) {
    const w = rng.range(baseH * 0.55, baseH * 1.1);
    trees.push({ key: `${seed}-${i}`, x, w, h: rng.range(baseH * 0.6, baseH) });
    x += w * rng.range(0.55, 0.85);
    i += 1;
  }
  return { trees, strip: x };
}

function TreeRow({ strip, color, height }: { strip: TreeStrip; color: string; height: number }) {
  return (
    <View style={{ width: strip.strip, height }}>
      {strip.trees.map((tree) => (
        <View
          key={tree.key}
          style={{
            position: 'absolute',
            bottom: 0,
            left: tree.x,
            width: tree.w,
            height: tree.h,
            backgroundColor: color,
            borderTopLeftRadius: tree.w / 2,
            borderTopRightRadius: tree.w / 2,
          }}
        />
      ))}
    </View>
  );
}

/** Garden fence pickets, the same look as the yard. */
function FenceRow({ width, height }: { width: number; height: number }) {
  const count = Math.ceil(width / 24);
  return (
    <View style={{ width, height }}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            bottom: 0,
            left: i * 24,
            width: 19,
            height: height * (i % 3 === 0 ? 1 : 0.92),
            backgroundColor: '#4A3A2C',
            borderTopLeftRadius: 3,
            borderTopRightRadius: 3,
          }}
        />
      ))}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: height * 0.36,
          height: Math.max(3, height * 0.08),
          backgroundColor: '#2E241A',
        }}
      />
    </View>
  );
}

type CityPressApi = { pressIn: () => void; pressOut: () => void };
const CityPressContext = React.createContext<CityPressApi | null>(null);

export function useCityPress() {
  return React.useContext(CityPressContext);
}

function Twinkle({ left, top, size, delay }: { left: number; top: number; size: number; delay: number }) {
  const pulse = useSharedValue(0.2);
  useEffect(() => {
    pulse.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 1400 + delay * 0.2, easing: Easing.inOut(Easing.quad) }), -1, true),
    );
  }, [delay, pulse]);
  const style = useAnimatedStyle(() => ({ opacity: 0.15 + pulse.value * 0.7 }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left,
          top,
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: '#F4F0E4',
        },
        style,
      ]}
    />
  );
}

export function LiveCity({ children }: { children?: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const approx = Math.max(1000, Math.round(width * 1.4));
  const farH = Math.max(90, height * 0.3);
  const nearH = Math.max(110, height * 0.36);
  const grassH = height * 0.2;
  const fenceH = Math.max(40, height * 0.11);

  const far = useMemo(() => buildTrees('garden-far', approx, farH), [approx, farH]);
  const near = useMemo(() => buildTrees('garden-near', approx, nearH), [approx, nearH]);
  const stars = useMemo(() => {
    const rng = createRng('city-stars');
    return Array.from({ length: 56 }, (_, i) => ({
      key: `star-${i}`,
      left: rng.range(0, width),
      top: rng.range(8, height * 0.38),
      size: rng.range(1.2, 2.6),
      delay: rng.range(0, 1800),
    }));
  }, [height, width]);
  const farX = useSharedValue(0);
  const nearX = useSharedValue(0);
  const dartX = useSharedValue(0);
  const phase = useSharedValue(0);
  const climb = useSharedValue(0);
  const farStrip = useSharedValue(far.strip);
  const nearStrip = useSharedValue(near.strip);
  const dartCycle = useSharedValue(width + 220);

  useEffect(() => {
    farStrip.value = far.strip;
    nearStrip.value = near.strip;
    dartCycle.value = width + 220;
  }, [dartCycle, far.strip, farStrip, near.strip, nearStrip, width]);

  useFrameCallback((info) => {
    'worklet';
    const dt = Math.min(info.timeSincePreviousFrame ?? 16, 40);
    const fs = farStrip.value;
    const ns = nearStrip.value;
    const dc = dartCycle.value;
    if (fs > 0) farX.value = (farX.value + (fs / 110000) * dt) % fs;
    if (ns > 0) nearX.value = (nearX.value + (ns / 70000) * dt) % ns;
    if (dc > 0) dartX.value = (dartX.value + (dc / 18000) * dt) % dc;
    phase.value += dt * 0.0022;
  });

  const farStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -farX.value }] }));
  const nearStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -nearX.value }] }));

  // Stay down over the trees. Higher than this and the dart flies through the title.
  const dartTop = height * 0.62;
  const dartA = useAnimatedStyle(() => {
    const lift = climb.value;
    const bob = Math.sin(phase.value) * 16;
    const y = dartTop - lift * 120 - bob;
    const rot = -8 - lift * 16 - Math.sin(phase.value) * 5;
    return {
      transform: [{ translateX: dartX.value }, { translateY: y }, { rotate: `${rot}deg` }],
    };
  });
  const dartB = useAnimatedStyle(() => {
    const lift = climb.value;
    const bob = Math.sin(phase.value) * 16;
    const y = dartTop - lift * 120 - bob;
    const rot = -8 - lift * 16 - Math.sin(phase.value) * 5;
    return {
      transform: [
        { translateX: dartX.value - dartCycle.value },
        { translateY: y },
        { rotate: `${rot}deg` },
      ],
    };
  });

  const pressCount = useRef(0);
  const pressIn = () => {
    pressCount.current += 1;
    climb.value = withTiming(1, { duration: 120 });
  };
  const pressOut = () => {
    pressCount.current = Math.max(0, pressCount.current - 1);
    if (pressCount.current === 0) climb.value = withTiming(0, { duration: 360 });
  };
  const cityPress = { pressIn, pressOut };

  return (
    <View style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#070B18' }}>
      <View style={[FILL, NO_TOUCH, { overflow: 'hidden' }]} pointerEvents="none">
        {/* A garden at twilight, the same back garden the game is played in. */}
        <LinearGradient
          colors={['#0E1636', '#1F2A5A', '#40407A', '#7A5A8A', '#C88A8E']}
          locations={[0, 0.3, 0.52, 0.7, 0.8]}
          style={FILL}
        />

        {stars.map((star) => (
          <Twinkle key={star.key} left={star.left} top={star.top} size={star.size} delay={star.delay} />
        ))}

        <View
          style={{
            position: 'absolute',
            // Up in the open sky between the title and the top-right
            // controls, so it never sits behind the coins or Back.
            left: width * 0.46,
            top: height * 0.03,
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: '#F2D7A4',
            opacity: 0.55,
            shadowColor: '#F2D7A4',
            shadowOpacity: 0.6,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 0 },
          }}
        />

        <Animated.View
          style={[
            { position: 'absolute', left: 0, bottom: grassH + fenceH * 0.5, flexDirection: 'row' },
            farStyle,
          ]}
        >
          <TreeRow strip={far} color="rgba(30, 36, 64, 0.9)" height={farH} />
          <TreeRow strip={far} color="rgba(30, 36, 64, 0.9)" height={farH} />
        </Animated.View>

        <Animated.View
          style={[
            { position: 'absolute', left: 0, bottom: grassH + fenceH * 0.2, flexDirection: 'row' },
            nearStyle,
          ]}
        >
          <TreeRow strip={near} color="rgba(18, 28, 30, 0.96)" height={nearH} />
          <TreeRow strip={near} color="rgba(18, 28, 30, 0.96)" height={nearH} />
        </Animated.View>

        <Animated.View
          style={[{ position: 'absolute', left: 0, bottom: grassH, flexDirection: 'row' }, nearStyle]}
        >
          <FenceRow width={near.strip} height={fenceH} />
          <FenceRow width={near.strip} height={fenceH} />
        </Animated.View>

        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: grassH,
            backgroundColor: '#1E5432',
            borderTopWidth: 4,
            borderTopColor: '#4E8E50',
          }}
        />

        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, opacity: 0.9 }, dartA]}>
          <PaperDart paper={PAPERS[0]} length={64} showRules={false} />
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, opacity: 0.9 }, dartB]}>
          <PaperDart paper={PAPERS[0]} length={64} showRules={false} />
        </Animated.View>
      </View>

      <CityPressContext.Provider value={cityPress}>
        <View style={{ flex: 1 }}>
          {React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) return child;
            return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
              onTouchStart: pressIn,
              onTouchEnd: pressOut,
              onTouchCancel: pressOut,
            });
          })}
        </View>
      </CityPressContext.Provider>
    </View>
  );
}
