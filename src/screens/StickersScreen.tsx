import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { LiveCity } from '../components/LiveCity';
import { StickyNote, stickyColor, stickyTilt } from '../components/StickyNote';
import { useScreenPadding } from '../components/screenPadding';
import { CoinPill, GhostButton, Label } from '../components/ui';
import { BIRO, BIRO_SOFT, PALETTE } from '../game/constants';
import { STICKERS, levelFromXp } from '../game/rewards';
import { Profile } from '../storage/profile';

export function StickersScreen({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  const info = levelFromXp(profile.xp);
  const earned = STICKERS.filter((sticker) => profile.stickers.includes(sticker.id)).length;
  const padding = useScreenPadding();

  const stats: { value: string; label: string }[] = [
    { value: `${profile.totals.runs}`, label: 'Runs' },
    { value: `${profile.totals.clears}`, label: 'Cleared' },
    { value: `${profile.totals.balloons}`, label: 'Balloons' },
    { value: `${profile.totals.hoops}`, label: 'Hoops' },
    { value: `${profile.totals.items}`, label: 'Smashed' },
    { value: `${profile.bestStreak}`, label: 'Best streak' },
  ];

  return (
    <LiveCity>
      <ScrollView contentContainerStyle={[styles.scroll, padding]}>
        <View style={styles.header}>
          <View>
            <Label>Sticker book</Label>
            <Text style={styles.title}>
              {earned} of {STICKERS.length} stuck in
            </Text>
          </View>
          <View style={styles.headerRight}>
            <CoinPill amount={profile.coins} />
            <GhostButton label="Back" onPress={onBack} />
          </View>
        </View>

        <View style={styles.statRow}>
          {stats.map((cell, i) => (
            <StickyNote
              key={cell.label}
              color={stickyColor(i)}
              rotate={stickyTilt(i)}
              style={styles.statNote}
            >
              <Text style={styles.summaryValue}>{cell.value}</Text>
              <Text style={styles.summaryLabel}>{cell.label}</Text>
            </StickyNote>
          ))}
        </View>

        <StickyNote color="#F4EFE4" rotate={-1.1} style={styles.levelCard}>
          <View style={styles.levelRow}>
            <Text style={styles.levelTitle}>Level {info.level}</Text>
            <Text style={styles.levelXp}>
              {info.intoLevel}/{info.needed} xp
            </Text>
          </View>
          <View style={{ marginTop: 10 }}>
            <ProgressTrack progress={info.progress} />
          </View>
        </StickyNote>

        <View style={styles.grid}>
          {STICKERS.map((sticker, i) => {
            const owned = profile.stickers.includes(sticker.id);
            return (
              <StickyNote
                key={sticker.id}
                color={owned ? stickyColor(i) : '#D8D0C0'}
                rotate={stickyTilt(i + 2)}
                style={[styles.card, !owned && styles.cardLocked]}
              >
                <View style={styles.cardInner}>
                  <View style={[styles.badge, owned && styles.badgeOwned]}>
                    <View style={[styles.badgeInner, owned && styles.badgeInnerOwned]} />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.cardName}>{sticker.name}</Text>
                    <Text style={styles.cardReq}>{sticker.requirement}</Text>
                  </View>
                  <Text style={[styles.cardCoins, owned && styles.cardCoinsOwned]}>
                    {owned ? 'Stuck in' : `+${sticker.coins}`}
                  </Text>
                </View>
              </StickyNote>
            );
          })}
        </View>
      </ScrollView>
    </LiveCity>
  );
}

function ProgressTrack({ progress }: { progress: number }) {
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.max(0, Math.min(1, progress)) * 100}%` },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070B18' },
  scroll: { gap: 14 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 8,
  },
  headerRight: { alignItems: 'flex-end', gap: 10 },
  title: { color: '#F4EFE4', fontSize: 26, fontWeight: '800', marginTop: 8, textAlign: 'left' },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statNote: { flexGrow: 1, flexBasis: 88, minWidth: 88 },
  summaryValue: { ...BIRO, fontSize: 20, fontWeight: '800', textAlign: 'left' },
  summaryLabel: {
    ...BIRO_SOFT,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: 2,
    textAlign: 'left',
  },
  levelCard: { gap: 4 },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  levelTitle: { ...BIRO, fontSize: 14, fontWeight: '800', textAlign: 'left' },
  levelXp: { ...BIRO_SOFT, fontSize: 13, fontWeight: '700' },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(30, 42, 68, 0.16)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PALETTE.biro,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: {
    flexGrow: 1,
    flexBasis: 250,
    maxWidth: 400,
  },
  // Grey paper says "not yet"; see-through let the city show through the text.
  cardLocked: {},
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'rgba(30, 42, 68, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOwned: { borderColor: PALETTE.biro },
  badgeInner: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 42, 68, 0.2)',
  },
  badgeInnerOwned: { backgroundColor: PALETTE.biro },
  cardText: { flex: 1 },
  cardName: { ...BIRO, fontSize: 14, fontWeight: '800', textAlign: 'left' },
  cardReq: { ...BIRO_SOFT, fontSize: 11, marginTop: 8, lineHeight: 15, textAlign: 'left' },
  cardCoins: { ...BIRO_SOFT, fontSize: 12, fontWeight: '800' },
  cardCoinsOwned: { color: PALETTE.green },
});
