import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { AmountText } from "./AmountText";
import { formatDate } from "../services/formatters";
import type { Transaction, Category } from "../types";

interface Props {
  transaction: Transaction;
  category: Category | null;
  onPress: () => void;
}

export function TransactionRow({ transaction, category, onPress }: Props) {
  const { amount, merchantNormalized, postedAt, manualOverride } = transaction;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center gap-3 border-b border-stone-100 bg-white px-4 py-3.5"
      activeOpacity={0.7}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-2xl"
        style={{ backgroundColor: (category?.color ?? "#9CA3AF") + "22" }}
      >
        <Text className="text-lg">{category?.icon ?? "❓"}</Text>
      </View>

      <View className="flex-1">
        <Text className="text-sm font-medium text-stone-800" numberOfLines={1}>
          {merchantNormalized || transaction.description}
        </Text>
        <View className="flex-row items-center gap-1.5 pt-0.5">
          <Text className="text-xs text-stone-400">{formatDate(postedAt)}</Text>
          {manualOverride && (
            <View className="rounded-full bg-teal-50 px-1.5 py-0.5">
              <Text className="text-[10px] font-medium text-teal-600">edited</Text>
            </View>
          )}
        </View>
      </View>

      <AmountText amount={amount} size="sm" />
    </TouchableOpacity>
  );
}
