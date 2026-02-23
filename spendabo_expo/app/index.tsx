import React, { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../constants/theme";

export default function SplashScreen() {
  const router = useRouter();

  // Animate the three loading dots sequentially
  const dot0 = useRef(new Animated.Value(0.3)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          Animated.delay(800 - delay),
        ])
      );

    const a0 = pulse(dot0, 0);
    const a1 = pulse(dot1, 267);
    const a2 = pulse(dot2, 533);
    a0.start();
    a1.start();
    a2.start();

    const timer = setTimeout(() => {
      a0.stop();
      a1.stop();
      a2.stop();
      router.replace("/onboarding");
    }, 2500);

    return () => {
      clearTimeout(timer);
      a0.stop();
      a1.stop();
      a2.stop();
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Logo */}
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 28,
            backgroundColor: Colors.primary,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            shadowColor: Colors.primary,
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.35,
            shadowRadius: 32,
            elevation: 12,
          }}
        >
          <Feather name="zap" size={36} color={Colors.primaryForeground} />
        </View>

        <Text
          style={{
            color: Colors.text,
            fontSize: 36,
            fontFamily: "PlusJakartaSans_700Bold",
            letterSpacing: -0.5,
            marginBottom: 6,
          }}
        >
          Spendabo
        </Text>
        <Text
          style={{
            color: Colors.textMuted,
            fontSize: 15,
            fontFamily: "PlusJakartaSans_400Regular",
          }}
        >
          Spend Smarter. Effortlessly.
        </Text>
      </View>

      {/* Animated loading dots */}
      <View
        style={{
          position: "absolute",
          bottom: 60,
          flexDirection: "row",
          gap: 6,
        }}
      >
        {[dot0, dot1, dot2].map((dot, i) => (
          <Animated.View
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === 0 ? Colors.primary : "#D1D5D8",
              opacity: dot,
            }}
          />
        ))}
      </View>
    </View>
  );
}
