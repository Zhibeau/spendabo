import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

// Keep the native splash visible until fonts are ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      {/*
        Navigation flow:
          / (index)       → Splash screen (2.5s) → /onboarding
          /onboarding     → 3-step carousel       → /auth
          /auth           → Sign in / Sign up      → /(tabs)
          /(tabs)         → Main app
      */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index"    options={{ animation: "none" }} />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)"   options={{ animation: "none" }} />
        <Stack.Screen
          name="transaction/[id]"
          options={{
            headerShown: true,
            title: "Transaction",
            headerBackTitle: "Back",
            headerStyle: { backgroundColor: "#FAFAF7" },
            headerTintColor: "#84A98C",
            headerTitleStyle: {
              fontFamily: "PlusJakartaSans_600SemiBold",
              color: "#2F3E46",
            },
          }}
        />
      </Stack>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
