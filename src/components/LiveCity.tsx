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

const BUILDING_TONES = ['#1B2240', '#243056', '#312044', '#1E3A3A', '#3A2430', '#162238'];
const WINDOW_LIT = ['#F6D36A', '#FFE7A3', '#F4B267', '#CDE8FF'];

type Building = {
  key: string;
  x: number;
  w: number;
  h: number;
  color: string;
  window: string;
  cols: number;
  rows: number;
  lit: boolean[][];
};

type Car = {
  key: string;
  y: number;
  color: string;
  speed: number;
  start: number;
  width: number;
};

type Skyline = { buildings: Building[]; strip: number };

type CityPressApi = { pressIn: () => void; pressOut: () => void };
const CityPressContext = React.createContext<CityPressApi | null>(null);

export function useCityPress() {
  return React.useContext(CityPressContext);
}

function buildSkyline(seed: string, approxWidth: number, baseH: number): Skyline {
  const rng = createRng(seed);
  const buildings: Building[] = [];
  let x = 0;
  let i = 0;
  while (x < approxWidth) {
    const w = rng.range(28, 64);
    const h = rng.range(baseH * 0.36, baseH);
    const cols = Math.max(3, Math.floor(w / 8));
    const rows = Math.max(5, Math.floor(h / 10));
    const lit = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => rng.chance(0.62)),
    );
    buildings.push({
      key: `${seed}-${i}`,
      x,
      w,
      h,
      color: rng.pick(BUILDING_TONES),
      window: rng.pick(WINDOW_LIT),
      cols,
      rows,
      lit,
    });
    x += w + rng.range(6, 14);
    i += 1;
  }
  return { buildings, strip: x };
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

function CarBody({ car }: { car: Car }) {
  return (
    <>
      <View
        style={{
          width: car.width,
          height: 9,
          borderRadius: 2,
          backgroundColor: car.color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 1,
          top: 2,
          width: 5,
          height: 5,
          borderRadius: 2,
          backgroundColor: '#FFE9A0',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 1,
          top: 2,
          width: 4,
          height: 5,
          borderRadius: 2,
          backgroundColor: '#E0605A',
          opacity: 0.8,
        }}
      />
    </>
  );
}

function Traffic({ car, road }: { car: Car; road: number }) {
  const x = useSharedValue(car.start);
  const roadSv = useSharedValue(road);
  useEffect(() => {
    roadSv.value = road;
  }, [road, roadSv]);

  useFrameCallback((info) => {
    'worklet';
    const dt = Math.min(info.timeSincePreviousFrame ?? 16, 40);
    const len = roadSv.value;
    if (len <= 0) return;
    x.value = (x.value + car.speed * dt) % len;
  });

  const a = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const b = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - roadSv.value }] }));

  return (
    <>
      <Animated.View style={[{ position: 'absolute', top: car.y, left: 0 }, a]}>
        <CarBody car={car} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', top: car.y, left: 0 }, b]}>
        <CarBody car={car} />
      </Animated.View>
    </>
  );
}

function CityBlock({
  buildings,
  height,
  lamps,
  width,
}: {
  buildings: Building[];
  height: number;
  lamps: { x: number; h: number }[];
  width: number;
}) {
  return (
    <View style={{ width, height, position: 'relative' }}>
      {buildings.map((b) => (
        <View
          key={b.key}
          style={{
            position: 'absolute',
            left: b.x,
            bottom: 0,
            width: b.w,
            height: b.h,
            backgroundColor: b.color,
          }}
        >
          {b.lit.map((row, r) =>
            row.map((on, c) =>
              on ? (
                <View
                  key={`${r}-${c}`}
                  style={{
                    position: 'absolute',
                    left: 3 + c * ((b.w - 6) / b.cols),
                    top: 6 + r * ((b.h - 10) / b.rows),
                    width: 3,
                    height: 4,
                    backgroundColor: b.window,
                    opacity: 0.85,
                  }}
                />
              ) : null,
            ),
          )}
        </View>
      ))}
      {buildings.map((b) =>
        b.key.charCodeAt(b.key.length - 1) % 3 === 0 ? (
          <View
            key={`${b.key}-mast`}
            style={{
              position: 'absolute',
              left: b.x + b.w * 0.62,
              bottom: b.h,
              width: 2,
              height: 12 + (b.h % 10),
              backgroundColor: '#2A3348',
            }}
          />
        ) : null,
      )}
      {lamps.map((lamp) => (
        <View key={`lamp-${lamp.x}`} style={{ position: 'absolute', left: lamp.x, bottom: 0 }}>
          <View style={{ width: 3, height: lamp.h, backgroundColor: '#2A2230', marginLeft: 7 }} />
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 17,
              height: 8,
              borderRadius: 8,
              backgroundColor: '#F6D36A',
              opacity: 0.9,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: -10,
              top: 6,
              width: 38,
              height: 22,
              borderRadius: 18,
              backgroundColor: '#F6D36A',
              opacity: 0.12,
            }}
          />
        </View>
      ))}
    </View>
  );
}

/** Night city that never sits still — cars, windows, a slow drift, a dart crossing. */
export function LiveCity({ children }: { children?: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const approx = Math.max(1000, Math.round(width * 1.4));
  const farH = Math.max(90, height * 0.28);
  const nearH = Math.max(140, height * 0.42);
  const streetY = height * 0.72;

  const far = useMemo(() => buildSkyline('city-far', approx, farH), [approx, farH]);
  const near = useMemo(() => buildSkyline('city-near', approx, nearH), [approx, nearH]);
  const lamps = useMemo(() => {
    const rng = createRng('city-lamps');
    const list: { x: number; h: number }[] = [];
    for (let x = 30; x < near.strip; x += rng.range(70, 110)) {
      list.push({ x, h: rng.range(26, 40) });
    }
    return list;
  }, [near.strip]);
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
  const cars = useMemo(() => {
    const rng = createRng('city-cars');
    const palette = ['#4A5568', '#6B3A3A', '#2F4A62', '#3E3A2F', '#5A4A6A'];
    return Array.from({ length: 6 }, (_, i) => ({
      key: `car-${i}`,
      y: rng.range(-4, 6),
      color: rng.pick(palette),
      speed: rng.range(0.08, 0.16),
      start: rng.range(0, 1400),
      width: rng.range(22, 34),
    }));
  }, []);

  const farX = useSharedValue(0);
  const nearX = useSharedValue(0);
  const dartX = useSharedValue(0);
  const phase = useSharedValue(0);
  const climb = useSharedValue(0);
  const farStrip = useSharedValue(far.strip);
  const nearStrip = useSharedValue(near.strip);
  const dartCycle = useSharedValue(width + 220);
  const road = Math.max(width * 2.2, 1600);

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

  // Stay down in the skyline. Higher than this and the dart flies through the title.
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
        <LinearGradient
          colors={['#070B18', '#121A33', '#2A1E3A', '#4A2E2A']}
          locations={[0, 0.38, 0.7, 1]}
          style={FILL}
        />

        {stars.map((star) => (
          <Twinkle key={star.key} left={star.left} top={star.top} size={star.size} delay={star.delay} />
        ))}

        <View
          style={{
            position: 'absolute',
            right: width * 0.12,
            top: height * 0.1,
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: '#F2D7A4',
            opacity: 0.35,
          }}
        />

        <Animated.View
          style={[{ position: 'absolute', left: 0, bottom: height * 0.3, flexDirection: 'row' }, farStyle]}
        >
          <CityBlock buildings={far.buildings} height={farH} lamps={[]} width={far.strip} />
          <CityBlock buildings={far.buildings} height={farH} lamps={[]} width={far.strip} />
        </Animated.View>

        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: streetY - 18,
            height: 28,
            backgroundColor: '#141018',
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: streetY - 6,
            height: 2,
            backgroundColor: '#F6D36A',
            opacity: 0.35,
          }}
        />

        <View style={{ position: 'absolute', left: 0, right: 0, top: streetY - 14, height: 20 }}>
          {cars.map((car) => (
            <Traffic key={car.key} car={car} road={road} />
          ))}
        </View>

        <Animated.View style={[{ position: 'absolute', left: 0, bottom: 0, flexDirection: 'row' }, nearStyle]}>
          <CityBlock buildings={near.buildings} height={nearH} lamps={lamps} width={near.strip} />
          <CityBlock buildings={near.buildings} height={nearH} lamps={lamps} width={near.strip} />
        </Animated.View>

        <LinearGradient
          colors={['transparent', 'rgba(8,10,18,0.55)']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 0.22 }}
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
