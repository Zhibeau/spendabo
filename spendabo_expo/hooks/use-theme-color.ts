/**
 * Simplified theme color hook – the app now uses a single (light) design system.
 * This hook is kept for backwards compatibility with any remaining template components.
 */
import { Colors } from "@/constants/theme";

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors
) {
  const colorFromProps = props.light;
  if (colorFromProps) {
    return colorFromProps;
  }
  return Colors[colorName] as string;
}
