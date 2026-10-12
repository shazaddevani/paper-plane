import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useCityPress } from './LiveCity';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

export const STICKY = {
  canary: '#FFE56A',
  peach: '#FFB07A',
  mint: '#B6DFC2',
  lilac: '#D7C6F2',
  sky: '#B9D6F5',
  pink: '#F5B8C8',
} as const;

export const STICKY_COLORS = [
  STICKY.canary,
  STICKY.peach,
  STICKY.mint,
  STICKY.lilac,
  STICKY.sky,
  STICKY.pink,
] as const;

const TILTS = [-2.6, 1.9, -1.3, 2.4, -1.8, 1.1, -3.1, 0.8] as const;

export function stickyColor(index: number): string {
  return STICKY_COLORS[index % STICKY_COLORS.length];
}

export function stickyTilt(index: number): number {
  return TILTS[index % TILTS.length];
}

/** A paper square stuck on at a crooked angle, the way notes actually sit. */
export function StickyNote({
  children,
  color = STICKY.canary,
  rotate = -2.2,
  onPress,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  rotate?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const lift = useSharedValue(0);
  const city = useCityPress();

  const anim = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotate}deg` },
      { translateY: -16 * lift.value },
      { scale: 1 + 0.05 * lift.value },
    ],
    zIndex: lift.value > 0.04 ? 14 : 0,
    shadowOpacity: 0.28 + 0.22 * lift.value,
    shadowRadius: 8 + 10 * lift.value,
    elevation: 7 + 8 * lift.value,
  }));

  const rise = () => {
    lift.value = withSpring(1, { damping: 16, stiffness: 240, mass: 0.7 });
    city?.pressIn();
  };
  const fall = () => {
    lift.value = withSpring(0, { damping: 18, stiffness: 220, mass: 0.8 });
    city?.pressOut();
  };

  const body = (
    <View style={[styles.note, { backgroundColor: color }]}>
      <View style={styles.tapeWrap} pointerEvents="none">
        <View style={styles.tape} />
      </View>
      <View style={[styles.curl, { backgroundColor: shade(color) }]} pointerEvents="none" />
      {children}
    </View>
  );

  if (!onPress) {
    return <Animated.View style={[styles.wrap, anim, style]}>{body}</Animated.View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={rise}
      onPressOut={fall}
      style={[styles.press, style]}
    >
      <Animated.View style={[styles.wrap, anim, styles.fill]}>{body}</Animated.View>
    </Pressable>
  );
}

function shade(hex: string): string {
  if (!hex.startsWith('#') || hex.length < 7) return 'rgba(40, 28, 16, 0.18)';
  const n = parseInt(hex.slice(1, 7), 16);
  const r = Math.max(0, ((n >> 16) & 255) - 28);
  const g = Math.max(0, ((n >> 8) & 255) - 28);
  const b = Math.max(0, (n & 255) - 22);
  return `rgb(${r},${g},${b})`;
}

const styles = StyleSheet.create({
  press: {
    overflow: 'visible',
  },
  fill: {
    flexGrow: 1,
  },
  wrap: {
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 7 },
  },
  note: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 22,
    paddingBottom: 22,
    overflow: 'hidden',
  },
  tapeWrap: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tape: {
    width: 48,
    height: 12,
    backgroundColor: 'rgba(255, 250, 230, 0.55)',
    transform: [{ rotate: '-3deg' }],
  },
  curl: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 18,
    height: 18,
    transform: [{ rotate: '16deg' }],
  },
});
