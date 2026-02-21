import React from "react";
import { Text, View } from "react-native";
import type { Category } from "../types";

interface Props {
  category: Category | null;
  size?: "sm" | "md";
}

export function CategoryBadge({ category, size = "md" }: Props) {
  if (!category) {
    return (
      <View className="flex-row items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">
        <Text className="text-xs text-gray-400">❓</Text>
        <Text className="text-xs text-gray-400">Uncategorized</Text>
      </View>
    );
  }

  const isSmall = size === "sm";
  return (
    <View
      className={`flex-row items-center gap-1 rounded-full px-2 ${isSmall ? "py-0.5" : "py-1"}`}
      style={{ backgroundColor: category.color + "22" }}
    >
      <Text className={isSmall ? "text-xs" : "text-sm"}>{category.icon}</Text>
      <Text
        className={`font-medium ${isSmall ? "text-xs" : "text-sm"}`}
        style={{ color: category.color }}
      >
        {category.name}
      </Text>
    </View>
  );
}
