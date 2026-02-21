import React from "react";
import { Text, View } from "react-native";
import { formatCurrency } from "../services/formatters";
import type { Category } from "../types";

interface Props {
  category: Category;
  amount: number;
  percentage: number;
}

export function CategoryBar({ category, amount, percentage }: Props) {
  return (
    <View className="px-4 py-2.5">
      <View className="flex-row items-center justify-between pb-1.5">
        <View className="flex-row items-center gap-2">
          <Text className="text-base">{category.icon}</Text>
          <Text className="text-sm font-medium text-stone-700">{category.name}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Text className="text-xs text-stone-400">{percentage.toFixed(1)}%</Text>
          <Text className="text-sm font-semibold text-stone-800">
            {formatCurrency(amount)}
          </Text>
        </View>
      </View>
      <View className="h-1.5 overflow-hidden rounded-full bg-stone-100">
        <View
          className="h-full rounded-full"
          style={{ width: `${percentage}%`, backgroundColor: category.color }}
        />
      </View>
    </View>
  );
}
