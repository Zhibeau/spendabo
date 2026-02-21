import { Stack } from "expo-router";
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
import "../global.css";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      <Stack>
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
      <StatusBar style="dark" />
    </>
  );
}
