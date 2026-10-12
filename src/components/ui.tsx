import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { INK, INK_MUTED, PALETTE } from '../game/constants';
import { FILL, NO_TOUCH } from './fill';

export function Panel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <InkPanel style={style}>{children}</InkPanel>;
}

export function Title({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Label({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Body({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

export function PrimaryButton({
  label,
  sublabel,
  onPress,
  disabled,
  tone = 'warm',
  style,
}: {
  label: string;
  sublabel?: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'warm' | 'sky' | 'green';
  style?: StyleProp<ViewStyle>;
}) {
  const tint = tone === 'sky' ? PALETTE.sky : tone === 'green' ? PALETTE.green : PALETTE.warm;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primary,
        { borderColor: tint, backgroundColor: pressed ? `${tint}33` : `${tint}1F` },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.primaryLabel, { color: tint }]}>{label}</Text>
      {sublabel ? (
        <Text style={[styles.primarySub, { textAlign: 'center' }]}>{sublabel}</Text>
      ) : null}
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.ghost, pressed && styles.ghostPressed, style]}
    >
      <Text style={styles.ghostLabel}>{label}</Text>
    </Pressable>
  );
}

export function CoinPill({ amount, style }: { amount: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.coinPill, style]}>
      <View style={styles.coin} />
      <Text style={styles.coinText}>{amount.toLocaleString()}</Text>
    </View>
  );
}

export function ProgressBar({
  progress,
  tint = PALETTE.warm,
  height = 8,
  style,
}: {
  progress: number;
  tint?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.progressTrack, { height, borderRadius: height / 2 }, style]}>
      <View
        style={{
          width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: tint,
        }}
      />
    </View>
  );
}

/** A tiny folded-plane glyph, used to count throws left. */
export function PlanePip({
  filled,
  color,
  size = 14,
}: {
  filled: boolean;
  color: string;
  size?: number;
}) {
  return (
    <View style={{ width: size + 5, height: size * 0.72, marginRight: 4 }}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: size,
          borderTopWidth: size * 0.36,
          borderBottomWidth: size * 0.36,
          borderLeftColor: filled ? color : 'transparent',
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          opacity: filled ? 1 : 0.35,
        }}
      />
      {!filled ? (
        <View
          style={{
            position: 'absolute',
            left: 1,
            top: size * 0.3,
            width: size - 3,
            height: 1.5,
            backgroundColor: color,
            opacity: 0.3,
          }}
        />
      ) : null}
    </View>
  );
}

export function Pip({ filled, color, size = 10 }: { filled: boolean; color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        marginRight: 5,
        backgroundColor: filled ? color : 'transparent',
        borderWidth: 1.5,
        borderColor: filled ? color : `${color}66`,
      }}
    />
  );
}

/** Two or three slightly rotated charcoal strokes instead of a 1px hairline. */
export function InkRule({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[inkStyles.rule, NO_TOUCH, style]}>
      <View style={inkStyles.strokeA} />
      <View style={inkStyles.strokeB} />
      <View style={inkStyles.strokeC} />
    </View>
  );
}

/** Warm fill with organic ink edges instead of a hairline border. */
export function InkPanel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[inkStyles.panel, style]}>
      <View style={[FILL, NO_TOUCH]}>
        <View style={inkStyles.topRule}>
          <InkRule />
        </View>
        <View style={inkStyles.bottomRule}>
          <InkRule />
        </View>
        <View style={inkStyles.leftStroke} />
        <View style={inkStyles.rightStroke} />
      </View>
      {children}
    </View>
  );
}

const inkStyles = StyleSheet.create({
  rule: {
    height: 10,
    justifyContent: 'center',
    overflow: 'visible',
  },
  strokeA: {
    height: 2.1,
    width: '100%',
    borderRadius: 1,
    backgroundColor: 'rgba(28, 18, 16, 0.35)',
    transform: [{ rotate: '-0.6deg' }],
  },
  strokeB: {
    height: 1.05,
    width: '78%',
    marginTop: 2,
    marginLeft: 10,
    borderRadius: 2,
    backgroundColor: 'rgba(28, 18, 16, 0.22)',
    transform: [{ rotate: '0.45deg' }],
  },
  strokeC: {
    position: 'absolute',
    right: 6,
    top: 1,
    height: 1.4,
    width: '18%',
    borderRadius: 2,
    backgroundColor: 'rgba(28, 18, 16, 0.16)',
    transform: [{ rotate: '-1.1deg' }],
  },
  panel: {
    backgroundColor: PALETTE.panel,
    borderRadius: 18,
    padding: 18,
    overflow: 'visible',
  },
  topRule: {
    position: 'absolute',
    left: 10,
    right: 14,
    top: 4,
  },
  bottomRule: {
    position: 'absolute',
    left: 16,
    right: 8,
    bottom: 3,
  },
  leftStroke: {
    position: 'absolute',
    left: 5,
    top: 18,
    bottom: 16,
    width: 2.2,
    borderRadius: 2,
    backgroundColor: 'rgba(28, 18, 16, 0.28)',
    transform: [{ rotate: '-0.6deg' }],
  },
  rightStroke: {
    position: 'absolute',
    right: 7,
    top: 22,
    bottom: 14,
    width: 1.4,
    borderRadius: 2,
    backgroundColor: 'rgba(28, 18, 16, 0.2)',
    transform: [{ rotate: '0.5deg' }],
  },
});

const styles = StyleSheet.create({
  title: {
    ...INK,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'left',
  },
  label: {
    ...INK_MUTED,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    textAlign: 'left',
  },
  body: {
    ...INK,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'left',
  },
  primary: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  primarySub: {
    color: PALETTE.textMuted,
    fontSize: 11,
    marginTop: 3,
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.4,
  },
  ghost: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(185, 168, 148, 0.4)',
  },
  ghostPressed: {
    backgroundColor: 'rgba(242, 180, 114, 0.2)',
  },
  ghostLabel: {
    color: PALETTE.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(242, 179, 61, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(242, 179, 61, 0.45)',
  },
  coin: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: PALETTE.coin,
    borderWidth: 1.5,
    borderColor: '#C98A2A',
  },
  coinText: {
    color: PALETTE.coin,
    fontSize: 14,
    fontWeight: '800',
  },
  progressTrack: {
    width: '100%',
    backgroundColor: 'rgba(242, 180, 114, 0.18)',
    overflow: 'hidden',
  },
});
