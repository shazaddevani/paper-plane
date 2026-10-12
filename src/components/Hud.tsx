import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { INK, INK_MUTED, PALETTE, RUN } from '../game/constants';
import { GameStats } from '../screens/GameScreen';
import { NO_TOUCH, PASS_TOUCH } from './fill';
import { PlanePip } from './ui';

function hintFor(stats: GameStats): string {
  switch (stats.phase) {
    case 'ready':
      return stats.planesLeft === stats.planesTotal
        ? 'Tap to throw. Hold to climb. Hold longer to loop back.'
        : 'Tap to throw the next one';
    case 'flight':
      if (stats.powerDiving) return 'Power dive';
      if (stats.looping) return 'Looping back';
      if (stats.charge >= RUN.chargeMax) return 'Pull down for a power dive';
      if (stats.diving) return 'Diving';
      if (stats.holding) return 'Climbing — keep holding to turn around';
      return 'Hold to climb. Hold longer to loop back.';
    case 'settling':
      return 'Letting it settle';
    case 'cleared':
      return 'That yard is done';
    default:
      return '';
  }
}

export function Hud({
  stats,
  title,
  mode,
  onExit,
}: {
  stats: GameStats;
  title: string;
  mode: 'daily' | 'practice';
  onExit: () => void;
}) {
  const charged = stats.charge >= RUN.chargeMax;
  const insets = useSafeAreaInsets();

  const padH = {
    paddingLeft: 16 + insets.left,
    paddingRight: 16 + insets.right,
  };

  return (
    <>
      {/* A soft shade behind the top bar so white text reads on any sky. */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(8, 12, 20, 0.38)', 'rgba(8, 12, 20, 0)']}
        style={[styles.topScrim, { height: 96 + insets.top }]}
      />
      <View
        pointerEvents="box-none"
        style={[styles.topChrome, padH, { paddingTop: 14 + insets.top }]}
      >
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Leave the yard"
            onPress={onExit}
            style={({ pressed }) => [styles.exit, pressed && styles.exitPressed]}
          >
            <Text style={styles.exitGlyph}>{'\u2039'}</Text>
          </Pressable>

          <View style={styles.titleBlock}>
            <Text style={styles.mode} numberOfLines={1}>
              {mode === 'daily' ? "Today's yards" : 'Practice'}
            </Text>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.powerName} numberOfLines={1}>
              {stats.powerName}
            </Text>
          </View>

          <View style={styles.scoreBlock}>
            <Text style={styles.score} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}>
              {stats.score.toLocaleString()}
            </Text>
            <Text
              style={stats.combo > 1 ? styles.combo : styles.scoreLabel}
              numberOfLines={1}
            >
              {stats.combo > 1 ? `${stats.combo}x` : 'Score'}
            </Text>
          </View>

          <View style={styles.targets}>
            <Text style={styles.smallLabel}>Balloons</Text>
            <View style={styles.targetRow}>
              {Array.from({ length: stats.balloonsTotal }, (_, i) => (
                <View
                  key={`balloon-${i}`}
                  style={[
                    styles.targetDot,
                    i >= stats.balloonsLeft && styles.targetDotPopped,
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      </View>

      <View
        pointerEvents="none"
        style={[styles.bottomChrome, padH, { paddingBottom: 14 + insets.bottom }]}
      >
        <View style={styles.bottomRow}>
          <View style={styles.planeBlock}>
            <Text style={styles.smallLabel}>Planes</Text>
            <View style={styles.pipRow}>
              {Array.from({ length: stats.planesTotal }, (_, i) => (
                <PlanePip key={`plane-${i}`} filled={i < stats.planesLeft} color={PALETTE.paper} />
              ))}
            </View>
          </View>

          <Text style={styles.hint} numberOfLines={2}>
            {hintFor(stats)}
          </Text>

          <View style={styles.diveBlock}>
            <Text style={[styles.smallLabel, charged && styles.smallLabelHot]}>
              {charged ? 'Power dive ready' : 'Power dive'}
            </Text>
            <View style={styles.diveTrackWrap}>
              <View style={styles.diveInk} />
              <View style={styles.diveInkSoft} />
              <View style={styles.diveTrack}>
                <View
                  style={[
                    styles.diveFill,
                    {
                      width: `${Math.min(100, (stats.charge / RUN.chargeMax) * 100)}%`,
                      backgroundColor: charged ? PALETTE.warm : PALETTE.sky,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
    pointerEvents: 'none',
  },
  topChrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 4,
    ...PASS_TOUCH,
  },
  bottomChrome: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 3,
  },
  topRow: {
    ...PASS_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 14,
  },
  exit: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 22, 24, 0.8)',
    borderWidth: 1,
    borderColor: PALETTE.panelEdge,
  },
  exitPressed: {
    backgroundColor: 'rgba(242, 180, 114, 0.3)',
  },
  exitGlyph: {
    color: PALETTE.text,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '700',
  },
  titleBlock: {
    ...NO_TOUCH,
    flex: 1,
    minWidth: 0,
  },
  mode: {
    ...INK_MUTED,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'left',
  },
  title: {
    ...INK,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'left',
    textShadowColor: 'rgba(8, 6, 12, 0.72)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  powerName: {
    ...INK_MUTED,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: 3,
    textAlign: 'left',
  },
  scoreBlock: {
    ...NO_TOUCH,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    flexShrink: 0,
    gap: 6,
    height: 34,
    maxWidth: 168,
    overflow: 'hidden',
  },
  score: {
    ...INK,
    flexShrink: 1,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: 0.4,
    textAlign: 'right',
    textShadowColor: 'rgba(8, 6, 12, 0.72)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  scoreLabel: {
    ...INK_MUTED,
    flexShrink: 0,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  combo: {
    flexShrink: 0,
    color: PALETTE.warm,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  targets: {
    ...NO_TOUCH,
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  smallLabel: {
    ...INK_MUTED,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  smallLabelHot: {
    color: PALETTE.warm,
  },
  targetRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    marginTop: 4,
    gap: 5,
  },
  targetDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: PALETTE.danger,
  },
  targetDotPopped: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(224, 96, 90, 0.4)',
  },
  bottomRow: {
    ...NO_TOUCH,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
  },
  planeBlock: {
    minWidth: 100,
  },
  pipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  hint: {
    flex: 1,
    textAlign: 'left',
    ...INK,
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.85,
    paddingBottom: 4,
  },
  diveBlock: {
    width: 150,
    alignItems: 'flex-end',
  },
  diveTrackWrap: {
    width: '100%',
    height: 12,
    marginTop: 6,
    justifyContent: 'center',
  },
  diveInk: {
    position: 'absolute',
    left: 0,
    right: 4,
    height: 7,
    borderRadius: 2,
    backgroundColor: 'rgba(28, 18, 16, 0.38)',
    transform: [{ rotate: '-0.6deg' }],
  },
  diveInkSoft: {
    position: 'absolute',
    left: 8,
    right: 0,
    bottom: 1,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(28, 18, 16, 0.22)',
    transform: [{ rotate: '0.4deg' }],
  },
  diveTrack: {
    width: '96%',
    height: 5,
    borderRadius: 1,
    overflow: 'hidden',
    transform: [{ rotate: '-0.5deg' }],
  },
  diveFill: {
    height: '100%',
    borderRadius: 1,
  },
});
