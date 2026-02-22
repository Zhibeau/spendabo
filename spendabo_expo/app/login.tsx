import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "../context/AuthContext";

// Required so the OAuth browser session is properly closed when the app
// is re-opened via the redirect URI.
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    // Web (and fallback) client ID — also used inside Expo Go
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    // Platform-specific client IDs (needed for standalone builds)
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  // Handle the OAuth response
  useEffect(() => {
    if (!response) return;

    if (response.type === "success") {
      const { id_token } = response.params;
      if (!id_token) {
        setError("No ID token returned from Google.");
        setSigningIn(false);
        return;
      }
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential).catch((err: Error) => {
        setError(err.message ?? "Failed to sign in with Google.");
        setSigningIn(false);
      });
    } else if (response.type === "error") {
      setError(response.error?.message ?? "Google sign-in failed.");
      setSigningIn(false);
    } else if (response.type === "cancel" || response.type === "dismiss") {
      setSigningIn(false);
    }
  }, [response]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setSigningIn(true);
    await promptAsync();
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F5]">
      <View className="flex-1 items-center justify-between px-6 py-10">

        {/* ── Top brand block ── */}
        <View className="flex-1 items-center justify-center">
          {/* Logo circle */}
          <View
            className="mb-6 h-24 w-24 items-center justify-center rounded-3xl bg-teal-500"
            style={{
              shadowColor: "#14B8A6",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <Text style={{ fontSize: 44 }}>💸</Text>
          </View>

          <Text
            className="text-3xl text-stone-900"
            style={{ fontFamily: "Inter_700Bold" }}
          >
            Spendabo
          </Text>
          <Text
            className="mt-2 text-center text-base text-stone-500"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            Expense tracking that respects your privacy
          </Text>

          {/* Feature pill list */}
          <View className="mt-8 gap-3 self-stretch">
            {[
              { icon: "📊", label: "Monthly spending insights" },
              { icon: "🤖", label: "AI-powered categorisation" },
              { icon: "📷", label: "Scan receipts instantly" },
            ].map(({ icon, label }) => (
              <View
                key={label}
                className="flex-row items-center gap-3 rounded-2xl bg-white px-4 py-3"
                style={{ shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}
              >
                <Text style={{ fontSize: 20 }}>{icon}</Text>
                <Text
                  className="text-sm text-stone-700"
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Bottom sign-in block ── */}
        <View className="w-full gap-4">
          {error && (
            <View className="rounded-2xl bg-rose-50 px-4 py-3">
              <Text
                className="text-center text-sm text-rose-600"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                {error}
              </Text>
            </View>
          )}

          {/* Google Sign-In button */}
          <TouchableOpacity
            onPress={handleGoogleSignIn}
            disabled={!request || signingIn}
            activeOpacity={0.85}
            className="w-full flex-row items-center justify-center gap-3 rounded-2xl bg-white py-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 6,
              elevation: 3,
              opacity: !request || signingIn ? 0.6 : 1,
            }}
          >
            {signingIn ? (
              <ActivityIndicator color="#14B8A6" />
            ) : (
              /* Google "G" badge */
              <View
                className="h-6 w-6 items-center justify-center rounded-full"
                style={{ backgroundColor: "#4285F4" }}
              >
                <Text
                  className="text-xs text-white"
                  style={{ fontFamily: "Inter_700Bold", lineHeight: 15 }}
                >
                  G
                </Text>
              </View>
            )}
            <Text
              className="text-base text-stone-800"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              {signingIn ? "Signing in…" : "Continue with Google"}
            </Text>
          </TouchableOpacity>

          <Text
            className="text-center text-xs text-stone-400"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            Your data is private and never shared with third parties.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
