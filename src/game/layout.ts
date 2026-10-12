import { WORLD_HEIGHT } from './constants';

export type Layout = {
  width: number;
  height: number;
  scale: number;
  offsetY: number;
  visibleWidth: number;
};

/**
 * The whole yard, sky to grass, fits the screen height, the way the released
 * game framed it. Cropping in to the stacks made everything look zoomed and
 * hid the top of a climb.
 */
export function computeLayout(width: number, height: number): Layout {
  const scale = height / WORLD_HEIGHT;
  return {
    width,
    height,
    scale,
    offsetY: 0,
    visibleWidth: width / scale,
  };
}

export function screenToWorld(
  layout: Layout,
  cameraX: number,
  screenX: number,
  screenY: number,
): { x: number; y: number } {
  return {
    x: screenX / layout.scale + cameraX,
    y: (screenY - layout.offsetY) / layout.scale,
  };
}
