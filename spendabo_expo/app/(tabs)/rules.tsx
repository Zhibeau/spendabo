import React, { useEffect, useState } from "react";
import { FlatList, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getRules, toggleRule } from "../../services/rulesService";
import { CATEGORIES } from "../../services/mockData";
import type { Rule } from "../../types";

const SOURCE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  user: { label: "User", color: "#0D9488", bg: "#F0FDFA" },
  suggestion: { label: "Suggested", color: "#7C3AED", bg: "#F5F3FF" },
  system: { label: "System", color: "#6B7280", bg: "#F9FAFB" },
};

function RuleCard({ rule, onToggle }: { rule: Rule; onToggle: (id: string, val: boolean) => void }) {
  const cat = CATEGORIES.find((c) => c.id === rule.action.categoryId);
  const src = SOURCE_LABELS[rule.source] ?? SOURCE_LABELS.user;
  const condition = rule.conditions.merchantExact
    ? `Merchant is "${rule.conditions.merchantExact}"`
    : rule.conditions.merchantContains
      ? `Merchant contains "${rule.conditions.merchantContains}"`
      : "Custom condition";

  return (
    <View className="mx-4 mb-3 overflow-hidden rounded-2xl bg-white">
      <View className="flex-row items-center justify-between px-4 pb-3 pt-4">
        <View className="flex-1 pr-3">
          <Text className="text-sm font-semibold text-stone-800" numberOfLines={1}>
            {rule.name}
          </Text>
          <Text className="mt-0.5 text-xs text-stone-400">{condition}</Text>
        </View>
        <Switch
          value={rule.enabled}
          onValueChange={(v) => onToggle(rule.id, v)}
          trackColor={{ false: "#E8E0DA", true: "#14B8A6" }}
          thumbColor="#FFFFFF"
        />
      </View>

      <View className="flex-row items-center justify-between border-t border-stone-100 px-4 py-2.5">
        <View className="flex-row items-center gap-2">
          {cat && (
            <View className="flex-row items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: cat.color + "22" }}>
              <Text className="text-xs">{cat.icon}</Text>
              <Text className="text-xs font-medium" style={{ color: cat.color }}>{cat.name}</Text>
            </View>
          )}
          <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: src.bg }}>
            <Text className="text-xs font-medium" style={{ color: src.color }}>{src.label}</Text>
          </View>
        </View>
        <Text className="text-xs text-stone-400">
          {rule.matchCount} match{rule.matchCount !== 1 ? "es" : ""} · P{rule.priority}
        </Text>
      </View>
    </View>
  );
}

export default function RulesScreen() {
  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(() => { getRules().then(setRules); }, []);

  const handleToggle = async (id: string, val: boolean) => {
    const updated = await toggleRule(id, val);
    setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F5]" edges={["bottom"]}>
      <FlatList
        data={rules}
        keyExtractor={(r) => r.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 12 }}
        ListHeaderComponent={() => (
          <View className="flex-row items-center justify-between px-4 pb-3">
            <Text className="text-sm text-stone-400">{rules.length} rules · sorted by priority</Text>
            <TouchableOpacity className="rounded-xl bg-teal-500 px-3 py-1.5" activeOpacity={0.8}>
              <Text className="text-xs font-semibold text-white">+ New Rule</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={() => (
          <View className="items-center py-16">
            <Text className="text-4xl">⚡</Text>
            <Text className="mt-3 text-base font-semibold text-stone-600">No rules yet</Text>
            <Text className="mt-1 text-sm text-stone-400">Rules auto-categorize your transactions</Text>
          </View>
        )}
        renderItem={({ item }) => <RuleCard rule={item} onToggle={handleToggle} />}
      />
    </SafeAreaView>
  );
}
