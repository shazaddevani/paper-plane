import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Menu padding that clears the hardware. In landscape the notch and the home
 * indicator sit on the long edges, which is exactly where the headers and the
 * back buttons live, so every scrolling screen adds the insets to its own
 * padding rather than sitting inside a safe-area view.
 */
export function useScreenPadding(base = 22) {
  const insets = useSafeAreaInsets();
  return {
    paddingLeft: base + insets.left,
    paddingRight: base + insets.right,
    paddingTop: base + insets.top,
    paddingBottom: base + insets.bottom,
  };
}
