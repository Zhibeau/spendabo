import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../context/AuthContext";
import "../global.css";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

// ---------------------------------------------------------------------------
// Auth guard — runs inside AuthProvider so useAuth() is available
// ---------------------------------------------------------------------------
function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    // Wait until fonts are ready and Firebase has resolved the auth state
    if (!fontsLoaded || loading) return;

    const inLoginScreen = segments[0] === "login";

    if (!user && !inLoginScreen) {
      // Not signed in — send to login
      router.replace("/login");
    } else if (user && inLoginScreen) {
      // Already signed in — skip the login screen
      router.replace("/(tabs)");
    }
  }, [user, loading, fontsLoaded, segments]);

  if (!fontsLoaded || loading) return null;

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="transaction/[id]"
        options={{
          title: "Transaction",
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: "#FFF8F5" },
          headerTintColor: "#14B8A6",
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: "#1C1917" },
        }}
      />
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------
export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <RootLayoutNav />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </AuthProvider>
  );
}
