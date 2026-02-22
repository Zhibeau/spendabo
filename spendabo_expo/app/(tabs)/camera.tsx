import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { uploadReceiptImage } from "../../services/importService";
import type { Import } from "../../types";

type UploadState = "idle" | "uploading" | "success" | "error";

export default function CameraScreen() {
  const [capturedImage, setCapturedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [importResult, setImportResult] = useState<Import | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera Permission Required",
        "Please allow camera access in Settings to scan receipts.",
        [{ text: "OK" }]
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      base64: true,
      exif: false,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0]);
      setUploadState("idle");
      setImportResult(null);
      setErrorMessage(null);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setUploadState("idle");
    setImportResult(null);
    setErrorMessage(null);
  };

  const processReceipt = async () => {
    if (!capturedImage?.base64) return;

    setUploadState("uploading");
    setErrorMessage(null);

    try {
      const result = await uploadReceiptImage(
        capturedImage.base64,
        capturedImage.mimeType ?? "image/jpeg",
        capturedImage.fileName ?? `receipt_${Date.now()}.jpg`
      );
      setImportResult(result);
      setUploadState("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to process receipt";
      setErrorMessage(message);
      setUploadState("error");
    }
  };

  // Success view
  if (uploadState === "success" && importResult) {
    return (
      <SafeAreaView className="flex-1 bg-[#FFF8F5]" edges={["bottom"]}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View className="flex-1 items-center justify-center px-6 py-12">
            <View className="w-full max-w-sm rounded-3xl bg-white px-6 py-8 shadow-sm">
              <View className="items-center">
                <Text className="text-5xl">✅</Text>
                <Text className="mt-4 text-xl font-bold text-stone-800">Receipt Processed</Text>
                <Text className="mt-1 text-sm text-stone-500">
                  Your receipt was imported successfully
                </Text>
              </View>

              <View className="mt-6 flex-row overflow-hidden rounded-2xl border border-stone-100">
                <View className="flex-1 items-center py-4">
                  <Text className="text-2xl font-bold text-teal-600">{importResult.importedCount}</Text>
                  <Text className="mt-0.5 text-xs text-stone-400">Imported</Text>
                </View>
                <View className="w-px bg-stone-100" />
                <View className="flex-1 items-center py-4">
                  <Text className={`text-2xl font-bold ${importResult.errorCount > 0 ? "text-rose-500" : "text-stone-400"}`}>
                    {importResult.errorCount}
                  </Text>
                  <Text className="mt-0.5 text-xs text-stone-400">Errors</Text>
                </View>
              </View>

              <TouchableOpacity
                className="mt-6 items-center rounded-2xl bg-teal-500 py-3.5"
                activeOpacity={0.8}
                onPress={retake}
              >
                <Text className="text-sm font-semibold text-white">Scan Another Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Image captured — preview & upload
  if (capturedImage) {
    return (
      <SafeAreaView className="flex-1 bg-[#FFF8F5]" edges={["bottom"]}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View className="px-4 py-6">
            <Text className="mb-3 text-sm font-semibold text-stone-600">Receipt Preview</Text>

            <View className="overflow-hidden rounded-2xl bg-stone-100" style={{ height: 400 }}>
              <Image
                source={{ uri: capturedImage.uri }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
              />
            </View>

            {uploadState === "error" && errorMessage && (
              <View className="mt-4 rounded-2xl bg-rose-50 px-4 py-3">
                <Text className="text-sm font-medium text-rose-600">Upload Failed</Text>
                <Text className="mt-0.5 text-xs text-rose-500">{errorMessage}</Text>
              </View>
            )}

            <View className="mt-4 gap-3">
              <TouchableOpacity
                className="items-center rounded-2xl bg-teal-500 py-4"
                activeOpacity={0.8}
                onPress={processReceipt}
                disabled={uploadState === "uploading"}
              >
                {uploadState === "uploading" ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text className="text-sm font-semibold text-white">Processing Receipt…</Text>
                  </View>
                ) : (
                  <Text className="text-sm font-semibold text-white">
                    {uploadState === "error" ? "Retry Upload" : "Process Receipt"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="items-center rounded-2xl border border-stone-200 bg-white py-4"
                activeOpacity={0.8}
                onPress={retake}
                disabled={uploadState === "uploading"}
              >
                <Text className="text-sm font-semibold text-stone-600">Retake Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Default — prompt to open camera
  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F5]" edges={["bottom"]}>
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-sm items-center rounded-3xl bg-white px-6 py-10 shadow-sm">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-teal-50">
            <Text className="text-4xl">📷</Text>
          </View>

          <Text className="text-xl font-bold text-stone-800">Scan Receipt</Text>
          <Text className="mt-2 text-center text-sm text-stone-500">
            Take a photo of your receipt and we'll automatically extract and categorize the transactions.
          </Text>

          <TouchableOpacity
            className="mt-8 w-full items-center rounded-2xl bg-teal-500 py-4"
            activeOpacity={0.8}
            onPress={openCamera}
          >
            <Text className="text-base font-semibold text-white">Open Camera</Text>
          </TouchableOpacity>

          <Text className="mt-4 text-center text-xs text-stone-400">
            Supports JPEG, PNG, and HEIC formats
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
