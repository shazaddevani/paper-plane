import { ViewStyle } from 'react-native';

/** Spreadable absolute fill; RN's StyleSheet.absoluteFill is a registered style. */
export const FILL: ViewStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};

export const NO_TOUCH: ViewStyle = { pointerEvents: 'none' };

/** Lets touches through the container while its children stay interactive. */
export const PASS_TOUCH: ViewStyle = { pointerEvents: 'box-none' };
