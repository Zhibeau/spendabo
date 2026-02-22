import { Tabs, useRouter } from "expo-router";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/theme";

// Tab definitions – order matches the route order declared in <Tabs> below
const TABS = [
  { name: "index",        icon: "home"     as const, label: "Home"         },
  { name: "transactions", icon: "list"     as const, label: "Transactions" },
  { name: "scan",         icon: "camera"   as const, label: "Scan",   isCamera: true },
  { name: "budgets",      icon: "target"   as const, label: "Budgets"      },
  { name: "profile",      icon: "user"     as const, label: "Profile"      },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Map route names to our TABS config
  const visibleRoutes = state.routes.filter((r) =>
    TABS.some((t) => t.name === r.name)
  );

  return (
    <View
      style={{
        backgroundColor: Colors.card,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.05,
        shadowRadius: 30,
        elevation: 16,
        paddingBottom: insets.bottom,
        paddingTop: 0,
      }}
    >
      <View
        style={{
          height: 72,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          paddingHorizontal: 16,
        }}
      >
        {visibleRoutes.map((route) => {
          const tabConfig = TABS.find((t) => t.name === route.name);
          if (!tabConfig) return null;

          const isFocused =
            state.routes[state.index]?.name === route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Floating camera button
          if (tabConfig.isCamera) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.85}
                style={{
                  marginTop: -32,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                accessibilityLabel="Scan Receipt"
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: Colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: Colors.primary,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.45,
                    shadowRadius: 24,
                    elevation: 10,
                  }}
                >
                  <Feather name="camera" size={22} color={Colors.primaryForeground} />
                </View>
              </TouchableOpacity>
            );
          }

          // Regular tab button
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 8,
              }}
              accessibilityLabel={tabConfig.label}
            >
              <Feather
                name={tabConfig.icon}
                size={22}
                color={isFocused ? Colors.tabActive : Colors.tabInactive}
                style={{ opacity: isFocused ? 1 : 0.7 }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTitleStyle: {
          fontFamily: "PlusJakartaSans_600SemiBold",
          color: Colors.text,
          fontSize: 17,
        },
        headerTintColor: Colors.primary,
      }}
    >
      <Tabs.Screen name="index"        options={{ headerShown: false }} />
      <Tabs.Screen name="transactions" options={{ headerShown: false }} />
      <Tabs.Screen name="scan"         options={{ headerShown: false }} />
      <Tabs.Screen name="budgets"      options={{ headerShown: false }} />
      <Tabs.Screen name="profile"      options={{ headerShown: false }} />
      {/* Hidden legacy screens */}
      <Tabs.Screen name="rules"    options={{ href: null }} />
      <Tabs.Screen name="imports"  options={{ href: null }} />
      <Tabs.Screen name="explore"  options={{ href: null }} />
    </Tabs>
  );
}
