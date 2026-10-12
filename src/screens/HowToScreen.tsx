import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LiveCity } from '../components/LiveCity';
import { STICKY, StickyNote } from '../components/StickyNote';
import { useScreenPadding } from '../components/screenPadding';
import { GhostButton } from '../components/ui';
import { BIRO, BIRO_SOFT } from '../game/constants';

const MOVES = [
  { n: '1', gesture: 'Tap', result: 'The dart glides across the yard.' },
  { n: '2', gesture: 'Hold', result: 'The nose climbs.' },
  { n: '3', gesture: 'Keep holding', result: 'It loops back toward you.' },
  { n: '4', gesture: 'Pull down', result: 'It dives. A full bar makes that a power dive.' },
] as const;

export function HowToScreen({
  onBack,
  onPlay,
}: {
  onBack: () => void;
  onPlay: () => void;
}) {
  const padding = useScreenPadding(14);

  return (
    <LiveCity>
      <View style={[styles.page, padding]}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.kicker}>One page</Text>
            <Text style={styles.title}>How to throw</Text>
          </View>
          <GhostButton label="Back" onPress={onBack} />
        </View>

        <View style={styles.sheetWrap}>
          <View style={styles.sheet}>
            <View style={styles.moves}>
              {MOVES.map((move) => (
                <View key={move.n} style={styles.move}>
                  <Text style={styles.num}>{move.n}</Text>
                  <View style={styles.moveText}>
                    <Text style={styles.gesture}>{move.gesture}</Text>
                    <Text style={styles.result}>{move.result}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.rule} />

            <Text style={styles.aim}>
              Pop every balloon to finish the yard. The string hangs down to whatever it is tied
              to. Hoops add score. The next yard is harder, and “That's enough” ends the sitting.
            </Text>
          </View>
        </View>

        <StickyNote color={STICKY.canary} rotate={-0.4} onPress={onPlay} style={styles.play}>
          <Text style={styles.playText}>Throw today's yards</Text>
        </StickyNote>
      </View>
    </LiveCity>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heading: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: 'rgba(244, 239, 228, 0.7)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#F4EFE4',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 1,
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 0,
    paddingVertical: 8,
  },
  sheet: {
    backgroundColor: '#F7EEDC',
    paddingHorizontal: 22,
    paddingVertical: 16,
    transform: [{ rotate: '-0.4deg' }],
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  moves: {
    gap: 8,
  },
  move: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  num: {
    ...BIRO,
    width: 22,
    fontSize: 18,
    fontWeight: '800',
  },
  moveText: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  gesture: {
    ...BIRO,
    width: 118,
    fontSize: 16,
    fontWeight: '800',
  },
  result: {
    ...BIRO_SOFT,
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  rule: {
    height: 1,
    backgroundColor: 'rgba(30, 42, 68, 0.18)',
    marginVertical: 10,
  },
  aim: {
    ...BIRO,
    fontSize: 14,
    lineHeight: 19,
  },
  play: {
    alignSelf: 'flex-start',
  },
  playText: {
    ...BIRO,
    fontSize: 16,
    fontWeight: '800',
  },
});
