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
import { Colors, primaryShadow, cardShadow } from "../constants/theme";
import { useAuth } from "../context/AuthContext";

function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  suffix,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "email-address" | "default";
  suffix?: React.ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          color: Colors.text,
          fontSize: 13,
          fontFamily: "PlusJakartaSans_600SemiBold",
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: 48,
          backgroundColor: Colors.card,
          borderWidth: 1.5,
          borderColor: "rgba(0,0,0,0.07)",
          borderRadius: 14,
          paddingHorizontal: 16,
          ...cardShadow,
        }}
      >
        <TextInput
          style={{
            flex: 1,
            color: Colors.text,
            fontSize: 14,
            fontFamily: "PlusJakartaSans_400Regular",
          }}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType ?? "default"}
          autoCapitalize="none"
        />
        {suffix}
      </View>
    </View>
  );
}

export default function AuthScreen() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      // AuthGuard in _layout.tsx will redirect to /(tabs) automatically
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Authentication failed";
      setError(friendlyError(message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      // AuthGuard in _layout.tsx will redirect to /(tabs) automatically
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Google sign-in failed";
      // Ignore cancellation — user pressed back
      if (!message.includes("cancelled") && !message.includes("SIGN_IN_CANCELLED")) {
        setError(friendlyError(message));
      }
    } finally {
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
            paddingVertical: 32,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={{ alignItems: "center", marginBottom: 36 }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 20,
                backgroundColor: Colors.primary,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                ...primaryShadow,
              }}
            >
              <Feather name="zap" size={26} color={Colors.primaryForeground} />
            </View>
            <Text
              style={{
                color: Colors.text,
                fontSize: 24,
                fontFamily: "PlusJakartaSans_600SemiBold",
                marginBottom: 6,
              }}
            >
              {isSignUp ? "Create Account" : "Welcome Back"}
            </Text>
            <Text
              style={{
                color: Colors.textMuted,
                fontSize: 13,
                fontFamily: "PlusJakartaSans_400Regular",
              }}
            >
              {isSignUp
                ? "Start your journey to smarter spending"
                : "Continue your financial journey"}
            </Text>
          </View>

          {/* Error banner */}
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

          {/* Form */}
          <View style={{ gap: 16 }}>
            {isSignUp && (
              <InputField
                label="Name"
                placeholder="Your name"
                value={name}
                onChangeText={setName}
              />
            )}
            <InputField
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <InputField
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              suffix={
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={16}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              }
            />

            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={loading}
              style={{
                height: 52,
                backgroundColor: Colors.primary,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 4,
                opacity: loading ? 0.7 : 1,
                ...primaryShadow,
              }}
            >
              {loading ? (
                <ActivityIndicator color={Colors.primaryForeground} />
              ) : (
                <Text
                  style={{
                    color: Colors.primaryForeground,
                    fontSize: 15,
                    fontFamily: "PlusJakartaSans_600SemiBold",
                  }}
                >
                  {isSignUp ? "Sign Up" : "Sign In"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginVertical: 24,
            }}
          >
            <View style={{ flex: 1, height: 1, backgroundColor: "rgba(0,0,0,0.07)" }} />
            <Text
              style={{
                color: Colors.textMuted,
                fontSize: 12,
                fontFamily: "PlusJakartaSans_400Regular",
              }}
            >
              or continue with
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: "rgba(0,0,0,0.07)" }} />
          </View>

          {/* Social Buttons */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 28 }}>
            <TouchableOpacity
              onPress={handleGoogle}
              activeOpacity={0.85}
              disabled={loading}
              style={{
                flex: 1,
                height: 48,
                backgroundColor: Colors.card,
                borderWidth: 1.5,
                borderColor: "rgba(0,0,0,0.07)",
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                opacity: loading ? 0.7 : 1,
                ...cardShadow,
              }}
            >
              <Text
                style={{
                  color: Colors.text,
                  fontSize: 13,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                }}
              >
                Google
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled
              style={{
                flex: 1,
                height: 48,
                backgroundColor: Colors.card,
                borderWidth: 1.5,
                borderColor: "rgba(0,0,0,0.07)",
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.4,
                ...cardShadow,
              }}
            >
              <Text
                style={{
                  color: Colors.text,
                  fontSize: 13,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                }}
              >
                Apple
              </Text>
            </TouchableOpacity>
          </View>

          {/* Toggle */}
          <View style={{ alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  color: Colors.textMuted,
                  fontSize: 13,
                  fontFamily: "PlusJakartaSans_400Regular",
                }}
              >
                {isSignUp ? "Already have an account? " : "Don't have an account? "}
                <Text
                  style={{
                    color: Colors.primary,
                    fontFamily: "PlusJakartaSans_600SemiBold",
                  }}
                >
                  {isSignUp ? "Sign In" : "Sign Up"}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Map Firebase error codes to user-friendly messages
function friendlyError(message: string): string {
  if (message.includes("invalid-credential") || message.includes("wrong-password")) {
    return "Incorrect email or password.";
  }
  if (message.includes("user-not-found")) {
    return "No account found with this email.";
  }
  if (message.includes("email-already-in-use")) {
    return "An account with this email already exists.";
  }
  if (message.includes("weak-password")) {
    return "Password must be at least 6 characters.";
  }
  if (message.includes("invalid-email")) {
    return "Please enter a valid email address.";
  }
  if (message.includes("network-request-failed")) {
    return "Network error. Check your connection.";
  }
  return message;
}
