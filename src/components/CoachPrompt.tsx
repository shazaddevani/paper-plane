import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BIRO } from '../game/constants';

/**
 * A big, friendly instruction for first-time players, shown just under the
 * score bar, clear of the balloons. Fades between lines and breathes gently
 * so it is seen without getting in the way. Never takes touches.
 */
export function CoachPrompt({ text }: { text: string | null }) {
  const [shown, setShown] = useState(text);
  const fade = useSharedValue(text ? 1 : 0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [pulse]);

  useEffect(() => {
    if (text) {
      setShown(text);
      fade.value = 0;
      fade.value = withTiming(1, { duration: 260 });
    } else {
      fade.value = withTiming(0, { duration: 200 });
    }
  }, [fade, text]);

  const style = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [
      { translateY: (1 - fade.value) * -8 },
      { scale: 1 + pulse.value * 0.035 },
    ],
  }));

  const dot = useAnimatedStyle(() => ({
    opacity: 0.45 + pulse.value * 0.55,
    transform: [{ scale: 0.8 + pulse.value * 0.4 }],
  }));

  if (!shown) return null;

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View style={[styles.pill, style]}>
        <Animated.View style={[styles.dot, dot]} />
        <Text style={styles.text}>{shown}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Just under the score bar, above where Yard 1's high balloon floats.
    top: 54,
    alignItems: 'center',
    zIndex: 6,
    pointerEvents: 'none',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 251, 240, 0.96)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E0A12A',
  },
  text: {
    ...BIRO,
    fontSize: 18,
    fontWeight: '800',
  },
});
