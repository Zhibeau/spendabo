import React from "react";
import { Text, View } from "react-native";

interface Props {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

export function StatCard({ label, value, sub, accent }: Props) {
  return (
    <View className={`flex-1 rounded-2xl p-4 ${accent ? "bg-teal-500" : "bg-white"}`}>
      <Text className={`text-xs font-medium ${accent ? "text-teal-100" : "text-stone-400"}`}>
        {label}
      </Text>
      <Text
        className={`mt-1 text-2xl font-bold ${accent ? "text-white" : "text-stone-800"}`}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      {sub && (
        <Text className={`mt-0.5 text-xs ${accent ? "text-teal-100" : "text-stone-400"}`}>
          {sub}
        </Text>
      )}
    </View>
  );
}
