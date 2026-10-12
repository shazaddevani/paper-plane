import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { FILL } from './fill';

const LAUNCH_MS = 1200;

/** Fades the yard in and holds the name while the camera finds the throw line. */
export function YardLaunch({ stage, title }: { stage: number; title: string }) {
  const launch = useSharedValue(0);
  const [cover, setCover] = useState(true);

  useEffect(() => {
    launch.value = 0;
    launch.value = withTiming(1, { duration: LAUNCH_MS });
    const uncover = setTimeout(() => setCover(false), 700);
    return () => clearTimeout(uncover);
  }, [launch]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: 1 - launch.value }));
  const titleStyle = useAnimatedStyle(() => {
    const t = launch.value;
    const fadeIn = Math.min(1, t / 0.18);
    const fadeOut = t < 0.62 ? 1 : Math.max(0, 1 - (t - 0.62) / 0.38);
    return { opacity: fadeIn * fadeOut };
  });

  return (
    <>
      <Animated.View pointerEvents="none" style={[FILL, styles.veil, veilStyle]} />
      <Animated.View pointerEvents="none" style={[styles.titleWrap, titleStyle]}>
        <Text style={styles.kicker}>Yard {stage}</Text>
        <Text style={styles.name}>{title}</Text>
      </Animated.View>
      {cover ? <View style={[FILL, styles.cover]} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  veil: {
    zIndex: 18,
    backgroundColor: '#070B14',
  },
  titleWrap: {
    ...FILL,
    zIndex: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    color: 'rgba(244, 239, 228, 0.72)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  name: {
    color: '#F4EFE4',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  cover: {
    zIndex: 30,
  },
});
