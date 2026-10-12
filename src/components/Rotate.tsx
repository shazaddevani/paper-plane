import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PALETTE } from '../game/constants';
import { PaperGrain } from './PaperGrain';

/**
 * Shown when the window is taller than it is wide. Landscape is requested at
 * startup, but the lock can be refused — a tablet with rotation off, a phone
 * held flat, or a browser window someone has made narrow — and a garden squeezed
 * into a portrait window is not worth playing.
 */
export function RotatePrompt() {
  return (
    <View style={styles.root}>
      <PaperGrain />
      <View style={styles.phone}>
        <View style={styles.screen} />
        <View style={styles.button} />
      </View>
      <Text style={styles.title}>Turn sideways</Text>
      <Text style={styles.body}>
        The garden runs left to right, so the plane needs the long edge of your screen.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 32,
    backgroundColor: PALETTE.skyTop,
  },
  phone: {
    width: 78,
    height: 132,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: PALETTE.panelEdge,
    padding: 7,
    marginBottom: 6,
    transform: [{ rotate: '-18deg' }],
  },
  screen: {
    flex: 1,
    borderRadius: 7,
    backgroundColor: 'rgba(242, 180, 114, 0.16)',
  },
  button: {
    alignSelf: 'center',
    width: 26,
    height: 3,
    borderRadius: 2,
    marginTop: 6,
    backgroundColor: PALETTE.panelEdge,
  },
  title: {
    color: PALETTE.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  body: {
    color: PALETTE.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 300,
  },
});
