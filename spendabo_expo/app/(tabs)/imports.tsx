import React, { useEffect, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getImports } from "../../services/importService";
import { formatDate } from "../../services/formatters";
import type { Import } from "../../types";

const STATUS_CONFIG: Record<Import["status"], { label: string; color: string; bg: string; icon: string }> = {
  completed: { label: "Completed", color: "#059669", bg: "#ECFDF5", icon: "✅" },
  processing: { label: "Processing", color: "#D97706", bg: "#FFFBEB", icon: "⏳" },
  uploaded: { label: "Uploaded", color: "#3B82F6", bg: "#EFF6FF", icon: "📤" },
  failed: { label: "Failed", color: "#DC2626", bg: "#FEF2F2", icon: "❌" },
};

function ImportCard({ item }: { item: Import }) {
  const cfg = STATUS_CONFIG[item.status];

  return (
    <View className="mx-4 mb-3 overflow-hidden rounded-2xl bg-white">
      <View className="px-4 pb-3 pt-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-sm font-semibold text-stone-800" numberOfLines={1}>
              {item.fileName}
            </Text>
            <Text className="mt-0.5 text-xs text-stone-400">{formatDate(item.createdAt)}</Text>
          </View>
          <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: cfg.bg }}>
            <Text className="text-xs">{cfg.icon}</Text>
            <Text className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</Text>
          </View>
        </View>
      </View>

      {item.status !== "processing" && item.status !== "uploaded" && (
        <View className="flex-row border-t border-stone-100">
          {[
            { label: "Total", value: item.totalRows },
            { label: "Imported", value: item.importedCount },
            { label: "Errors", value: item.errorCount },
          ].map(({ label, value }, i) => (
            <View
              key={label}
              className={`flex-1 items-center py-2.5 ${i < 2 ? "border-r border-stone-100" : ""}`}
            >
              <Text className={`text-base font-bold ${label === "Errors" && value > 0 ? "text-rose-500" : "text-stone-800"}`}>
                {value}
              </Text>
              <Text className="text-xs text-stone-400">{label}</Text>
            </View>
          ))}
        </View>
      )}

      {item.status === "processing" && (
        <View className="border-t border-stone-100 px-4 py-3">
          <View className="mb-1.5 flex-row justify-between">
            <Text className="text-xs text-stone-400">Processing...</Text>
            <Text className="text-xs text-stone-400">0%</Text>
          </View>
          <View className="h-1.5 overflow-hidden rounded-full bg-stone-100">
            <View className="h-full w-[35%] rounded-full bg-amber-400" />
          </View>
        </View>
      )}
    </View>
  );
}

export default function ImportsScreen() {
  const [imports, setImports] = useState<Import[]>([]);

  useEffect(() => { getImports().then(setImports); }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F5]" edges={["bottom"]}>
      <FlatList
        data={imports}
        keyExtractor={(i) => i.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 12 }}
        ListHeaderComponent={() => (
          <View className="px-4 pb-3">
            <View className="overflow-hidden rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50 p-5">
              <View className="items-center">
                <Text className="text-3xl">📂</Text>
                <Text className="mt-2 text-sm font-semibold text-teal-700">
                  Import Bank Statement
                </Text>
                <Text className="mt-1 text-center text-xs text-teal-600">
                  Upload a CSV from your bank.{"\n"}We'll parse and categorize it automatically.
                </Text>
                <TouchableOpacity
                  className="mt-4 rounded-xl bg-teal-500 px-6 py-2.5"
                  activeOpacity={0.8}
                >
                  <Text className="text-sm font-semibold text-white">Choose File</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text className="mt-5 pb-2 text-sm font-semibold text-stone-600">
              Import History
            </Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View className="items-center py-8">
            <Text className="text-sm text-stone-400">No imports yet</Text>
          </View>
        )}
        renderItem={({ item }) => <ImportCard item={item} />}
      />
    </SafeAreaView>
  );
}
