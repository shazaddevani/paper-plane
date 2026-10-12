import { GROUND_Y } from './constants';

/** High enough to keep the hoops on screen, low enough that the yard stays readable. */
const VIEW_TOP = 70;
const VIEW_BOTTOM = GROUND_Y + 52;

export type Layout = {
  width: number;
  height: number;
  scale: number;
  offsetY: number;
  visibleWidth: number;
};

export function computeLayout(width: number, height: number): Layout {
  const band = VIEW_BOTTOM - VIEW_TOP;
  const scale = Math.min((height - 8) / band, width / 860);
  return {
    width,
    height,
    scale,
    offsetY: 4 - VIEW_TOP * scale,
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
