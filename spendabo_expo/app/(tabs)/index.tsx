import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { getMonthlyAnalytics, getTransactions, getCategories } from "../../services/transactionService";
import { formatCurrency, formatDate } from "../../services/formatters";
import { getCategoryConfigById } from "../../constants/categoryConfig";
import { Colors, cardShadow } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import type { MonthlyAnalytics, Transaction, Category } from "../../types";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 17) return "Good afternoon,";
  return "Good evening,";
}

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return formatDate(isoDate);
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<MonthlyAnalytics | null>(null);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const firstName = user?.displayName?.split(" ")[0] ?? "there";

  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const emptyAnalytics: MonthlyAnalytics = {
      month: currentMonth,
      totalSpend: 0,
      totalIncome: 0,
      transactionCount: 0,
      vsLastMonth: 0,
      byCategory: [],
      topMerchants: [],
    };

    Promise.all([
      getMonthlyAnalytics().catch(() => emptyAnalytics),
      getTransactions().catch(() => []),
      getCategories().catch(() => []),
    ]).then(([analytics, txs, cats]) => {
      setAnalytics(analytics);
      setRecentTx(txs.slice(0, 5));
      setCategories(cats);
    });
  }, []);

  const getCat = (id: string | null) => categories.find((c) => c.id === id) ?? null;

  if (!analytics) {
    return (
      <SafeAreaView
        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background }}
      >
        <ActivityIndicator color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const topCategories = analytics.byCategory
    .filter((c) => c.categoryId !== "income" && c.categoryId !== "uncategorized")
    .slice(0, 4);

  const vsLastMonth = analytics.vsLastMonth;
  const vsStr = vsLastMonth < 0
    ? `↓ ${Math.abs(vsLastMonth).toFixed(0)}% less than last month`
    : `↑ ${vsLastMonth.toFixed(0)}% more than last month`;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.background }}
      edges={["top"]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 24, paddingBottom: 32 }}>

          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 16,
              marginBottom: 0,
            }}
          >
            <View>
              <Text
                style={{
                  color: Colors.textMuted,
                  fontSize: 13,
                  fontFamily: "PlusJakartaSans_500Medium",
                }}
              >
                {getGreeting()}
              </Text>
              <Text
                style={{
                  color: Colors.text,
                  fontSize: 20,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                  marginTop: 2,
                }}
              >
                {firstName} 👋
              </Text>
            </View>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: Colors.mistyBlue,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: Colors.text,
                  fontSize: 15,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                }}
              >
                {firstName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Total Expenses Hero */}
          <View style={{ marginTop: 32, alignItems: "center" }}>
            <Text
              style={{
                color: Colors.textMuted,
                fontSize: 13,
                fontFamily: "PlusJakartaSans_500Medium",
              }}
            >
              Total Expenses This Month
            </Text>
            <Text
              style={{
                color: Colors.text,
                fontSize: 40,
                fontFamily: "PlusJakartaSans_600SemiBold",
                marginTop: 6,
                letterSpacing: -1,
                lineHeight: 48,
              }}
            >
              {formatCurrency(analytics.totalSpend)}
            </Text>
            <Text
              style={{
                color: Colors.primary,
                fontSize: 12,
                fontFamily: "PlusJakartaSans_500Medium",
                marginTop: 6,
              }}
            >
              {vsStr}
            </Text>
          </View>

          {/* AI Insight Card */}
          <View
            style={{
              marginTop: 28,
              backgroundColor: Colors.accent,
              borderRadius: 20,
              padding: 16,
              flexDirection: "row",
              gap: 12,
              alignItems: "flex-start",
              ...cardShadow,
            }}
          >
            <Feather
              name="zap"
              size={18}
              color={Colors.primary}
              style={{ marginTop: 1 }}
            />
            <Text
              style={{
                color: Colors.text,
                fontSize: 13,
                lineHeight: 20,
                fontFamily: "PlusJakartaSans_400Regular",
                flex: 1,
              }}
            >
              You're spending a bit more on dining this month. Maybe cook at
              home twice this week? 🍳
            </Text>
          </View>

          {/* Top Categories */}
          <View style={{ marginTop: 32 }}>
            <Text
              style={{
                color: Colors.text,
                fontSize: 15,
                fontFamily: "PlusJakartaSans_600SemiBold",
                marginBottom: 12,
              }}
            >
              Top Categories
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingBottom: 6 }}
            >
              {topCategories.map((item) => {
                const cat = getCat(item.categoryId);
                const config = getCategoryConfigById(item.categoryId);
                return (
                  <View
                    key={item.categoryId}
                    style={{
                      minWidth: 118,
                      backgroundColor: Colors.card,
                      borderRadius: 20,
                      padding: 16,
                      ...cardShadow,
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: config.bg,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 24,
                      }}
                    >
                      <Feather
                        name={config.icon as any}
                        size={16}
                        color={config.iconColor}
                      />
                    </View>
                    <Text
                      style={{
                        color: Colors.textMuted,
                        fontSize: 11,
                        fontFamily: "PlusJakartaSans_500Medium",
                        marginBottom: 2,
                      }}
                    >
                      {cat?.name ?? item.categoryId}
                    </Text>
                    <Text
                      style={{
                        color: Colors.text,
                        fontSize: 14,
                        fontFamily: "PlusJakartaSans_600SemiBold",
                      }}
                    >
                      {formatCurrency(item.amount)}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* Recent Transactions */}
          <View style={{ marginTop: 32 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: Colors.text,
                  fontSize: 15,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                }}
              >
                Recent
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/transactions")}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    color: Colors.primary,
                    fontSize: 13,
                    fontFamily: "PlusJakartaSans_500Medium",
                  }}
                >
                  See all
                </Text>
                <Feather name="arrow-right" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10 }}>
              {recentTx
                .filter((tx) => tx.amount < 0)
                .map((tx) => {
                  const cat = getCat(tx.categoryId);
                  const config = getCategoryConfigById(tx.categoryId);
                  return (
                    <View
                      key={tx.id}
                      style={{
                        backgroundColor: Colors.card,
                        borderRadius: 20,
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        ...cardShadow,
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
                            {formatRelativeDate(tx.postedAt)}
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
                        <View
                          style={{
                            backgroundColor: Colors.inputBg,
                            borderRadius: 100,
                            paddingVertical: 2,
                            paddingHorizontal: 8,
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
                        </View>
                      </View>
                    </View>
                  );
                })}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
