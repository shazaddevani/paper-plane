import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { LiveCity } from '../components/LiveCity';
import { STICKY, StickyNote } from '../components/StickyNote';
import { useScreenPadding } from '../components/screenPadding';
import { BIRO, BIRO_SOFT, PALETTE } from '../game/constants';
import { describeItem } from '../game/catalog';
import { BOX_TIERS, RunSummary } from '../game/rewards';
import { RunApplication } from '../storage/profile';

function Row({ label, value, tint }: { label: string; value: string; tint?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
      <Text style={[styles.rowValue, tint ? { color: tint } : null]}>{value}</Text>
    </View>
  );
}

function Scratch() {
  return <View style={styles.scratch} />;
}

function PrizeBox({ application }: { application: RunApplication }) {
  const [opened, setOpened] = useState(false);
  const lid = useSharedValue(0);
  const box = application.box;

  if (!box) return null;

  const tier = BOX_TIERS[box.tier];
  const bonus = box.bonusItemId ? describeItem(box.bonusItemId) : null;

  const lidStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lid.value * -22 }, { rotate: `${lid.value * -14}deg` }],
    opacity: 1 - lid.value * 0.35,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: lid.value * 0.5,
    transform: [{ scale: 0.7 + lid.value * 0.6 }],
  }));

  const open = () => {
    if (opened) return;
    setOpened(true);
    lid.value = withSequence(
      withTiming(-0.12, { duration: 110 }),
      withSpring(1, { damping: 9, stiffness: 130 }),
    );
  };

  return (
    <StickyNote color={STICKY.peach} rotate={0.8} onPress={open} style={styles.card}>
      <View style={styles.boxHead}>
        <Text style={styles.kicker}>{`Streak ${application.streakAfter} · ${tier.label}`}</Text>
        {!opened ? <Text style={styles.boxHint}>Tap to open</Text> : null}
      </View>

      <View style={styles.boxBody}>
        <View style={styles.boxArt}>
          <Animated.View style={[styles.boxGlow, { backgroundColor: tier.edge }, glowStyle]} />
          <View style={[styles.boxShape, { backgroundColor: tier.color }]} />
          <Animated.View style={[styles.boxLid, { backgroundColor: tier.edge }, lidStyle]} />
        </View>

        <View style={styles.boxContents}>
          {opened ? (
            <>
              <Text style={[styles.boxCoins, { color: PALETTE.biro }]}>
                +{box.coins.toLocaleString()} coins
              </Text>
              {bonus ? (
                <Text style={styles.boxBonus}>
                  {bonus.kind} unlocked: {bonus.name}
                </Text>
              ) : (
                <Text style={styles.boxBonusMuted}>Nothing extra inside this time.</Text>
              )}
            </>
          ) : (
            <Text style={styles.boxBonusMuted}>
              Yours for clearing today. The longer the streak, the better the box.
            </Text>
          )}
        </View>
      </View>
    </StickyNote>
  );
}

export function ResultsScreen({
  summary,
  application,
  onRetry,
  onHome,
  onOpenShed,
}: {
  summary: RunSummary;
  application: RunApplication;
  onRetry: () => void;
  onHome: () => void;
  onOpenShed: () => void;
}) {
  const { levelAfter, leveledUp } = application;
  const padding = useScreenPadding(12);

  // Leaving early is not the same as running out of planes.
  const outcome =
    summary.yardsCleared <= 0
      ? summary.planesUsed < summary.planesTotal
        ? 'Left the yard'
        : 'Out of planes'
      : summary.yardsCleared === 1
        ? 'One yard done'
        : `${summary.yardsCleared} yards done`;

  return (
    <LiveCity>
      <View style={[styles.page, padding]}>
        <View style={styles.headline}>
          <Text style={[styles.outcome, { color: summary.yardsCleared > 0 ? '#B6DFC2' : '#F5B8C8' }]}>
            {outcome}
          </Text>
          <Text style={styles.subheadSoft} numberOfLines={1}>
            {summary.yardsCleared} yard{summary.yardsCleared === 1 ? '' : 's'} ·{' '}
            {summary.balloonsPopped}/{summary.balloonsTotal} balloons · {summary.planesUsed} of{' '}
            {summary.planesTotal} planes thrown
          </Text>
        </View>

        <View style={styles.grid}>
          <StickyNote color={STICKY.canary} rotate={-1.1} style={styles.card}>
            <Text style={styles.kicker}>Score</Text>
            <Text style={styles.score}>{summary.score.toLocaleString()}</Text>
            {application.isNewBest && summary.mode === 'daily' ? (
              <Text style={styles.newBest}>New best for today</Text>
            ) : null}

            <Scratch />

            <Row label="Hoops flown through" value={`${summary.hoopPasses}`} />
            <Row label="Best chain" value={`${summary.bestCombo}x`} />
            <Row label="Power dives" value={`${summary.powerDives}`} />
            <Row label="Things smashed" value={`${summary.itemsSmashed}`} />
          </StickyNote>

          <StickyNote color={STICKY.mint} rotate={0.9} style={styles.card}>
            <Text style={styles.kicker}>Coins earned</Text>
            <Text style={styles.coinTotal}>+{application.totalCoins.toLocaleString()}</Text>

            <Scratch />

            <Row label="From score" value={`+${application.coins.base}`} />
            <Row label="Hoop bonus" value={`+${application.coins.hoops}`} />
            {application.coins.clear > 0 ? (
              <Row label="Clear bonus" value={`+${application.coins.clear}`} />
            ) : null}
            {application.box ? (
              <Row label="Prize box" value={`+${application.box.coins}`} />
            ) : null}
            {application.stickerCoins > 0 ? (
              <Row label="Stickers" value={`+${application.stickerCoins}`} />
            ) : null}

            <Scratch />

            <View style={styles.levelRow}>
              <Text style={styles.levelLabel}>Level {levelAfter.level}</Text>
              <Text style={styles.levelXp}>+{application.xpGained} xp</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.max(0, Math.min(1, levelAfter.progress)) * 100}%`,
                    backgroundColor: leveledUp ? PALETTE.biro : '#3F7A48',
                  },
                ]}
              />
            </View>
            {leveledUp ? (
              <Text style={styles.levelUp}>Level up — new stock in The Shed</Text>
            ) : null}
          </StickyNote>

          <View style={styles.sideStack}>
            <PrizeBox application={application} />

            {application.newStickers.length > 0 ? (
              <StickyNote color={STICKY.lilac} rotate={-1.4} style={styles.card}>
                <Text style={styles.kicker}>New stickers</Text>
                {application.newStickers.map((sticker) => (
                  <View key={sticker.id} style={styles.stickerRow}>
                    <View style={styles.stickerDot} />
                    <View style={styles.stickerText}>
                      <Text style={styles.stickerName}>{sticker.name}</Text>
                      <Text style={styles.stickerReq}>{sticker.requirement}</Text>
                    </View>
                    <Text style={styles.stickerCoins}>+{sticker.coins}</Text>
                  </View>
                ))}
              </StickyNote>
            ) : null}

            {summary.mode === 'daily' && !summary.cleared ? (
              <StickyNote color={STICKY.pink} rotate={2.1} style={styles.card}>
                <Text style={styles.noteText}>
                  The streak moves when you finish at least one yard in today&apos;s chain. The
                  first garden is laid out the same way on every attempt, so you can learn the line.
                </Text>
              </StickyNote>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          <StickyNote color={STICKY.canary} rotate={-1.5} onPress={onRetry} style={styles.action}>
            <Text style={styles.peelText}>Throw again</Text>
          </StickyNote>
          <StickyNote color={STICKY.sky} rotate={1.2} onPress={onOpenShed} style={styles.action}>
            <Text style={styles.peelText}>The Shed</Text>
          </StickyNote>
          <StickyNote color="#F4EFE4" rotate={-0.7} onPress={onHome} style={styles.action}>
            <Text style={styles.peelText}>Home</Text>
          </StickyNote>
        </View>
      </View>
    </LiveCity>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, overflow: 'hidden', gap: 10 },
  headline: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  outcome: { fontSize: 18, fontWeight: '800', letterSpacing: 0.2, textAlign: 'left' },
  subheadSoft: {
    flex: 1,
    color: 'rgba(244, 239, 228, 0.72)',
    fontSize: 12,
    textAlign: 'left',
  },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'nowrap', gap: 12, minHeight: 0 },
  card: { flex: 1, minWidth: 0 },
  sideStack: { flex: 1, minWidth: 0, gap: 8 },
  kicker: {
    ...BIRO_SOFT,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  score: { ...BIRO, fontSize: 26, fontWeight: '800', marginTop: 4, textAlign: 'left' },
  newBest: { ...BIRO, fontSize: 12, fontWeight: '800', marginTop: 4 },
  coinTotal: { ...BIRO, fontSize: 26, fontWeight: '800', marginTop: 4 },
  scratch: {
    height: 2,
    backgroundColor: 'rgba(30, 42, 68, 0.22)',
    marginVertical: 6,
    transform: [{ rotate: '-0.6deg' }],
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2, gap: 8 },
  rowLabel: { ...BIRO_SOFT, flex: 1, fontSize: 12, textAlign: 'left' },
  rowValue: { ...BIRO, fontSize: 12, fontWeight: '800' },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  levelLabel: { ...BIRO, fontSize: 13, fontWeight: '800' },
  levelXp: { ...BIRO_SOFT, fontSize: 13, fontWeight: '700' },
  levelUp: { ...BIRO, fontSize: 12, fontWeight: '800', marginTop: 8 },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(30, 42, 68, 0.16)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%' },
  boxHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  boxHint: { ...BIRO_SOFT, fontSize: 11, fontWeight: '800' },
  boxBody: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  boxArt: { width: 48, height: 44, alignItems: 'center', justifyContent: 'flex-end' },
  boxGlow: { position: 'absolute', width: 48, height: 48, borderRadius: 24, bottom: -4 },
  boxShape: { width: 36, height: 26 },
  boxLid: { position: 'absolute', bottom: 22, width: 42, height: 11 },
  boxContents: { flex: 1, gap: 4 },
  boxCoins: { fontSize: 16, fontWeight: '800' },
  boxBonus: { ...BIRO, fontSize: 12, fontWeight: '800', textAlign: 'left' },
  boxBonusMuted: { ...BIRO_SOFT, fontSize: 12, lineHeight: 17, textAlign: 'left' },
  stickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  stickerDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: PALETTE.biro,
  },
  stickerText: { flex: 1 },
  stickerName: { ...BIRO, fontSize: 13, fontWeight: '800', textAlign: 'left' },
  stickerReq: { ...BIRO_SOFT, fontSize: 11, marginTop: 1, textAlign: 'left' },
  stickerCoins: { ...BIRO, fontSize: 13, fontWeight: '800' },
  noteText: { ...BIRO, fontSize: 13, lineHeight: 18, textAlign: 'left' },
  actions: { flexDirection: 'row', flexWrap: 'nowrap', gap: 10 },
  action: { flex: 1, minWidth: 0 },
  peelText: { ...BIRO, fontSize: 15, fontWeight: '800', textAlign: 'center' },
});
