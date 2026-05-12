import { useFonts } from "expo-font";
import {
  EBGaramond_400Regular,
  EBGaramond_400Regular_Italic,
  EBGaramond_500Medium,
  EBGaramond_500Medium_Italic,
} from "@expo-google-fonts/eb-garamond";
import {
  Spectral_400Regular,
  Spectral_400Regular_Italic,
  Spectral_500Medium,
  Spectral_500Medium_Italic,
} from "@expo-google-fonts/spectral";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono";

// Loads every variant the theme tokens reference. Each export keys the font
// under its exported name (e.g. "EBGaramond_500Medium"), which matches the
// strings in tokens.ts. Returns [loaded, error] from useFonts.
export const useAppFonts = (): readonly [boolean, Error | null] => {
  const [loaded, error] = useFonts({
    EBGaramond_400Regular,
    EBGaramond_400Regular_Italic,
    EBGaramond_500Medium,
    EBGaramond_500Medium_Italic,

    Spectral_400Regular,
    Spectral_400Regular_Italic,
    Spectral_500Medium,
    Spectral_500Medium_Italic,

    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,

    JetBrainsMono_400Regular,
  });
  return [loaded, error];
};
