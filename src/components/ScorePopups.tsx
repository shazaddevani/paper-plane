import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Layout } from '../game/layout';
import { NO_TOUCH } from './fill';

export type ScorePopup = {
  id: number;
  /** World position of whatever scored. */
  x: number;
  y: number;
  text: string;
  color: string;
};

export const POPUP_MS = 950;

/** "+800" that jumps out of a popped balloon or a hoop, rises and fades. */
function Popup({ item, scale }: { item: ScorePopup; scale: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withTiming(1, { duration: POPUP_MS, easing: Easing.out(Easing.cubic) });
  }, [t]);

  const style = useAnimatedStyle(() => {
    const v = t.value;
    const grow = Math.min(1, v / 0.14);
    return {
      opacity: v < 0.65 ? 1 : Math.max(0, 1 - (v - 0.65) / 0.35),
      transform: [{ translateY: -46 * v }, { scale: 0.6 + grow * 0.4 + (1 - grow) * 0.25 }],
    };
  });

  return (
    <Animated.View
      style={[styles.item, { left: item.x * scale - 60, top: item.y * scale - 34 }, style]}
    >
      <Text style={[styles.text, { color: item.color }]}>{item.text}</Text>
    </Animated.View>
  );
}

/** Floating score text in yard space, panned with the camera like the yard itself. */
export function ScorePopups({
  items,
  cameraX,
  layout,
}: {
  items: ScorePopup[];
  cameraX: SharedValue<number>;
  layout: Layout;
}) {
  const pan = useAnimatedStyle(() => ({
    transform: [{ translateX: -cameraX.value * layout.scale }],
  }));

  return (
    <Animated.View style={[styles.layer, { top: layout.offsetY }, pan]}>
      {items.map((item) => (
        <Popup key={item.id} item={item} scale={layout.scale} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    width: 0,
    height: 0,
    zIndex: 5,
    ...NO_TOUCH,
  },
  item: {
    position: 'absolute',
    width: 120,
    alignItems: 'center',
  },
  text: {
    fontSize: 22,
    fontWeight: '900',
    textShadowColor: 'rgba(10, 10, 20, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
});
