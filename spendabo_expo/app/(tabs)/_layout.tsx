import { Tabs } from "expo-router";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/theme";

function TabIcon({
  name,
  focused,
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  focused: boolean;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: focused ? Colors.accent : "transparent",
      }}
    >
      <Feather
        name={name}
        size={18}
        color={focused ? Colors.tabActive : Colors.tabInactive}
      />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: "rgba(0,0,0,0.06)",
          paddingBottom: insets.bottom,
          height: 60 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontFamily: "PlusJakartaSans_500Medium",
          fontSize: 11,
          marginTop: -2,
        },
        headerStyle: { backgroundColor: Colors.background },
        headerTitleStyle: {
          fontFamily: "PlusJakartaSans_600SemiBold",
          color: Colors.text,
          fontSize: 17,
        },
        headerTintColor: Colors.primary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          headerShown: false,
          title: "Transactions",
          tabBarIcon: ({ focused }) => <TabIcon name="list" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          headerShown: false,
          title: "Scan",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="camera" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          headerShown: false,
          title: "Budgets",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="target" focused={focused} />
          ),
        }}
      />
      {/* Hidden screens */}
      <Tabs.Screen name="rules" options={{ href: null }} />
      <Tabs.Screen name="imports" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
