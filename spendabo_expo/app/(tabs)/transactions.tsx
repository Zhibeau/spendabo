import React, { useEffect, useState } from "react";
import { FlatList, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TransactionRow } from "../../components/TransactionRow";
import { getTransactions, getCategories } from "../../services/transactionService";
import type { Transaction, Category } from "../../types";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "uncategorized", label: "⚠️ Uncategorized" },
  { id: "groceries", label: "🛒 Groceries" },
  { id: "dining", label: "🍽️ Dining" },
  { id: "shopping", label: "🛍️ Shopping" },
  { id: "transport", label: "🚗 Transport" },
];

export default function TransactionsScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getTransactions().then(setTransactions);
    getCategories().then(setCategories);
  }, []);

  const getCat = (id: string | null) =>
    categories.find((c) => c.id === id) ?? null;

  const filtered = transactions.filter((tx) => {
    if (activeFilter === "uncategorized" && tx.categoryId !== null) return false;
    if (activeFilter !== "all" && activeFilter !== "uncategorized" && tx.categoryId !== activeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!tx.merchantNormalized.toLowerCase().includes(q) && !tx.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F5]" edges={["bottom"]}>
      {/* Search */}
      <View className="border-b border-stone-100 bg-[#FFF8F5] px-4 pb-3 pt-2">
        <View className="flex-row items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-sm">
          <Text className="text-stone-400">🔍</Text>
          <TextInput
            className="flex-1 text-sm text-stone-800"
            placeholder="Search transactions..."
            placeholderTextColor="#A8A29E"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Filter Chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={FILTERS}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
        renderItem={({ item }) => {
          const active = activeFilter === item.id;
          return (
            <TouchableOpacity
              onPress={() => setActiveFilter(item.id)}
              className={`rounded-full px-4 py-2 ${active ? "bg-teal-500" : "bg-white border border-stone-200"}`}
              activeOpacity={0.7}
            >
              <Text className={`text-xs font-medium ${active ? "text-white" : "text-stone-600"}`}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(tx) => tx.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ItemSeparatorComponent={() => null}
        ListHeaderComponent={() => (
          <Text className="pb-2 pt-1 text-xs text-stone-400">
            {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
          </Text>
        )}
        ListEmptyComponent={() => (
          <View className="items-center py-16">
            <Text className="text-4xl">🔍</Text>
            <Text className="mt-3 text-base font-semibold text-stone-600">No transactions</Text>
            <Text className="mt-1 text-sm text-stone-400">Try a different filter or search term</Text>
          </View>
        )}
        renderItem={({ item, index }) => (
          <View
            className={`overflow-hidden bg-white ${index === 0 ? "rounded-t-2xl" : ""} ${index === filtered.length - 1 ? "rounded-b-2xl" : ""}`}
          >
            <TransactionRow
              transaction={item}
              category={getCat(item.categoryId)}
              onPress={() => router.push(`/transaction/${item.id}`)}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}
