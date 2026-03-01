import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Colors, primaryShadow } from "../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const STEPS = [
  {
    icon: "zap" as const,
    bg: "#FDF0D5",
    iconColor: Colors.primary,
    title: "Automatic Tracking",
    description:
      "Your expenses are auto-categorized as soon as they happen. No manual entry needed.",
  },
  {
    icon: "cpu" as const,
    bg: Colors.accent,
    iconColor: Colors.primary,
    title: "Smart AI Insights",
    description:
      "Get friendly, lifestyle-focused tips that help you spend mindfully and reach your goals.",
  },
  {
    icon: "camera" as const,
    bg: Colors.mistyBlue,
    iconColor: Colors.text,
    title: "Receipt Scanning",
    description:
      "Snap any receipt and let us handle the rest. It's that simple.",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      const nextStep = step + 1;
      flatListRef.current?.scrollToIndex({ index: nextStep, animated: true });
      setStep(nextStep);
    } else {
      router.replace("/auth");
    }
  };

  const handleSkip = () => router.replace("/auth");

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setStep(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.background }}
      edges={["top", "bottom"]}
    >
      {/* Skip */}
      <View style={{ alignItems: "flex-end", paddingHorizontal: 24, paddingTop: 8 }}>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text
            style={{
              color: Colors.textMuted,
              fontSize: 14,
              fontFamily: "PlusJakartaSans_500Medium",
            }}
          >
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable slides */}
      <FlatList
        ref={flatListRef}
        data={STEPS}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={{ flex: 1 }}
        renderItem={({ item }) => (
          <View
            style={{
              width: SCREEN_WIDTH,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 32,
              paddingBottom: 40,
            }}
          >
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 36,
                backgroundColor: item.bg,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 40,
              }}
            >
              <Feather name={item.icon} size={56} color={item.iconColor} />
            </View>

            <Text
              style={{
                color: Colors.text,
                fontSize: 26,
                fontFamily: "PlusJakartaSans_600SemiBold",
                marginBottom: 14,
                textAlign: "center",
                lineHeight: 34,
              }}
            >
              {item.title}
            </Text>
            <Text
              style={{
                color: Colors.textMuted,
                fontSize: 14,
                lineHeight: 24,
                fontFamily: "PlusJakartaSans_400Regular",
                textAlign: "center",
                maxWidth: 280,
              }}
            >
              {item.description}
            </Text>
          </View>
        )}
      />

      {/* Bottom */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 48 }}>
        {/* Dots */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
            marginBottom: 24,
          }}
        >
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={{
                height: 6,
                borderRadius: 100,
                backgroundColor: i === step ? Colors.primary : "#D1D5D8",
                width: i === step ? 24 : 6,
              }}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          style={{
            width: "100%",
            height: 52,
            backgroundColor: Colors.primary,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
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
            {step === STEPS.length - 1 ? "Get Started" : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
