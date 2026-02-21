import React, { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AmountText } from "../../components/AmountText";
import { CategoryBadge } from "../../components/CategoryBadge";
import { getTransaction, getCategories, updateTransaction } from "../../services/transactionService";
import { formatDate } from "../../services/formatters";
import type { Transaction, Category } from "../../types";

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (id) getTransaction(id).then((t) => { setTx(t); setNotes(t?.notes ?? ""); });
    getCategories().then(setCategories);
  }, [id]);

  const getCat = (catId: string | null) =>
    categories.find((c) => c.id === catId) ?? null;

  const handleCategoryChange = async (catId: string) => {
    if (!tx) return;
    const updated = await updateTransaction(tx.id, { categoryId: catId });
    setTx(updated);
    setShowCategoryPicker(false);
  };

  const handleSaveNotes = async () => {
    if (!tx) return;
    const updated = await updateTransaction(tx.id, { notes });
    setTx(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!tx) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#FFF8F5]">
        <Text className="text-stone-400">Loading...</Text>
      </SafeAreaView>
    );
  }

  const cat = getCat(tx.categoryId);
  const { explainability: ex } = tx;

  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F5]" edges={["bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Amount Hero */}
        <View className="items-center bg-white px-6 pb-6 pt-4">
          <View className="mb-3 h-14 w-14 items-center justify-center rounded-3xl bg-stone-100">
            <Text className="text-3xl">{cat?.icon ?? "❓"}</Text>
          </View>
          <AmountText amount={tx.amount} size="xl" />
          <Text className="mt-1 text-base font-medium text-stone-600">
            {tx.merchantNormalized || tx.description}
          </Text>
          <Text className="mt-0.5 text-sm text-stone-400">{formatDate(tx.postedAt)}</Text>
        </View>

        {/* Category */}
        <View className="mx-4 mt-4 overflow-hidden rounded-2xl bg-white">
          <View className="border-b border-stone-100 px-4 py-3.5">
            <Text className="text-xs font-medium uppercase tracking-wider text-stone-400">
              Category
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            className="flex-row items-center justify-between px-4 py-3.5"
            activeOpacity={0.7}
          >
            <CategoryBadge category={cat} size="md" />
            <Text className="text-sm text-teal-500">Change →</Text>
          </TouchableOpacity>

          {showCategoryPicker && (
            <View className="border-t border-stone-100 px-4 pb-3 pt-2">
              <View className="flex-row flex-wrap gap-2">
                {categories
                  .filter((c) => c.id !== "uncategorized")
                  .map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => handleCategoryChange(c.id)}
                      className={`rounded-full px-3 py-1.5 ${tx.categoryId === c.id ? "bg-teal-500" : "bg-stone-100"}`}
                      activeOpacity={0.7}
                    >
                      <Text className={`text-sm ${tx.categoryId === c.id ? "text-white" : "text-stone-700"}`}>
                        {c.icon} {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          )}
        </View>

        {/* Explainability */}
        <View className="mx-4 mt-3 overflow-hidden rounded-2xl bg-white">
          <View className="border-b border-stone-100 px-4 py-3.5">
            <Text className="text-xs font-medium uppercase tracking-wider text-stone-400">
              Why this category?
            </Text>
          </View>
          <View className="px-4 py-3.5">
            {ex.reason === "rule_match" && (
              <View>
                <View className="flex-row items-center gap-2">
                  <View className="rounded-full bg-teal-50 px-2.5 py-1">
                    <Text className="text-xs font-medium text-teal-600">Rule matched</Text>
                  </View>
                  <View className="rounded-full bg-stone-100 px-2.5 py-1">
                    <Text className="text-xs text-stone-500">{ex.matchType}</Text>
                  </View>
                </View>
                <Text className="mt-2 text-sm text-stone-600">
                  Rule: <Text className="font-medium">{ex.ruleName}</Text>
                </Text>
                <Text className="text-sm text-stone-500">
                  Matched: <Text className="font-medium">"{ex.matchedValue}"</Text>
                </Text>
                <View className="mt-2 flex-row items-center gap-2">
                  <Text className="text-xs text-stone-400">Confidence</Text>
                  <View className="flex-1 overflow-hidden rounded-full bg-stone-100" style={{ height: 4 }}>
                    <View
                      className="h-full rounded-full bg-teal-400"
                      style={{ width: `${(ex.confidence ?? 0) * 100}%` }}
                    />
                  </View>
                  <Text className="text-xs text-stone-400">{Math.round((ex.confidence ?? 0) * 100)}%</Text>
                </View>
              </View>
            )}
            {ex.reason === "manual" && (
              <View className="flex-row items-center gap-2">
                <Text className="text-lg">✏️</Text>
                <Text className="text-sm text-stone-600">Manually set by you</Text>
              </View>
            )}
            {ex.reason === "no_match" && (
              <View className="flex-row items-center gap-2">
                <Text className="text-lg">❓</Text>
                <Text className="text-sm text-stone-500">No rule matched this transaction</Text>
              </View>
            )}
          </View>
        </View>

        {/* Notes */}
        <View className="mx-4 mt-3 overflow-hidden rounded-2xl bg-white">
          <View className="border-b border-stone-100 px-4 py-3.5">
            <Text className="text-xs font-medium uppercase tracking-wider text-stone-400">
              Notes
            </Text>
          </View>
          <View className="px-4 pb-3 pt-2">
            <TextInput
              className="min-h-[72px] text-sm text-stone-700"
              placeholder="Add a note..."
              placeholderTextColor="#A8A29E"
              multiline
              value={notes}
              onChangeText={setNotes}
              maxLength={500}
            />
            <TouchableOpacity
              onPress={handleSaveNotes}
              className="mt-2 self-end rounded-xl bg-teal-500 px-4 py-2"
              activeOpacity={0.8}
            >
              <Text className="text-sm font-semibold text-white">
                {saved ? "Saved ✓" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tags */}
        {tx.tags.length > 0 && (
          <View className="mx-4 mt-3 overflow-hidden rounded-2xl bg-white px-4 py-3.5">
            <Text className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-400">
              Tags
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {tx.tags.map((tag) => (
                <View key={tag} className="rounded-full bg-stone-100 px-3 py-1.5">
                  <Text className="text-xs text-stone-600">#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Raw Details */}
        <View className="mx-4 mt-3 overflow-hidden rounded-2xl bg-white">
          <View className="border-b border-stone-100 px-4 py-3.5">
            <Text className="text-xs font-medium uppercase tracking-wider text-stone-400">
              Details
            </Text>
          </View>
          {[
            { label: "Description", value: tx.description },
            { label: "Account", value: tx.accountId },
            { label: "Transaction ID", value: tx.id },
          ].map(({ label, value }) => (
            <View key={label} className="flex-row justify-between border-b border-stone-50 px-4 py-3">
              <Text className="text-sm text-stone-400">{label}</Text>
              <Text className="max-w-[60%] text-right text-sm text-stone-700" numberOfLines={1}>{value}</Text>
            </View>
          ))}
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
