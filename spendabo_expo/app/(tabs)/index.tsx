import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatCard } from "../../components/StatCard";
import { CategoryBar } from "../../components/CategoryBar";
import { TransactionRow } from "../../components/TransactionRow";
import { SectionHeader } from "../../components/SectionHeader";
import { getMonthlyAnalytics, getTransactions, getCategories } from "../../services/transactionService";
import { formatCurrency, formatMonth } from "../../services/formatters";
import type { MonthlyAnalytics, Transaction, Category } from "../../types";

export default function DashboardScreen() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<MonthlyAnalytics | null>(null);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getMonthlyAnalytics().then(setAnalytics);
    getTransactions().then((txs) => setRecentTx(txs.slice(0, 4)));
    getCategories().then(setCategories);
  }, []);

  const getCat = (id: string | null) =>
    categories.find((c) => c.id === id) ?? null;

  if (!analytics) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#FFF8F5]">
        <Text className="text-stone-400">Loading...</Text>
      </SafeAreaView>
    );
  }

  const delta = analytics.vsLastMonth;
  const deltaStr = `${delta > 0 ? "+" : ""}${delta.toFixed(1)}% vs last month`;

  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F5]" edges={["bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-4 pb-2 pt-4">
          <Text className="text-xs font-medium text-stone-400">
            {formatMonth(analytics.month)}
          </Text>
          <Text className="mt-0.5 text-2xl font-bold text-stone-800">
            Good morning 👋
          </Text>
        </View>

        {/* Stats Row */}
        <View className="flex-row gap-3 px-4 pt-2">
          <StatCard
            label="Total Spend"
            value={formatCurrency(analytics.totalSpend)}
            sub={deltaStr}
            accent
          />
          <StatCard
            label="Income"
            value={formatCurrency(analytics.totalIncome)}
            sub={`${analytics.transactionCount} transactions`}
          />
        </View>

        {/* Uncategorized Alert */}
        {analytics.byCategory.find((c) => c.categoryId === "uncategorized") && (
          <View className="mx-4 mt-4 flex-row items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
            <Text className="text-xl">⚠️</Text>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-amber-800">
                Uncategorized transactions
              </Text>
              <Text className="text-xs text-amber-600">
                Some transactions need your review
              </Text>
            </View>
          </View>
        )}

        {/* Category Breakdown */}
        <SectionHeader
          title="Spending by Category"
          action={{ label: "All", onPress: () => router.push("/(tabs)/transactions") }}
        />
        <View className="mx-4 overflow-hidden rounded-2xl bg-white">
          {analytics.byCategory
            .filter((c) => c.categoryId !== "income")
            .slice(0, 5)
            .map((item, i) => {
              const cat = getCat(item.categoryId);
              if (!cat) return null;
              return (
                <View key={item.categoryId}>
                  {i > 0 && <View className="mx-4 h-px bg-stone-100" />}
                  <CategoryBar
                    category={cat}
                    amount={item.amount}
                    percentage={item.percentage}
                  />
                </View>
              );
            })}
        </View>

        {/* Top Merchants */}
        <SectionHeader title="Top Merchants" />
        <View className="mx-4 overflow-hidden rounded-2xl bg-white">
          {analytics.topMerchants.map((m, i) => (
            <View key={m.name}>
              {i > 0 && <View className="mx-4 h-px bg-stone-100" />}
              <View className="flex-row items-center justify-between px-4 py-3">
                <View className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-teal-50">
                    <Text className="text-sm font-bold text-teal-600">
                      {m.name.charAt(0)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-sm font-medium text-stone-800">{m.name}</Text>
                    <Text className="text-xs text-stone-400">{m.count} transaction{m.count !== 1 ? "s" : ""}</Text>
                  </View>
                </View>
                <Text className="text-sm font-semibold text-stone-800">
                  {formatCurrency(m.amount)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Recent Transactions */}
        <SectionHeader
          title="Recent Transactions"
          action={{ label: "See all", onPress: () => router.push("/(tabs)/transactions") }}
        />
        <View className="mx-4 overflow-hidden rounded-2xl bg-white">
          {recentTx.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              category={getCat(tx.categoryId)}
              onPress={() => router.push(`/transaction/${tx.id}`)}
            />
          ))}
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
