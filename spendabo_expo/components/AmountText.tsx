import React from "react";
import { Text } from "react-native";
import { formatCurrency, isExpense } from "../services/formatters";

interface Props {
  amount: number;
  currency?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-3xl",
};

export function AmountText({ amount, currency = "CAD", size = "md" }: Props) {
  const expense = isExpense(amount);
  const colorClass = expense ? "text-rose-500" : "text-emerald-500";
  const prefix = expense ? "-" : "+";

  return (
    <Text className={`font-semibold ${sizeMap[size]} ${colorClass}`}>
      {prefix}
      {formatCurrency(amount, currency)}
    </Text>
  );
}
