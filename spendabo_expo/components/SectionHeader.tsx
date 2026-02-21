import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface Props {
  title: string;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, action }: Props) {
  return (
    <View className="flex-row items-center justify-between px-4 pb-2 pt-5">
      <Text className="text-base font-semibold text-stone-800">{title}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text className="text-sm font-medium text-teal-600">{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
