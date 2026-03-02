import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../context/AuthContext";
import "../global.css";

// Keep the native splash visible until fonts are ready
SplashScreen.preventAutoHideAsync();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isNewUser } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inTabs = segments[0] === "(tabs)";
    const inAuthFlow =
      segments[0] === "auth" ||
      segments[0] === "onboarding" ||
      segments[0] === "setup";

    if (!user && inTabs) {
      router.replace("/auth");
    } else if (user && isNewUser && segments[0] !== "setup") {
      // New user: redirect to setup regardless of where they are
      router.replace("/setup");
    } else if (user && !isNewUser && inAuthFlow) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments, isNewUser]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  // Eagerly check for OTA updates on every launch in production.
  // Downloads and reloads immediately so the user always has the latest bundle.
  useEffect(() => {
    if (__DEV__) return;
    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // Network unavailable or not an EAS build — silently ignore
      }
    })();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AuthGuard>
          {/*
            Navigation flow:
              / (index)       → Splash screen (2.5s) → /onboarding
              /onboarding     → 3-step carousel       → /auth
              /auth           → Sign in / Sign up      → /(tabs)
              /(tabs)         → Main app
          */}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ animation: "none" }} />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="setup" />
            <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
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
        </AuthGuard>
      </AuthProvider>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
