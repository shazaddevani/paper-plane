import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { GROUND_Y } from '../game/constants';
import { Layout } from '../game/layout';
import { createRng } from '../game/rng';
import { YardTheme } from '../game/yardTheme';
import { FILL, NO_TOUCH } from './fill';

/**
 * A puffy cloud built from round lobes over a flat base, crisp at any screen
 * density. The group fades as one so the overlaps do not show darker.
 */
function PuffyCloud({
  left,
  top,
  width,
  height,
  color,
  opacity,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
}) {
  const lobes = [
    { x: 0.08, d: 1.25 },
    { x: 0.3, d: 1.9 },
    { x: 0.56, d: 1.55 },
    { x: 0.74, d: 1.15 },
  ];
  const boxH = height * 2;
  return (
    <View
      needsOffscreenAlphaCompositing
      style={{ position: 'absolute', left, top: top - height, width, height: boxH, opacity }}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height,
          borderRadius: height / 2,
          backgroundColor: color,
        }}
      />
      {lobes.map((lobe, i) => {
        const d = Math.min(boxH, height * lobe.d);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: width * lobe.x,
              bottom: height * 0.18,
              width: d,
              height: d,
              borderRadius: d / 2,
              backgroundColor: color,
            }}
          />
        );
      })}
    </View>
  );
}

/** A run of garden fence panels that scrolls slower than the yard itself. */
function FenceLine({
  cameraX,
  layout,
  parallax,
  bottom,
  height,
  color,
  postColor,
}: {
  cameraX: SharedValue<number>;
  layout: Layout;
  parallax: number;
  bottom: number;
  height: number;
  color: string;
  postColor: string;
}) {
  const tileWidth = Math.max(320, layout.width);
  const pickets = Math.max(6, Math.round(tileWidth / 26));

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: -((cameraX.value * layout.scale * parallax) % tileWidth) }],
  }));

  return (
    <Animated.View style={[styles.layer, { bottom, height }, animated]}>
      {[0, 1, 2].map((tile) => (
        <View
          key={tile}
          style={{ position: 'absolute', left: tile * tileWidth, width: tileWidth, height: '100%' }}
        >
          {Array.from({ length: pickets }, (_, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                bottom: 0,
                left: (tileWidth / pickets) * i,
                width: tileWidth / pickets - 5,
                height: height * (i % 3 === 0 ? 1 : 0.93),
                backgroundColor: color,
                borderTopLeftRadius: 3,
                borderTopRightRadius: 3,
              }}
            />
          ))}
          <View
            style={{
              position: 'absolute',
              bottom: height * 0.34,
              left: 0,
              right: 0,
              height: Math.max(3, height * 0.09),
              backgroundColor: postColor,
            }}
          />
        </View>
      ))}
    </Animated.View>
  );
}

/** Round-topped trees over the fence, kept as flat silhouettes. */
function TreeLine({
  cameraX,
  layout,
  parallax,
  bottom,
  color,
  seed,
}: {
  cameraX: SharedValue<number>;
  layout: Layout;
  parallax: number;
  bottom: number;
  color: string;
  seed: string;
}) {
  const tileWidth = Math.max(320, layout.width);
  const size = Math.max(70, layout.height * 0.2);

  const trees = useMemo(() => {
    const rng = createRng(seed);
    return Array.from({ length: 6 }, (_, i) => ({
      key: `tree-${i}`,
      x: (tileWidth / 6) * i + rng.range(-24, 24),
      width: size * rng.range(0.7, 1.35),
      height: size * rng.range(0.62, 1.1),
    }));
  }, [seed, size, tileWidth]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: -((cameraX.value * layout.scale * parallax) % tileWidth) }],
  }));

  return (
    <Animated.View style={[styles.layer, { bottom, height: size * 1.4 }, animated]}>
      {[0, 1, 2].map((tile) => (
        <View
          key={tile}
          style={{ position: 'absolute', left: tile * tileWidth, width: tileWidth, height: '100%' }}
        >
          {trees.map((tree) => (
            <View
              key={tree.key}
              style={{
                position: 'absolute',
                bottom: 0,
                left: tree.x,
                width: tree.width,
                height: tree.height,
                backgroundColor: color,
                borderTopLeftRadius: tree.width * 0.5,
                borderTopRightRadius: tree.width * 0.5,
                borderBottomLeftRadius: tree.width * 0.16,
                borderBottomRightRadius: tree.width * 0.16,
              }}
            />
          ))}
        </View>
      ))}
    </Animated.View>
  );
}

export const Backdrop = React.memo(function Backdrop({
  cameraX,
  layout,
  seed,
  theme,
}: {
  cameraX: SharedValue<number>;
  layout: Layout;
  seed: string;
  theme: YardTheme;
}) {
  const tileWidth = Math.max(320, layout.width);

  // Everything in the distance is hung off the grass line rather than the
  // bottom of the screen, so the fence keeps its feet on the ground whatever
  // shape the window or phone turns out to be.
  const groundBottom = layout.height - (layout.offsetY + GROUND_Y * layout.scale);
  const skyHeight = layout.height - groundBottom;
  const fenceHeight = Math.max(46, skyHeight * 0.17);
  const horizon = Math.max(0.5, Math.min(0.995, skyHeight / layout.height));

  const clouds = useMemo(() => {
    const rng = createRng(`clouds::${seed}::${theme.id}`);
    return Array.from({ length: theme.cloudCount }, (_, i) => ({
      key: `cloud-${i}`,
      x: rng.range(0, tileWidth),
      // Keep clear of the title and score along the top of the screen.
      y: rng.range(skyHeight * 0.24, skyHeight * 0.56),
      width: rng.range(90, 220),
      height: rng.range(16, 30),
      opacity: rng.range(theme.cloudMin, theme.cloudMax),
    }));
  }, [seed, skyHeight, theme.cloudCount, theme.cloudMax, theme.cloudMin, theme.id, tileWidth]);

  const stars = useMemo(() => {
    if (!theme.stars) return [];
    const rng = createRng(`stars::${seed}::${theme.id}`);
    return Array.from({ length: 28 }, (_, i) => ({
      key: `star-${i}`,
      x: rng.range(8, Math.max(16, layout.width - 8)),
      y: rng.range(8, Math.max(16, skyHeight * 0.62)),
      size: rng.range(1.2, 2.6),
      opacity: rng.range(0.25, 0.85),
    }));
  }, [layout.width, seed, skyHeight, theme.id, theme.stars]);

  const cloudStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -((cameraX.value * layout.scale * 0.06) % tileWidth) }],
  }));

  const sunSize = Math.max(96, skyHeight * (theme.moon ? 0.22 : 0.36));
  const showDisc = theme.moon || theme.sunOpacity > 0;

  return (
    <View style={[FILL, NO_TOUCH]}>
      <LinearGradient
        colors={theme.sky}
        locations={[0, horizon * 0.34, horizon * 0.62, horizon * 0.86, horizon]}
        style={FILL}
      />

      {stars.map((star) => (
        <View
          key={star.key}
          style={{
            position: 'absolute',
            left: star.x,
            top: star.y,
            width: star.size,
            height: star.size,
            borderRadius: star.size,
            backgroundColor: '#F4EFE4',
            opacity: star.opacity,
          }}
        />
      ))}

      {showDisc ? (
        // A soft halo first, then the disc, so the light reads as light.
        <View
          style={{
            position: 'absolute',
            left: layout.width * (theme.moon ? 0.74 : 0.64) - sunSize * 0.35,
            bottom: groundBottom - sunSize * (theme.moon ? 0.08 : 0.34) - sunSize * 0.35,
            width: sunSize * 1.7,
            height: sunSize * 1.7,
            borderRadius: sunSize * 0.85,
            backgroundColor: theme.sun,
            opacity: (theme.moon ? 0.78 : theme.sunOpacity) * 0.18,
          }}
        />
      ) : null}
      {showDisc ? (
        <View
          style={{
            position: 'absolute',
            left: layout.width * (theme.moon ? 0.74 : 0.64),
            bottom: groundBottom - sunSize * (theme.moon ? 0.08 : 0.34),
            width: sunSize,
            height: sunSize,
            borderRadius: sunSize / 2,
            backgroundColor: theme.sun,
            opacity: theme.moon ? 0.78 : theme.sunOpacity,
          }}
        />
      ) : null}

      <Animated.View style={[FILL, cloudStyle, NO_TOUCH]}>
        {[0, 1, 2].map((tile) => (
          <View
            key={tile}
            style={{
              position: 'absolute',
              left: tile * tileWidth,
              width: tileWidth,
              height: '100%',
            }}
          >
            {clouds.map((cloud) => (
              <PuffyCloud
                key={cloud.key}
                left={cloud.x}
                top={cloud.y}
                width={cloud.width}
                height={cloud.height}
                color={theme.cloud}
                opacity={cloud.opacity}
              />
            ))}
          </View>
        ))}
      </Animated.View>

      <TreeLine
        cameraX={cameraX}
        layout={layout}
        parallax={0.14}
        bottom={groundBottom + fenceHeight * 0.45}
        color={theme.treeFar}
        seed={`far::${seed}`}
      />

      <TreeLine
        cameraX={cameraX}
        layout={layout}
        parallax={0.28}
        bottom={groundBottom + fenceHeight * 0.2}
        color={theme.treeNear}
        seed={`near::${seed}`}
      />

      <FenceLine
        cameraX={cameraX}
        layout={layout}
        parallax={0.42}
        bottom={groundBottom}
        height={fenceHeight}
        color={theme.fence}
        postColor={theme.fenceDark}
      />
      {/* No paper grain over the yard: the tiled texture upscales on sharp
          screens and made the whole scene look soft. Menus keep it. */}
    </View>
  );
});

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    pointerEvents: 'none',
    left: 0,
    right: 0,
  },
});
