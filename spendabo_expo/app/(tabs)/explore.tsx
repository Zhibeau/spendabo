import { Text, View } from "react-native";
import { Colors } from "../../constants/theme";

// This screen is hidden from navigation (href: null in tab layout).
export default function ExploreScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background }}>
      <Text style={{ color: Colors.textMuted, fontFamily: "PlusJakartaSans_400Regular" }}>Explore</Text>
    </View>
  );
}
