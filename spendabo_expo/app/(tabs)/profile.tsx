import React, { useState } from "react";
import { ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Colors, cardShadow } from "../../constants/theme";

function SectionLabel({ title }: { title: string }) {
  return (
    <Text
      style={{
        color: Colors.textMuted,
        fontSize: 11,
        fontFamily: "PlusJakartaSans_600SemiBold",
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginBottom: 10,
        marginLeft: 4,
      }}
    >
      {title}
    </Text>
  );
}

function SettingRow({
  icon,
  iconBg,
  label,
  sub,
  right,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  iconBg: string;
  label: string;
  sub: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={{
        backgroundColor: Colors.card,
        borderRadius: 18,
        padding: 14,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        ...cardShadow,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: iconBg,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Feather name={icon} size={17} color={Colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: Colors.text,
            fontSize: 13,
            fontFamily: "PlusJakartaSans_600SemiBold",
            marginBottom: 1,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: Colors.textMuted,
            fontSize: 11,
            fontFamily: "PlusJakartaSans_400Regular",
          }}
        >
          {sub}
        </Text>
      </View>
      {right ?? (
        <Feather name="chevron-right" size={16} color={Colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [smartInsights, setSmartInsights] = useState(true);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.background }}
      edges={["top"]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 }}>

          {/* Header */}
          <Text
            style={{
              color: Colors.text,
              fontSize: 22,
              fontFamily: "PlusJakartaSans_600SemiBold",
              marginBottom: 28,
            }}
          >
            Profile
          </Text>

          {/* User Card */}
          <View
            style={{
              backgroundColor: Colors.card,
              borderRadius: 24,
              padding: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              marginBottom: 24,
              ...cardShadow,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: Colors.mistyBlue,
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Text
                style={{
                  color: Colors.text,
                  fontSize: 20,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                }}
              >
                A
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: Colors.text,
                  fontSize: 15,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                  marginBottom: 2,
                }}
              >
                Alex Johnson
              </Text>
              <Text
                style={{
                  color: Colors.textMuted,
                  fontSize: 12,
                  fontFamily: "PlusJakartaSans_400Regular",
                }}
              >
                alex.johnson@email.com
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.primary} />
          </View>

          {/* Account */}
          <SectionLabel title="Account" />
          <View style={{ gap: 8, marginBottom: 24 }}>
            <SettingRow
              icon="lock"
              iconBg={Colors.paleYellow}
              label="Password"
              sub="Change your password"
            />
            <SettingRow
              icon="bell"
              iconBg={Colors.mistyBlue}
              label="Notifications"
              sub="Get spending alerts"
              right={
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: "#D1D5D8", true: Colors.primary }}
                  thumbColor={Colors.card}
                />
              }
            />
          </View>

          {/* Privacy */}
          <SectionLabel title="Privacy" />
          <View style={{ marginBottom: 24 }}>
            <SettingRow
              icon="zap"
              iconBg={Colors.accent}
              label="Smart Insights"
              sub={smartInsights ? "Enhanced personalization" : "Basic insights"}
              right={
                <Switch
                  value={smartInsights}
                  onValueChange={setSmartInsights}
                  trackColor={{ false: "#D1D5D8", true: Colors.primary }}
                  thumbColor={Colors.card}
                />
              }
            />
          </View>

          {/* Support */}
          <SectionLabel title="Support" />
          <View style={{ gap: 8, marginBottom: 24 }}>
            <SettingRow
              icon="help-circle"
              iconBg={Colors.paleYellow}
              label="Help & Support"
              sub="Get help with Spendabo"
            />
            <SettingRow
              icon="shield"
              iconBg={Colors.mistyBlue}
              label="Privacy Policy"
              sub="How we use your data"
            />
          </View>

          {/* Log Out */}
          <TouchableOpacity
            onPress={() => router.replace("/auth")}
            activeOpacity={0.7}
            style={{
              backgroundColor: Colors.card,
              borderRadius: 18,
              padding: 14,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              ...cardShadow,
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: "#FFEAEA",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Feather name="log-out" size={17} color={Colors.destructive} />
            </View>
            <Text
              style={{
                color: Colors.destructive,
                fontSize: 13,
                fontFamily: "PlusJakartaSans_600SemiBold",
                flex: 1,
              }}
            >
              Log Out
            </Text>
          </TouchableOpacity>

          {/* App info */}
          <View style={{ alignItems: "center", paddingTop: 28 }}>
            <Text
              style={{
                color: Colors.textMuted,
                fontSize: 12,
                fontFamily: "PlusJakartaSans_400Regular",
                marginBottom: 2,
              }}
            >
              Spendabo v1.0.0
            </Text>
            <Text
              style={{
                color: Colors.textMuted,
                fontSize: 11,
                fontFamily: "PlusJakartaSans_400Regular",
              }}
            >
              Spend Smarter. Effortlessly.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
