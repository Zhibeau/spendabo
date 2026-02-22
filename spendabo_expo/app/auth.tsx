import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Colors, primaryShadow, cardShadow } from "../constants/theme";

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
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = () => {
    // TODO: Wire up to Firebase auth via AuthContext
    router.replace("/(tabs)");
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
              style={{
                height: 52,
                backgroundColor: Colors.primary,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 4,
                ...primaryShadow,
              }}
            >
              <Text
                style={{
                  color: Colors.primaryForeground,
                  fontSize: 15,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                }}
              >
                {isSignUp ? "Sign Up" : "Sign In"}
              </Text>
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
            {["Google", "Apple"].map((provider) => (
              <TouchableOpacity
                key={provider}
                onPress={handleSubmit}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  height: 48,
                  backgroundColor: Colors.card,
                  borderWidth: 1.5,
                  borderColor: "rgba(0,0,0,0.07)",
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
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
                  {provider}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Toggle */}
          <View style={{ alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => setIsSignUp(!isSignUp)}
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
