import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { FILL } from './fill';

/** Fades the first screen in when the app opens. */
export function AppReveal() {
  const reveal = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ opacity: 1 - reveal.value }));

  useEffect(() => {
    reveal.value = withTiming(1, { duration: 560 });
  }, [reveal]);

  return <Animated.View pointerEvents="none" style={[FILL, styles.veil, style]} />;
}

const styles = StyleSheet.create({
  veil: {
    zIndex: 40,
    backgroundColor: '#070B14',
  },
});
