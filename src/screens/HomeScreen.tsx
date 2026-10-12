import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LiveCity } from '../components/LiveCity';
import { PlaneEmblem } from '../components/PlaneEmblem';
import { STICKY, StickyNote } from '../components/StickyNote';
import { useScreenPadding } from '../components/screenPadding';
import { CoinPill, ProgressBar } from '../components/ui';
import { PALETTE } from '../game/constants';
import { findPaper, findStreamer } from '../game/catalog';
import { generateLevel } from '../game/levelGen';
import { STICKERS, levelFromXp } from '../game/rewards';
import { dailySeed, msUntilNextDay, todayKey } from '../game/rng';
import { Profile, effectiveStreak, hasClearedToday } from '../storage/profile';

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${hours}h ${`${minutes}`.padStart(2, '0')}m`;
}

const INK = { color: '#1E2A44' };
const MUTED = { color: '#4A4338' };

export function HomeScreen({
  profile,
  onPlayDaily,
  onPlayPractice,
  onOpenShed,
  onOpenStickers,
  onOpenHowTo,
  onToggleSound,
  onToggleMusic,
}: {
  profile: Profile;
  onPlayDaily: () => void;
  onPlayPractice: () => void;
  onOpenShed: () => void;
  onOpenStickers: () => void;
  onOpenHowTo: () => void;
  onToggleSound: () => void;
  onToggleMusic: () => void;
}) {
  const today = todayKey();
  const [countdown, setCountdown] = useState(() => msUntilNextDay());

  useEffect(() => {
    const timer = setInterval(() => setCountdown(msUntilNextDay()), 1000);
    return () => clearInterval(timer);
  }, []);

  const level = useMemo(() => generateLevel(dailySeed(today), today, 1), [today]);
  const info = levelFromXp(profile.xp);
  const streak = effectiveStreak(profile, today);
  const clearedToday = hasClearedToday(profile, today);
  const bestToday = profile.bestScoreByDay[today] ?? 0;

  const paper = findPaper(profile.equipped.paper);
  const streamer = findStreamer(profile.equipped.streamer);
  const padding = useScreenPadding();

  return (
    <LiveCity>
      <ScrollView contentContainerStyle={[styles.scroll, padding]}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <PlaneEmblem paper={paper} streamer={streamer} size={46} />
            <View style={styles.brandText}>
              <Text style={styles.wordmark}>Paper Plane</Text>
              <Text style={styles.tagline}>Tap to flap. Hold to climb. Hold longer to loop.</Text>
              <Text style={styles.equippedFold}>
                {paper.name} · {streamer.name}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.headerPills}>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: profile.musicOn }}
                accessibilityLabel="Background music"
                onPress={onToggleMusic}
                style={({ pressed }) => [styles.soundPill, pressed && styles.soundPillPressed]}
              >
                <Text style={styles.soundText}>{profile.musicOn ? 'Music on' : 'Music off'}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: profile.soundOn }}
                accessibilityLabel="Sound effects"
                onPress={onToggleSound}
                style={({ pressed }) => [styles.soundPill, pressed && styles.soundPillPressed]}
              >
                <Text style={styles.soundText}>{profile.soundOn ? 'Sound on' : 'Sound off'}</Text>
              </Pressable>
              <CoinPill amount={profile.coins} />
            </View>
            <View style={styles.levelBlock}>
              <Text style={styles.levelText}>Level {info.level}</Text>
              <ProgressBar progress={info.progress} height={6} tint={PALETTE.sticky} />
            </View>
          </View>
        </View>

        <View style={styles.columns}>
          <StickyNote color={STICKY.canary} rotate={-2.4} style={styles.dailyNote} onPress={onPlayDaily}>
            <Text style={styles.kicker}>Out the back · today</Text>
            <Text style={styles.dailyTitle}>{level.title}</Text>
            <Text style={styles.dailyMeta}>
              {level.balloons.length} balloons, {level.hoops.length} hoops, {level.throws} sheets
            </Text>
            {clearedToday ? <Text style={styles.doneMark}>already folded this one</Text> : null}

            <View style={styles.dailyStats}>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{bestToday ? bestToday.toLocaleString() : '—'}</Text>
                <Text style={styles.statLabel}>best</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{formatCountdown(countdown)}</Text>
                <Text style={styles.statLabel}>new yards</Text>
              </View>
            </View>

            <View style={styles.peelTab}>
              <Text style={styles.peelText}>{clearedToday ? 'Have another go' : 'Go on then'}</Text>
            </View>
          </StickyNote>

          <View style={styles.sideColumn}>
            <StickyNote color={STICKY.peach} rotate={1.8} style={styles.streakNote}>
              <Text style={styles.streakCount}>{streak}</Text>
              <Text style={styles.streakTitle}>
                {streak === 0 ? 'No days in a row yet' : streak === 1 ? 'day in a row' : 'days in a row'}
              </Text>
              <Text style={styles.streakBlurb}>
                {streak === 0
                  ? 'Finish a yard before midnight and the box gets better.'
                  : clearedToday
                    ? 'Safe until tomorrow. Skip a day and it snaps.'
                    : 'Do it before midnight or it snaps.'}
              </Text>
            </StickyNote>

            <View style={styles.navRow}>
              <StickyNote color={STICKY.mint} rotate={-1.3} onPress={onPlayPractice} style={styles.navNote}>
                <Text style={styles.smallTitle}>Just chucking it</Text>
                <Text style={styles.smallBody}>Random yards. Nothing on the line.</Text>
              </StickyNote>
              <StickyNote color={STICKY.pink} rotate={1.1} onPress={onOpenHowTo} style={styles.navNote}>
                <Text style={styles.smallTitle}>How to throw</Text>
                <Text style={styles.smallBody}>Tap, hold, dive. The whole lesson.</Text>
              </StickyNote>
            </View>

            <View style={styles.navRow}>
              <StickyNote color={STICKY.sky} rotate={2.1} onPress={onOpenShed} style={styles.navNote}>
                <Text style={styles.smallTitle}>The Shed</Text>
                <Text style={styles.smallBody}>Endless folds, streamers, clips</Text>
              </StickyNote>
              <StickyNote color={STICKY.lilac} rotate={-1.6} onPress={onOpenStickers} style={styles.navNote}>
                <Text style={styles.smallTitle}>Stickers</Text>
                <Text style={styles.smallBody}>
                  {profile.stickers.length}/{STICKERS.length} stuck in
                </Text>
              </StickyNote>
            </View>
          </View>
        </View>
      </ScrollView>
    </LiveCity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070B18',
  },
  scroll: {
    gap: 16,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  brandText: {
    marginLeft: 8,
  },
  wordmark: {
    color: '#F4EFE4',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  tagline: {
    color: 'rgba(244, 239, 228, 0.72)',
    fontSize: 13,
    marginTop: 6,
  },
  equippedFold: {
    color: 'rgba(255, 229, 106, 0.88)',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },
  headerPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  soundPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(244, 239, 228, 0.35)',
    backgroundColor: 'rgba(10, 14, 28, 0.35)',
  },
  soundPillPressed: {
    backgroundColor: 'rgba(244, 239, 228, 0.18)',
  },
  soundText: {
    color: '#F4EFE4',
    fontSize: 12,
    fontWeight: '800',
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  levelBlock: {
    width: 168,
    gap: 5,
  },
  levelText: {
    color: 'rgba(244, 239, 228, 0.7)',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  columns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'flex-start',
  },
  dailyNote: {
    flexGrow: 1,
    flexBasis: 320,
    minHeight: 220,
  },
  kicker: {
    ...MUTED,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  dailyTitle: {
    ...INK,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    marginTop: 12,
  },
  dailyMeta: {
    ...MUTED,
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  doneMark: {
    ...INK,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },
  dailyStats: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 22,
  },
  statCell: {
    flex: 1,
  },
  statValue: {
    ...INK,
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    ...MUTED,
    fontSize: 11,
    marginTop: 3,
  },
  peelTab: {
    alignSelf: 'flex-start',
    marginTop: 16,
    backgroundColor: '#1E2A44',
    paddingVertical: 8,
    paddingHorizontal: 14,
    transform: [{ rotate: '-1deg' }],
  },
  peelText: {
    color: '#FFE56A',
    fontSize: 14,
    fontWeight: '800',
  },
  sideColumn: {
    flexGrow: 1,
    flexBasis: 260,
    gap: 14,
  },
  streakNote: {
    minHeight: 120,
  },
  streakCount: {
    ...INK,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '800',
  },
  streakTitle: {
    ...INK,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    marginTop: 6,
  },
  streakBlurb: {
    ...MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  smallTitle: {
    ...INK,
    fontSize: 16,
    fontWeight: '800',
  },
  smallBody: {
    ...MUTED,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 17,
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
  },
  navNote: {
    flex: 1,
    minHeight: 92,
  },
});
