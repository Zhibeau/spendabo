import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { getAuth, updateProfile } from "firebase/auth";
import { Colors, cardShadow, primaryShadow } from "../constants/theme";
import { useAuth } from "../context/AuthContext";

export default function SetupScreen() {
  const { markSetupComplete } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (!name.trim()) {
      setError("Please enter your name to get started.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const currentUser = getAuth().currentUser;
      if (currentUser) {
        await updateProfile(currentUser, { displayName: name.trim() });
      }
      // markSetupComplete sets isNewUser = false, which causes AuthGuard
      // to redirect to /(tabs) automatically
      await markSetupComplete();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.background }}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 40,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Icon */}
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: Colors.accent,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <Feather name="user" size={36} color={Colors.primary} />
            </View>
            <Text
              style={{
                color: Colors.text,
                fontSize: 26,
                fontFamily: "PlusJakartaSans_700Bold",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              Welcome to Spendabo!
            </Text>
            <Text
              style={{
                color: Colors.textMuted,
                fontSize: 14,
                fontFamily: "PlusJakartaSans_400Regular",
                textAlign: "center",
                lineHeight: 22,
                maxWidth: 280,
              }}
            >
              Let's personalize your experience. What should we call you?
            </Text>
          </View>

          {/* Name Input */}
          <View style={{ gap: 8, marginBottom: 16 }}>
            <Text
              style={{
                color: Colors.text,
                fontSize: 13,
                fontFamily: "PlusJakartaSans_600SemiBold",
              }}
            >
              Your Name
            </Text>
            <View
              style={{
                height: 52,
                backgroundColor: Colors.card,
                borderWidth: 1.5,
                borderColor: "rgba(0,0,0,0.07)",
                borderRadius: 16,
                paddingHorizontal: 16,
                flexDirection: "row",
                alignItems: "center",
                ...cardShadow,
              }}
            >
              <TextInput
                style={{
                  flex: 1,
                  color: Colors.text,
                  fontSize: 15,
                  fontFamily: "PlusJakartaSans_400Regular",
                }}
                placeholder="e.g. Alex"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleStart}
              />
            </View>
          </View>

          {/* Error */}
          {error && (
            <View
              style={{
                backgroundColor: "#FEE2E2",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: "#B91C1C",
                  fontSize: 13,
                  fontFamily: "PlusJakartaSans_500Medium",
                }}
              >
                {error}
              </Text>
            </View>
          )}

          {/* Get Started Button */}
          <TouchableOpacity
            onPress={handleStart}
            activeOpacity={0.85}
            disabled={loading}
            style={{
              height: 54,
              backgroundColor: Colors.primary,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              opacity: loading ? 0.7 : 1,
              ...primaryShadow,
            }}
          >
            {loading ? (
              <ActivityIndicator color={Colors.primaryForeground} />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text
                  style={{
                    color: Colors.primaryForeground,
                    fontSize: 15,
                    fontFamily: "PlusJakartaSans_600SemiBold",
                  }}
                >
                  Get Started
                </Text>
                <Feather name="arrow-right" size={16} color={Colors.primaryForeground} />
              </View>
            )}
          </TouchableOpacity>

          {/* Reassurance note */}
          <Text
            style={{
              color: Colors.textMuted,
              fontSize: 12,
              fontFamily: "PlusJakartaSans_400Regular",
              textAlign: "center",
              marginTop: 20,
              lineHeight: 18,
            }}
          >
            You can always update this later in your profile settings.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
