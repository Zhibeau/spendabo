import { Tabs } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

/** Raised circular button for the centre camera tab */
function CameraTabButton(props: BottomTabBarButtonProps) {
  return (
    <TouchableOpacity
      {...props}
      style={[
        props.style,
        {
          top: -14,
          justifyContent: "center",
          alignItems: "center",
        },
      ]}
      activeOpacity={0.85}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: "#14B8A6",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#14B8A6",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Text style={{ fontSize: 26 }}>📷</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#14B8A6",
        tabBarInactiveTintColor: "#A8A29E",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E8E0DA",
          paddingBottom: insets.bottom,
          height: 60 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
        headerStyle: { backgroundColor: "#FFF8F5" },
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: "#1C1917", fontSize: 17 },
        headerTintColor: "#14B8A6",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          tabBarIcon: ({ focused }) => <TabIcon emoji="💳" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: "",
          tabBarIcon: () => null,
          tabBarButton: (props) => <CameraTabButton {...props} />,
          headerTitle: "Scan Receipt",
        }}
      />
      <Tabs.Screen
        name="rules"
        options={{
          title: "Rules",
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚡" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="imports"
        options={{
          title: "Imports",
          tabBarIcon: ({ focused }) => <TabIcon emoji="📥" focused={focused} />,
        }}
      />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
