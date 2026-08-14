import {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
} from '@expo-google-fonts/fredoka';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AchievementToasts } from '../src/ui/AchievementToast';
import { StickerChoiceDialog } from '../src/ui/StickerChoiceDialog';
import { colors } from '../src/ui/theme';

// Hold the splash until the fonts are ready, so nothing renders in the system
// face and then reflows.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or the module isn't available — not worth failing over.
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
  });

  useEffect(() => {
    // Hide on error too: shipping in the system font beats a splash that never
    // goes away.
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Explicit at the root because the overlays below are siblings of
          `Stack`, not screens inside it. Screens get a provider from
          react-navigation for free; anything mounted alongside the navigator
          does not, and a `SafeAreaView` without one has no insets to read. */}
      <SafeAreaProvider>
        <StatusBar style="light" />
        {/* No headers anywhere: navigation is icons and pieces, because the
            player cannot read. Words on screen support meaning, never carry
            it. */}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />

        {/* Both sit above every screen, so an achievement earned in the
            campaign, in Endless or in Mix is announced the same way without
            any of them knowing about it.

            The choice comes first in the tree and the toasts second, so a
            toast still reads over the dialog's scrim rather than being buried
            by it — the two can legitimately overlap after a level that earned
            both. */}
        <StickerChoiceDialog />
        <AchievementToasts />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
