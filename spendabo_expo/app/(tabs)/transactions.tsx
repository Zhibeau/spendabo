import React, { useEffect, useState } from "react";
import {
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { getTransactions, getCategories } from "../../services/transactionService";
import { formatCurrency, formatDate } from "../../services/formatters";
import { getCategoryConfigById } from "../../constants/categoryConfig";
import { Colors, cardShadow } from "../../constants/theme";
import { CATEGORIES } from "../../services/mockData";
import type { Transaction, Category } from "../../types";

function formatGroupDate(isoDate: string): string {
  const date = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Build filter list from CATEGORIES – only expense categories
const FILTER_CATEGORIES = CATEGORIES.filter(
  (c) => c.id !== "income" && c.id !== "uncategorized"
);

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    getTransactions().then(setTransactions);
    getCategories().then(setCategories);
  }, []);

  const getCat = (id: string | null) => categories.find((c) => c.id === id) ?? null;
  const getEffectiveCatId = (tx: Transaction) => overrides[tx.id] ?? tx.categoryId;

  const filtered = transactions.filter((tx) => {
    if (tx.amount >= 0) return false; // show expenses only
    if (activeFilter !== "all" && getEffectiveCatId(tx) !== activeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !tx.merchantNormalized.toLowerCase().includes(q) &&
        !tx.description.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  // Group by date
  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const label = formatGroupDate(tx.postedAt);
    if (!acc[label]) acc[label] = [];
    acc[label].push(tx);
    return acc;
  }, {});
  const groupEntries = Object.entries(grouped);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.background }}
      edges={["top"]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 }}>

          {/* Header */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                color: Colors.text,
                fontSize: 22,
                fontFamily: "PlusJakartaSans_600SemiBold",
              }}
            >
              Transactions
            </Text>
            <Text
              style={{
                color: Colors.textMuted,
                fontSize: 13,
                fontFamily: "PlusJakartaSans_400Regular",
                marginTop: 4,
              }}
            >
              February 2026
            </Text>
          </View>

          {/* Search Bar */}
          <View
            style={{
              position: "relative",
              marginBottom: 14,
            }}
          >
            <View
              style={{
                backgroundColor: Colors.card,
                borderRadius: 14,
                height: 44,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                gap: 10,
                ...cardShadow,
              }}
            >
              <Feather name="search" size={16} color={Colors.textMuted} />
              <TextInput
                style={{
                  flex: 1,
                  color: Colors.text,
                  fontSize: 13,
                  fontFamily: "PlusJakartaSans_400Regular",
                }}
                placeholder="Search transactions..."
                placeholderTextColor={Colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>

          {/* Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 4, marginBottom: 20 }}
          >
            {[{ id: "all", name: "All" }, ...FILTER_CATEGORIES].map((cat) => {
              const active = activeFilter === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setActiveFilter(cat.id)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingVertical: 7,
                    paddingHorizontal: 14,
                    borderRadius: 100,
                    backgroundColor: active ? Colors.primary : Colors.card,
                    ...cardShadow,
                  }}
                >
                  {active && (
                    <Feather name="check" size={11} color={Colors.primaryForeground} />
                  )}
                  <Text
                    style={{
                      color: active ? Colors.primaryForeground : Colors.textMuted,
                      fontSize: 12,
                      fontFamily: "PlusJakartaSans_500Medium",
                    }}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Transaction Groups */}
          <View style={{ gap: 24 }}>
            {groupEntries.map(([date, txs]) => (
              <View key={date}>
                <Text
                  style={{
                    color: Colors.textMuted,
                    fontSize: 12,
                    fontFamily: "PlusJakartaSans_600SemiBold",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 10,
                  }}
                >
                  {date}
                </Text>
                <View style={{ gap: 8 }}>
                  {txs.map((tx) => {
                    const effectiveCatId = getEffectiveCatId(tx);
                    const cat = getCat(effectiveCatId);
                    const config = getCategoryConfigById(effectiveCatId);
                    const isEditing = editingId === tx.id;

                    return (
                      <View
                        key={tx.id}
                        style={{
                          backgroundColor: Colors.card,
                          borderRadius: 20,
                          paddingVertical: 14,
                          paddingHorizontal: 16,
                          ...cardShadow,
                        }}
                      >
                        {/* Transaction row */}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                            <View
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: config.bg + "99",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <Feather
                                name={config.icon as any}
                                size={16}
                                color={Colors.text}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                numberOfLines={1}
                                style={{
                                  color: Colors.text,
                                  fontSize: 13,
                                  fontFamily: "PlusJakartaSans_600SemiBold",
                                  marginBottom: 2,
                                }}
                              >
                                {tx.merchantNormalized}
                              </Text>
                              <Text
                                style={{
                                  color: Colors.textMuted,
                                  fontSize: 11,
                                  fontFamily: "PlusJakartaSans_400Regular",
                                }}
                              >
                                {formatDate(tx.postedAt)}
                              </Text>
                            </View>
                          </View>

                          <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
                            <Text
                              style={{
                                color: Colors.text,
                                fontSize: 13,
                                fontFamily: "PlusJakartaSans_600SemiBold",
                                marginBottom: 4,
                              }}
                            >
                              {formatCurrency(Math.abs(tx.amount))}
                            </Text>
                            <TouchableOpacity
                              onPress={() =>
                                setEditingId(isEditing ? null : tx.id)
                              }
                              activeOpacity={0.7}
                              style={{
                                backgroundColor: Colors.inputBg,
                                borderRadius: 100,
                                paddingVertical: 2,
                                paddingHorizontal: 8,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 2,
                              }}
                            >
                              <Text
                                style={{
                                  color: Colors.textMuted,
                                  fontSize: 10,
                                  fontFamily: "PlusJakartaSans_500Medium",
                                }}
                              >
                                {cat?.name ?? "Other"}
                              </Text>
                              <Feather
                                name="chevron-down"
                                size={9}
                                color={Colors.textMuted}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Inline category picker */}
                        {isEditing && (
                          <View
                            style={{
                              marginTop: 12,
                              paddingTop: 12,
                              borderTopWidth: 1,
                              borderTopColor: "rgba(0,0,0,0.05)",
                              flexDirection: "row",
                              flexWrap: "wrap",
                              gap: 6,
                            }}
                          >
                            {FILTER_CATEGORIES.map((c) => {
                              const catConfig = getCategoryConfigById(c.id);
                              const isSelected = effectiveCatId === c.id;
                              return (
                                <TouchableOpacity
                                  key={c.id}
                                  onPress={() => {
                                    setOverrides((prev) => ({
                                      ...prev,
                                      [tx.id]: c.id,
                                    }));
                                    setEditingId(null);
                                  }}
                                  activeOpacity={0.7}
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 5,
                                    paddingVertical: 5,
                                    paddingHorizontal: 10,
                                    borderRadius: 100,
                                    backgroundColor: isSelected
                                      ? Colors.primary
                                      : Colors.inputBg,
                                  }}
                                >
                                  <Feather
                                    name={catConfig.icon as any}
                                    size={11}
                                    color={isSelected ? Colors.primaryForeground : Colors.text}
                                  />
                                  <Text
                                    style={{
                                      color: isSelected
                                        ? Colors.primaryForeground
                                        : Colors.text,
                                      fontSize: 11,
                                      fontFamily: "PlusJakartaSans_500Medium",
                                    }}
                                  >
                                    {c.name}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* Empty state */}
            {filtered.length === 0 && (
              <View style={{ alignItems: "center", paddingVertical: 48 }}>
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: Colors.accent,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <Feather name="sliders" size={24} color={Colors.primary} />
                </View>
                <Text
                  style={{
                    color: Colors.textMuted,
                    fontSize: 14,
                    fontFamily: "PlusJakartaSans_400Regular",
                  }}
                >
                  No transactions found
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
