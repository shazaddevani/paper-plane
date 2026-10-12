import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { Backdrop } from '../components/Backdrop';
import { YardLaunch } from '../components/YardLaunch';
import { FILL } from '../components/fill';
import { Hud } from '../components/Hud';
import { useScreenPadding } from '../components/screenPadding';
import { STICKY, StickyNote } from '../components/StickyNote';
import { HoopFlashRegistry, Stage } from '../components/Stage';
import { BALLOON, BIRO, BIRO_SOFT, MATERIALS, PHYSICS, PLANE_START_X, RUN, SCORING } from '../game/constants';
import { findPaper, findStreamer, findUpgrade, mergeFlight } from '../game/catalog';
import { computeLayout } from '../game/layout';
import { generateLevel } from '../game/levelGen';
import { DamageEvent, GameWorld, STRIDE } from '../game/physics';
import { RunSummary } from '../game/rewards';
import { pickYardTheme } from '../game/yardTheme';
import { Profile } from '../storage/profile';

const SETTLE_TIMEOUT_MS = 3000;
const FLIGHT_TIMEOUT_MS = 16000;

type Phase = 'ready' | 'flight' | 'settling' | 'cleared' | 'done';

export type GameStats = {
  score: number;
  planesLeft: number;
  planesTotal: number;
  combo: number;
  charge: number;
  balloonsLeft: number;
  balloonsTotal: number;
  hoopPasses: number;
  diving: boolean;
  holding: boolean;
  looping: boolean;
  powerDiving: boolean;
  powerName: string;
  phase: Phase;
  stage: number;
};

type SessionTotals = {
  yardsCleared: number;
  planesUsed: number;
  planesTotal: number;
  balloonsTotal: number;
  titles: string[];
  foldedCurrentYard: boolean;
  fewestPlanesForClear: number | null;
  mostSparePlanes: number;
};

export function GameScreen({
  mode,
  seed,
  dayKey,
  profile,
  onExit: _onExit,
  onFinish,
}: {
  mode: 'daily' | 'practice';
  seed: number;
  dayKey: string;
  profile: Profile;
  onExit: () => void;
  onFinish: (summary: RunSummary) => void;
}) {
  void _onExit;
  const { width, height } = useWindowDimensions();
  const layout = useMemo(() => computeLayout(width, height), [width, height]);

  const [stage, setStage] = useState(1);

  const level = useMemo(
    () => generateLevel(seed, mode === 'daily' ? dayKey : null, stage),
    [seed, dayKey, mode, stage],
  );

  const upgrade = useMemo(() => findUpgrade(profile.equipped.upgrade), [profile.equipped.upgrade]);
  const paper = useMemo(() => findPaper(profile.equipped.paper), [profile.equipped.paper]);
  const streamer = useMemo(
    () => findStreamer(profile.equipped.streamer),
    [profile.equipped.streamer],
  );
  const tune = useMemo(() => mergeFlight(paper, upgrade), [paper, upgrade]);
  const yardTheme = useMemo(() => pickYardTheme(stage), [stage]);

  const totalThrows = level.throws + tune.extraThrows;
  const balloonsTotal = level.balloons.length;

  const frame = useSharedValue<number[]>([]);
  // The dart gets its own tiny channel so it can move every frame cheaply.
  const planeFrame = useSharedValue<number[]>([]);
  const cameraX = useSharedValue(0);
  const clock = useSharedValue(0);
  const divePos = useSharedValue({ x: 0, y: 0 });
  const diveT = useSharedValue(1);
  const hoopRegistry: HoopFlashRegistry = useRef({});

  const worldRef = useRef<GameWorld | null>(null);
  const [world, setWorld] = useState<GameWorld | null>(null);

  const phaseRef = useRef<Phase>('ready');
  const holdingRef = useRef(false);
  const divingRef = useRef(false);
  const holdStartRef = useRef(0);
  const wasLoopingRef = useRef(false);
  const leadRef = useRef(0.28);
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const totalThrowsRef = useRef(totalThrows);
  totalThrowsRef.current = totalThrows;
  const balloonsTotalRef = useRef(balloonsTotal);
  balloonsTotalRef.current = balloonsTotal;
  const titleRef = useRef(level.title);
  titleRef.current = level.title;

  const runRef = useRef({
    score: 0,
    combo: 1,
    bestCombo: 1,
    lastBreakAt: 0,
    charge: 0,
    throwsUsed: 0,
    hoopPasses: 0,
    throwHoops: 0,
    bestThrowHoops: 0,
    powerDives: 0,
    itemsSmashed: 0,
    // Per-yard counts, for stickers that ask for something "in one yard".
    yardSmashed: 0,
    yardPowerDives: 0,
    bestYardSmashed: 0,
    bestYardPowerDives: 0,
    balloonsPopped: 0,
    settleElapsed: 0,
    flightElapsed: 0,
    lastHapticAt: 0,
  });

  const sessionRef = useRef<SessionTotals>({
    yardsCleared: 0,
    planesUsed: 0,
    planesTotal: 0,
    balloonsTotal: 0,
    titles: [],
    foldedCurrentYard: false,
    fewestPlanesForClear: null,
    mostSparePlanes: 0,
  });

  const [stats, setStats] = useState<GameStats>({
    score: 0,
    planesLeft: totalThrows,
    planesTotal: totalThrows,
    combo: 1,
    charge: 0,
    balloonsLeft: balloonsTotal,
    balloonsTotal,
    hoopPasses: 0,
    diving: false,
    holding: false,
    looping: false,
    powerDiving: false,
    powerName: paper.power.name,
    phase: 'ready',
    stage: 1,
  });

  const statsDirty = useRef(true);
  const lastStatsPush = useRef(0);

  const buzz = useCallback((style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(style).catch(() => undefined);
  }, []);

  const pushStats = useCallback(() => {
    const currentWorld = worldRef.current;
    if (!currentWorld) return;
    const run = runRef.current;
    const next = {
      score: Math.round(run.score),
      planesLeft: totalThrowsRef.current - run.throwsUsed,
      planesTotal: totalThrowsRef.current,
      combo: run.combo,
      charge: run.charge,
      balloonsLeft: currentWorld.balloonsRemaining,
      balloonsTotal: currentWorld.balloonTotal,
      hoopPasses: run.hoopPasses,
      diving: divingRef.current,
      holding: holdingRef.current && !divingRef.current,
      looping: currentWorld.isLooping,
      powerDiving: currentWorld.isPowerDiving,
      powerName: paper.power.name,
      phase: phaseRef.current,
      stage: stageRef.current,
    };
    setStats((prev) =>
      prev.score === next.score &&
      prev.planesLeft === next.planesLeft &&
      prev.combo === next.combo &&
      prev.charge === next.charge &&
      prev.balloonsLeft === next.balloonsLeft &&
      prev.diving === next.diving &&
      prev.holding === next.holding &&
      prev.looping === next.looping &&
      prev.powerDiving === next.powerDiving &&
      prev.phase === next.phase &&
      prev.stage === next.stage
        ? prev
        : next,
    );
    statsDirty.current = false;
  }, [paper.power.name]);

  const foldCurrentYard = useCallback(() => {
    const session = sessionRef.current;
    if (session.foldedCurrentYard) return;
    session.foldedCurrentYard = true;
    session.planesUsed += runRef.current.throwsUsed;
    session.planesTotal += totalThrowsRef.current;
    session.balloonsTotal += balloonsTotalRef.current;
  }, []);

  const finishRun = useCallback(
    (sittingCleared: boolean) => {
      if (phaseRef.current === 'done') return;
      const wasClearedOverlay = phaseRef.current === 'cleared';
      phaseRef.current = 'done';
      const run = runRef.current;
      const session = sessionRef.current;

      if (!wasClearedOverlay) {
        foldCurrentYard();
      }

      const titles = session.titles.length > 0 ? session.titles : [titleRef.current];

      onFinish({
        mode,
        dayKey,
        levelTitle: titles.join(' · '),
        score: Math.round(run.score),
        cleared: sittingCleared || session.yardsCleared >= 1,
        yardsCleared: session.yardsCleared,
        planesUsed: session.planesUsed,
        planesTotal: session.planesTotal,
        hoopPasses: run.hoopPasses,
        bestThrowHoops: run.bestThrowHoops,
        powerDives: run.powerDives,
        bestCombo: run.bestCombo,
        itemsSmashed: run.itemsSmashed,
        fewestPlanesForClear: session.fewestPlanesForClear,
        mostSparePlanes: session.mostSparePlanes,
        bestYardSmashed: run.bestYardSmashed,
        bestYardPowerDives: run.bestYardPowerDives,
        balloonsPopped: run.balloonsPopped,
        balloonsTotal: session.balloonsTotal,
      });
    },
    [dayKey, foldCurrentYard, mode, onFinish],
  );

  const awardYardClear = useCallback(() => {
    if (phaseRef.current === 'cleared' || phaseRef.current === 'done') return;
    const run = runRef.current;
    const session = sessionRef.current;

    run.score += SCORING.clearBonus;
    run.score += Math.max(0, totalThrowsRef.current - run.throwsUsed) * SCORING.throwUnused;
    session.titles.push(titleRef.current);
    session.fewestPlanesForClear =
      session.fewestPlanesForClear === null
        ? run.throwsUsed
        : Math.min(session.fewestPlanesForClear, run.throwsUsed);
    session.mostSparePlanes = Math.max(
      session.mostSparePlanes,
      totalThrowsRef.current - run.throwsUsed,
    );
    foldCurrentYard();
    session.yardsCleared += 1;
    phaseRef.current = 'cleared';
    holdingRef.current = false;
    divingRef.current = false;
    holdStartRef.current = 0;
    statsDirty.current = true;
    pushStats();
  }, [foldCurrentYard, pushStats]);

  const continueToNextYard = useCallback(() => {
    if (phaseRef.current !== 'cleared') return;
    sessionRef.current.foldedCurrentYard = false;
    setStage((current) => current + 1);
  }, []);

  const leaveYard = useCallback(() => {
    finishRun(sessionRef.current.yardsCleared >= 1);
  }, [finishRun]);

  useEffect(() => {
    const run = runRef.current;

    const onDamage = (event: DamageEvent) => {
      const now = Date.now();
      run.score += event.amount * 2.4;
      run.charge = Math.min(
        RUN.chargeMax,
        run.charge + event.amount * RUN.chargePerDamage * tune.chargeScale,
      );

      if (event.destroyed) {
        run.combo =
          now - run.lastBreakAt < RUN.comboWindowMs ? Math.min(RUN.maxCombo, run.combo + 1) : 1;
        run.lastBreakAt = now;
        run.bestCombo = Math.max(run.bestCombo, run.combo);

        if (event.kind === 'balloon') {
          run.balloonsPopped += 1;
          run.score += BALLOON.score * run.combo;
          buzz(Haptics.ImpactFeedbackStyle.Heavy);
        } else {
          run.itemsSmashed += 1;
          run.yardSmashed += 1;
          run.bestYardSmashed = Math.max(run.bestYardSmashed, run.yardSmashed);
          run.score += MATERIALS[event.material ?? 'cardboard'].score * run.combo;
        }
      } else if (event.impulse > 14 && now - run.lastHapticAt > 90) {
        run.lastHapticAt = now;
        buzz(Haptics.ImpactFeedbackStyle.Light);
      }

      statsDirty.current = true;
    };

    const onHoopPass = ({ hoopIndex }: { hoopIndex: number }) => {
      run.hoopPasses += 1;
      run.throwHoops += 1;
      run.bestThrowHoops = Math.max(run.bestThrowHoops, run.throwHoops);
      run.score += SCORING.hoopPass * tune.hoopScoreScale;
      run.charge = Math.min(RUN.chargeMax, run.charge + RUN.hoopCharge * tune.chargeScale);
      const flash = hoopRegistry.current[hoopIndex];
      if (flash) {
        flash.value = 1;
        flash.value = withTiming(0, { duration: 620 });
      }
      buzz(Haptics.ImpactFeedbackStyle.Medium);
      statsDirty.current = true;
    };

    const instance = new GameWorld(level, {
      onDamage,
      onHoopPass,
      damageScale: upgrade?.effect.damageScale ?? 1,
    });
    worldRef.current = instance;
    setWorld(instance);
    const first = instance.buildFrame();
    frame.value = instance.takeChangedFrame(first) ?? first.slice();
    planeFrame.value = [
      ...first.slice(instance.planeFrameOffset, instance.planeFrameOffset + STRIDE),
      1,
    ];
    run.throwsUsed = 0;
    run.throwHoops = 0;
    run.yardSmashed = 0;
    run.yardPowerDives = 0;
    run.settleElapsed = 0;
    run.flightElapsed = 0;
    holdingRef.current = false;
    divingRef.current = false;
    holdStartRef.current = 0;
    phaseRef.current = 'ready';
    statsDirty.current = true;
    pushStats();

    return () => {
      instance.destroy();
      worldRef.current = null;
    };
  }, [buzz, frame, level, planeFrame, pushStats, tune, upgrade]);

  useEffect(() => {
    if (!world) return;

    const visibleWidth = layout.visibleWidth;
    const maxCamera = Math.max(0, level.worldWidth - visibleWidth);
    const readyTarget = Math.max(0, Math.min(maxCamera, PLANE_START_X - visibleWidth * 0.22));

    // Open on the yard so the player can read the stacks, then pull back to the
    // throwing line before the first plane goes out.
    cameraX.value = maxCamera;

    let raf = 0;
    let previous = 0;
    let accumulator = 0;
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;
      const delta = previous ? Math.min(64, now - previous) : PHYSICS.fixedStep;
      previous = now;
      accumulator += delta;

      const flying = phaseRef.current === 'flight';
      let steps = 0;
      while (accumulator >= PHYSICS.fixedStep && steps < PHYSICS.maxStepsPerFrame) {
        world.step(PHYSICS.fixedStep, {
          holding: flying && holdingRef.current,
          diving: flying && divingRef.current,
          loop:
            flying &&
            holdingRef.current &&
            !divingRef.current &&
            holdStartRef.current > 0 &&
            now - holdStartRef.current >= PHYSICS.loopAfterMs / tune.loopScale,
        });
        accumulator -= PHYSICS.fixedStep;
        steps += 1;
      }
      if (accumulator > PHYSICS.fixedStep * 4) accumulator = 0;

      if (world.isLooping !== wasLoopingRef.current) {
        // Refresh the hint both ways, or "Looping back" outlives the loop.
        if (world.isLooping) buzz(Haptics.ImpactFeedbackStyle.Medium);
        statsDirty.current = true;
      }
      wasLoopingRef.current = world.isLooping;

      const alpha = accumulator / PHYSICS.fixedStep;
      const built = world.buildFrame(alpha);
      const planePose = built.slice(world.planeFrameOffset, world.planeFrameOffset + STRIDE);
      planePose.push(world.rollAt(alpha));
      planeFrame.value = planePose;
      const changed = world.takeChangedFrame(built);
      if (changed) frame.value = changed;
      clock.value = now;

      const run = runRef.current;
      const plane = world.planeBody;
      let target = readyTarget;

      if (flying && plane) {
        // Ease the lead when the dart turns around, or the camera whips across.
        const wantLead = world.facingSign >= 0 ? 0.28 : 0.72;
        leadRef.current += (wantLead - leadRef.current) * (1 - Math.exp(-delta / 420));
        const lead = leadRef.current;
        // Follow where the dart is drawn, not the raw sim, or the two shimmy.
        target = world.renderPlaneX - visibleWidth * lead;
      } else if (
        phaseRef.current === 'settling' ||
        phaseRef.current === 'done' ||
        phaseRef.current === 'cleared'
      ) {
        target = cameraX.value;
      }

      const clamped = Math.max(0, Math.min(maxCamera, target));
      // Ease by elapsed time, not per frame, so 60 Hz and 120 Hz screens pan alike.
      const cameraFollow = 1 - Math.exp(-delta / (flying ? 60 : 110));
      cameraX.value += (clamped - cameraX.value) * cameraFollow;

      if (flying) {
        run.flightElapsed += delta;
        if (world.isPlaneOutOfBounds()) {
          world.removePlane();
          holdingRef.current = false;
          divingRef.current = false;
          holdStartRef.current = 0;
          wasLoopingRef.current = false;
          phaseRef.current = 'settling';
          run.settleElapsed = 0;
          statsDirty.current = true;
        } else if (world.isCrushFinished) {
          world.removePlane();
          holdingRef.current = false;
          divingRef.current = false;
          holdStartRef.current = 0;
          wasLoopingRef.current = false;
          phaseRef.current = 'settling';
          run.settleElapsed = 0;
          statsDirty.current = true;
        } else if (
          !world.isCrushed &&
          (world.hasLanded || world.isPlaneStopped() || run.flightElapsed > FLIGHT_TIMEOUT_MS)
        ) {
          world.crushPlane();
          holdingRef.current = false;
          divingRef.current = false;
          holdStartRef.current = 0;
          wasLoopingRef.current = false;
          buzz(Haptics.ImpactFeedbackStyle.Heavy);
          statsDirty.current = true;
        }
      } else if (phaseRef.current === 'settling') {
        run.settleElapsed += delta;
        if (world.isSettled() || run.settleElapsed > SETTLE_TIMEOUT_MS) {
          if (world.balloonsRemaining === 0) {
            awardYardClear();
          } else if (run.throwsUsed >= totalThrowsRef.current) {
            finishRun(sessionRef.current.yardsCleared >= 1);
          } else {
            phaseRef.current = 'ready';
            run.throwHoops = 0;
            statsDirty.current = true;
          }
        }
      }

      // A chain ends when the window runs out, not just at the next break.
      if (run.combo > 1 && Date.now() - run.lastBreakAt > RUN.comboWindowMs) {
        run.combo = 1;
        statsDirty.current = true;
      }

      if (statsDirty.current && now - lastStatsPush.current > 90) {
        lastStatsPush.current = now;
        pushStats();
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [
    awardYardClear,
    buzz,
    cameraX,
    finishRun,
    frame,
    layout.visibleWidth,
    planeFrame,
    level.worldWidth,
    pushStats,
    tune,
    world,
  ]);

  const throwPlane = useCallback(() => {
    const currentWorld = worldRef.current;
    if (!currentWorld || phaseRef.current !== 'ready') return;
    const run = runRef.current;

    currentWorld.throwPlane({
      density: PHYSICS.planeDensity * tune.densityScale,
      speed: PHYSICS.launchSpeed * tune.speedScale,
      turnScale: tune.turnScale,
      climbScale: tune.climbScale,
      loopScale: tune.loopScale,
      gravityScale: tune.gravityScale,
      glideScale: tune.glideScale,
      diveScale: tune.diveScale,
      damageScale: tune.damageScale,
      airFriction: PHYSICS.planeAirFriction * tune.airFrictionScale,
      restitution: tune.restitution,
      radiusScale: tune.radiusScale,
      pierce: tune.pierce,
      smash: tune.smash,
    });

    leadRef.current = 0.28;
    run.throwsUsed += 1;
    run.throwHoops = 0;
    run.flightElapsed = 0;
    phaseRef.current = 'flight';
    buzz(Haptics.ImpactFeedbackStyle.Medium);
    statsDirty.current = true;
  }, [buzz, paper, tune]);

  const pressIn = useCallback(() => {
    if (phaseRef.current === 'cleared' || phaseRef.current === 'done') return;

    if (phaseRef.current === 'ready') {
      throwPlane();
      holdingRef.current = true;
      divingRef.current = false;
      holdStartRef.current = performance.now();
      statsDirty.current = true;
      return;
    }

    if (phaseRef.current !== 'flight') return;
    holdingRef.current = true;
    divingRef.current = false;
    holdStartRef.current = performance.now();
    statsDirty.current = true;
  }, [throwPlane]);

  const pressMove = useCallback((dy: number) => {
    if (phaseRef.current !== 'flight' || !holdingRef.current) return;
    // iPhone presses jitter 20–50px. Only a real downward swipe counts as a dive.
    const pullingDown = divingRef.current ? dy > 72 : dy > 110;
    if (pullingDown === divingRef.current) return;
    if (pullingDown) holdStartRef.current = 0;
    else if (holdingRef.current) holdStartRef.current = performance.now();
    divingRef.current = pullingDown;
    statsDirty.current = true;

    const run = runRef.current;
    const currentWorld = worldRef.current;
    if (
      pullingDown &&
      currentWorld &&
      run.charge >= RUN.chargeMax &&
      currentWorld.startPowerDive()
    ) {
      const plane = currentWorld.planeBody;
      run.charge = 0;
      run.powerDives += 1;
      run.yardPowerDives += 1;
      run.bestYardPowerDives = Math.max(run.bestYardPowerDives, run.yardPowerDives);
      run.score += SCORING.powerDiveBonus;
      if (plane) {
        divePos.value = { x: plane.position.x, y: plane.position.y };
        diveT.value = 0;
        diveT.value = withTiming(1, { duration: 460 });
      }
      buzz(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, [buzz, divePos, diveT]);

  const pressOut = useCallback(() => {
    holdingRef.current = false;
    divingRef.current = false;
    holdStartRef.current = 0;
    statsDirty.current = true;
  }, []);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          phaseRef.current !== 'cleared' && phaseRef.current !== 'done',
        onMoveShouldSetPanResponder: () =>
          phaseRef.current !== 'cleared' && phaseRef.current !== 'done',
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: pressIn,
        onPanResponderMove: (_, gesture) => pressMove(gesture.dy),
        onPanResponderRelease: pressOut,
        onPanResponderTerminate: pressOut,
      }),
    [pressIn, pressMove, pressOut],
  );

  const nextYard = stage + 1;
  const clearedPad = useScreenPadding(20);

  return (
    <View style={styles.container}>
      <Backdrop
        cameraX={cameraX}
        layout={layout}
        seed={`${mode}::${seed}::${stage}`}
        theme={yardTheme}
      />

      {world ? (
        <Stage
          world={world}
          frame={frame}
          planeFrame={planeFrame}
          cameraX={cameraX}
          clock={clock}
          divePos={divePos}
          diveT={diveT}
          layout={layout}
          paper={paper}
          streamer={streamer}
          theme={yardTheme}
          hoopRegistry={hoopRegistry}
        />
      ) : null}

      <View
        collapsable={false}
        style={styles.touchCatcher}
        {...responder.panHandlers}
      />

      {stats.phase === 'cleared' ? (
        <View style={[FILL, styles.clearedLayer, clearedPad]}>
          <StickyNote color={STICKY.canary} rotate={-1.2} style={styles.clearedCard}>
            <Text style={styles.clearedKicker}>Yard {stage}</Text>
            <Text style={styles.clearedTitle}>That yard is done.</Text>
            <Text style={styles.clearedBody}>Yard {nextYard} is waiting.</Text>
            <View style={styles.clearedActions}>
              <StickyNote color={STICKY.mint} rotate={1.1} onPress={continueToNextYard} style={styles.clearedButton}>
                <Text style={styles.clearedButtonLabel}>Next yard</Text>
              </StickyNote>
              <StickyNote color={STICKY.sky} rotate={-0.8} onPress={leaveYard} style={styles.clearedButton}>
                <Text style={styles.clearedButtonLabel}>That's enough</Text>
              </StickyNote>
            </View>
          </StickyNote>
        </View>
      ) : null}

      {stats.phase === 'cleared' || stats.phase === 'done' ? null : (
        <Hud
          stats={stats}
          title={`Yard ${stage} · ${level.title}`}
          mode={mode}
          onExit={leaveYard}
        />
      )}
      <YardLaunch key={stage} stage={stage} title={level.title} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  touchCatcher: {
    ...FILL,
    zIndex: 1,
    // iOS skips hits on fully empty views; keep a hair of alpha so holds register.
    backgroundColor: 'rgba(255,255,255,0.001)',
  },
  clearedLayer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 12, 14, 0.42)',
    zIndex: 30,
  },
  clearedCard: {
    width: '100%',
    maxWidth: 460,
  },
  clearedKicker: {
    ...BIRO_SOFT,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'left',
  },
  clearedTitle: {
    ...BIRO,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'left',
    marginTop: 4,
  },
  clearedBody: {
    ...BIRO,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'left',
    marginTop: 6,
  },
  clearedActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  clearedButton: {
    flex: 1,
  },
  clearedButtonLabel: {
    ...BIRO,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
});
