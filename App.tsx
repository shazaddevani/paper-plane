import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppReveal } from './src/components/AppReveal';

import { PaperGrain } from './src/components/PaperGrain';
import { RotatePrompt } from './src/components/Rotate';
import { describeItem } from './src/game/catalog';
import { PALETTE } from './src/game/constants';
import { dailySeed, todayKey } from './src/game/rng';
import { RunSummary } from './src/game/rewards';
import { GameScreen } from './src/screens/GameScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { HowToScreen } from './src/screens/HowToScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { ShedScreen } from './src/screens/ShedScreen';
import { StickersScreen } from './src/screens/StickersScreen';
import {
  EquippedSlots,
  Profile,
  RunApplication,
  applyRun,
  equipItem,
  loadProfile,
  purchaseItem,
  saveProfile,
} from './src/storage/profile';

type Route =
  | { name: 'home' }
  | {
      name: 'game';
      mode: 'daily' | 'practice';
      seed: number;
      dayKey: string;
      runKey: number;
      /** First run ever: coach the moves in Yard 1. */
      coach?: boolean;
    }
  | { name: 'results'; summary: RunSummary; application: RunApplication }
  | { name: 'shed' }
  | { name: 'stickers' }
  | { name: 'howto'; firstTime?: boolean };

function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}

function Root() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const { width, height } = useWindowDimensions();

  // Expo Go honours the manifest orientation inconsistently across platforms,
  // so ask for landscape ourselves and fall back to a prompt if we are refused.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(
      () => undefined,
    );
  }, []);

  useEffect(() => {
    if (__DEV__ || Platform.OS === 'web') return;
    let cancelled = false;
    const pull = () =>
      Updates.checkForUpdateAsync()
        .then(async (result) => {
          if (cancelled || !result.isAvailable) return;
          await Updates.fetchUpdateAsync();
          if (!cancelled) await Updates.reloadAsync();
        })
        .catch(() => undefined);
    pull();
    const retry = setTimeout(pull, 2500);
    return () => {
      cancelled = true;
      clearTimeout(retry);
    };
  }, []);

  useEffect(() => {
    let active = true;
    loadProfile().then((loaded) => {
      if (!active) return;
      setProfile(loaded);
      // First time in: straight into Yard 1, with the moves coached in play.
      if (!loaded.seenHowTo) {
        const day = todayKey();
        setRoute({
          name: 'game',
          mode: 'daily',
          seed: dailySeed(day),
          dayKey: day,
          runKey: Date.now(),
          coach: true,
        });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const commit = useCallback((next: Profile) => {
    setProfile(next);
    void saveProfile(next);
  }, []);

  const markHowToSeen = useCallback(() => {
    setProfile((current) => {
      if (!current || current.seenHowTo) return current;
      const next = { ...current, seenHowTo: true };
      void saveProfile(next);
      return next;
    });
  }, []);

  const startDaily = useCallback(() => {
    const day = todayKey();
    setRoute({ name: 'game', mode: 'daily', seed: dailySeed(day), dayKey: day, runKey: Date.now() });
  }, []);

  const startPractice = useCallback(() => {
    setRoute({
      name: 'game',
      mode: 'practice',
      seed: randomSeed(),
      dayKey: todayKey(),
      runKey: Date.now(),
    });
  }, []);

  const handleFinish = useCallback((summary: RunSummary) => {
    setProfile((current) => {
      if (!current) return current;
      // Having played a run, the player has been through the coached yard.
      const application = applyRun({ ...current, seenHowTo: true }, summary);
      void saveProfile(application.profile);
      setRoute({ name: 'results', summary, application });
      return application.profile;
    });
  }, []);

  const handleRetry = useCallback(() => {
    setRoute((current) => {
      if (current.name !== 'results') return current;
      const { summary } = current;
      return {
        name: 'game',
        mode: summary.mode,
        seed: summary.mode === 'daily' ? dailySeed(summary.dayKey) : randomSeed(),
        dayKey: summary.dayKey,
        runKey: Date.now(),
      };
    });
  }, []);

  const handleBuy = useCallback(
    (itemId: string, price: number) => {
      if (!profile) return;
      const next = purchaseItem(profile, itemId, price);
      if (!next) return;
      const kind = describeItem(itemId)?.kind;
      const slot =
        kind === 'Streamer' ? 'streamer' : kind === 'Upgrade' ? 'upgrade' : kind === 'Plane' ? 'paper' : null;
      commit(slot ? equipItem(next, slot, itemId) : next);
    },
    [commit, profile],
  );

  const handleEquip = useCallback(
    (slot: keyof EquippedSlots, itemId: string | null) => {
      if (!profile) return;
      commit(equipItem(profile, slot, itemId));
    },
    [commit, profile],
  );

  if (!profile) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" hidden />
        <PaperGrain />
        <ActivityIndicator color={PALETTE.warm} />
        <Text style={styles.loadingText}>Folding a plane…</Text>
      </View>
    );
  }

  if (Platform.OS !== 'web' && height > width) {
    return (
      <>
        <StatusBar style="light" hidden />
        <RotatePrompt />
      </>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" hidden />
      <AppReveal />

      {route.name === 'home' ? (
        <HomeScreen
          profile={profile}
          onPlayDaily={startDaily}
          onPlayPractice={startPractice}
          onOpenShed={() => setRoute({ name: 'shed' })}
          onOpenStickers={() => setRoute({ name: 'stickers' })}
          onOpenHowTo={() => setRoute({ name: 'howto' })}
        />
      ) : null}

      {route.name === 'game' ? (
        <GameScreen
          key={route.runKey}
          mode={route.mode}
          coach={route.coach}
          seed={route.seed}
          dayKey={route.dayKey}
          profile={profile}
          onExit={() => setRoute({ name: 'home' })}
          onFinish={handleFinish}
        />
      ) : null}

      {route.name === 'results' ? (
        <ResultsScreen
          summary={route.summary}
          application={route.application}
          onRetry={handleRetry}
          onHome={() => setRoute({ name: 'home' })}
          onOpenShed={() => setRoute({ name: 'shed' })}
        />
      ) : null}

      {route.name === 'shed' ? (
        <ShedScreen
          profile={profile}
          onBuy={handleBuy}
          onEquip={handleEquip}
          onBack={() => setRoute({ name: 'home' })}
        />
      ) : null}

      {route.name === 'stickers' ? (
        <StickersScreen profile={profile} onBack={() => setRoute({ name: 'home' })} />
      ) : null}

      {route.name === 'howto' ? (
        <HowToScreen
          firstTime={route.firstTime}
          onBack={() => {
            markHowToSeen();
            setRoute({ name: 'home' });
          }}
          onPlay={() => {
            markHowToSeen();
            startDaily();
          }}
        />
      ) : null}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: PALETTE.skyTop,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: PALETTE.skyTop,
  },
  loadingText: {
    color: PALETTE.textMuted,
    fontSize: 13,
    letterSpacing: 0.6,
  },
});
