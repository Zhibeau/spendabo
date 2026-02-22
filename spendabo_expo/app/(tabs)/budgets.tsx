import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { getCategoryConfigByName } from "../../constants/categoryConfig";
import { Colors, cardShadow, primaryShadow } from "../../constants/theme";

interface Budget {
  category: string;
  limit: number;
  spent: number;
}

const mockBudgets: Budget[] = [
  { category: "Dining",        limit: 400, spent: 245.35 },
  { category: "Groceries",     limit: 500, spent: 350.20 },
  { category: "Bills",         limit: 600, spent: 500.00 },
  { category: "Transport",     limit: 200, spent: 87.25  },
  { category: "Shopping",      limit: 400, spent: 154.31 },
  { category: "Entertainment", limit: 150, spent: 25.98  },
  { category: "Health",        limit: 200, spent: 28.99  },
];

const insightMessages = [
  "You're spending a bit more on dining this month. Maybe cook at home twice this week? 🍳",
  "Great job keeping shopping in check! You've got $246 left to play with this month. 🛍️",
  "Transport costs are creeping up. Try public transit once or twice — your wallet will thank you 🚌",
];

export default function BudgetsScreen() {
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.background }}
      edges={["top"]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 }}>

          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 8,
            }}
          >
            <View>
              <Text
                style={{
                  color: Colors.text,
                  fontSize: 22,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                }}
              >
                Budgets
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
            <TouchableOpacity
              activeOpacity={0.8}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: Colors.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="plus" size={18} color={Colors.primaryForeground} />
            </TouchableOpacity>
          </View>

          {/* Smart Insights */}
          <View style={{ marginTop: 28 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Feather name="zap" size={16} color={Colors.primary} />
              <Text
                style={{
                  color: Colors.text,
                  fontSize: 15,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                }}
              >
                Smart Insights
              </Text>
            </View>

            <View style={{ gap: 8 }}>
              {insightMessages.map((msg, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: Colors.accent,
                    borderRadius: 18,
                    padding: 14,
                    paddingHorizontal: 16,
                    flexDirection: "row",
                    gap: 10,
                    alignItems: "flex-start",
                    ...cardShadow,
                  }}
                >
                  <Feather
                    name="zap"
                    size={15}
                    color={Colors.primary}
                    style={{ marginTop: 2 }}
                  />
                  <Text
                    style={{
                      color: Colors.text,
                      fontSize: 12,
                      lineHeight: 19,
                      fontFamily: "PlusJakartaSans_400Regular",
                      flex: 1,
                    }}
                  >
                    {msg}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Budget List */}
          <View style={{ marginTop: 32 }}>
            <Text
              style={{
                color: Colors.text,
                fontSize: 15,
                fontFamily: "PlusJakartaSans_600SemiBold",
                marginBottom: 12,
              }}
            >
              Monthly Budgets
            </Text>

            <View style={{ gap: 10 }}>
              {mockBudgets.map((budget) => {
                const percentage = (budget.spent / budget.limit) * 100;
                const remaining = budget.limit - budget.spent;
                const isOver = percentage > 100;
                const isWarning = percentage > 75 && !isOver;
                const config = getCategoryConfigByName(budget.category);

                const barColor = isOver
                  ? Colors.destructive
                  : isWarning
                  ? Colors.warning
                  : Colors.primary;

                return (
                  <View
                    key={budget.category}
                    style={{
                      backgroundColor: Colors.card,
                      borderRadius: 20,
                      padding: 16,
                      ...cardShadow,
                    }}
                  >
                    {/* Top row */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 14,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: config.bg,
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
                        <View>
                          <Text
                            style={{
                              color: Colors.text,
                              fontSize: 13,
                              fontFamily: "PlusJakartaSans_600SemiBold",
                              marginBottom: 1,
                            }}
                          >
                            {budget.category}
                          </Text>
                          <Text
                            style={{
                              color: Colors.textMuted,
                              fontSize: 11,
                              fontFamily: "PlusJakartaSans_400Regular",
                            }}
                          >
                            ${budget.limit.toFixed(0)} budget
                          </Text>
                        </View>
                      </View>

                      <View style={{ alignItems: "flex-end" }}>
                        <Text
                          style={{
                            color: Colors.text,
                            fontSize: 13,
                            fontFamily: "PlusJakartaSans_600SemiBold",
                            marginBottom: 1,
                          }}
                        >
                          ${budget.spent.toFixed(0)}
                        </Text>
                        <Text
                          style={{
                            color: isOver
                              ? Colors.destructive
                              : isWarning
                              ? Colors.warning
                              : Colors.textMuted,
                            fontSize: 11,
                            fontFamily: "PlusJakartaSans_400Regular",
                          }}
                        >
                          {isOver
                            ? "Over budget"
                            : `$${remaining.toFixed(0)} left`}
                        </Text>
                      </View>
                    </View>

                    {/* Progress bar */}
                    <View
                      style={{
                        height: 6,
                        backgroundColor: Colors.inputBg,
                        borderRadius: 100,
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          height: "100%",
                          width: `${Math.min(percentage, 100)}%`,
                          backgroundColor: barColor,
                          borderRadius: 100,
                        }}
                      />
                    </View>

                    {/* Bottom labels */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginTop: 6,
                      }}
                    >
                      <Text
                        style={{
                          color: Colors.textMuted,
                          fontSize: 10,
                          fontFamily: "PlusJakartaSans_500Medium",
                        }}
                      >
                        {percentage.toFixed(0)}% used
                      </Text>
                      {isOver && (
                        <Text
                          style={{
                            color: Colors.destructive,
                            fontSize: 10,
                            fontFamily: "PlusJakartaSans_600SemiBold",
                          }}
                        >
                          ${(budget.spent - budget.limit).toFixed(0)} over
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Add Budget CTA */}
          <View
            style={{
              marginTop: 24,
              backgroundColor: Colors.accent,
              borderRadius: 20,
              padding: 20,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: Colors.textMuted,
                fontSize: 13,
                fontFamily: "PlusJakartaSans_400Regular",
                marginBottom: 12,
              }}
            >
              Want to track more categories?
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderRadius: 100,
                backgroundColor: Colors.primary,
                ...primaryShadow,
              }}
            >
              <Feather name="plus" size={14} color={Colors.primaryForeground} />
              <Text
                style={{
                  color: Colors.primaryForeground,
                  fontSize: 13,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                }}
              >
                Add Custom Budget
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
