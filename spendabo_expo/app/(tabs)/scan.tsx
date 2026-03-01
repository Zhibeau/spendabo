import React, { useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Colors, cardShadow, primaryShadow } from "../../constants/theme";
import { uploadImport } from "../../services/importService";

type ScanState = "idle" | "uploading" | "success";

export default function ScanScreen() {
  const router = useRouter();
  const [state, setState] = useState<ScanState>("idle");

  const handleUpload = async (uri: string, mimeType: string, fileName: string) => {
    setState("uploading");
    try {
      await uploadImport(fileName, uri, mimeType);
      setState("success");
      setTimeout(() => {
        router.push("/(tabs)/transactions");
      }, 1800);
    } catch (e: unknown) {
      setState("idle");
      Alert.alert("Upload Failed", e instanceof Error ? e.message : "Please try again.");
    }
  };

  const handleCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Camera access is needed to scan receipts.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = `receipt_${Date.now()}.jpg`;
      await handleUpload(asset.uri, asset.mimeType ?? "image/jpeg", fileName);
    }
  };

  const handleGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Photo library access is needed to upload receipts.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = `receipt_${Date.now()}.jpg`;
      await handleUpload(asset.uri, asset.mimeType ?? "image/jpeg", fileName);
    }
  };

  if (state === "success") {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center" }}
        edges={["top"]}
      >
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: Colors.accent,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8,
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: Colors.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="check" size={28} color={Colors.primaryForeground} />
            </View>
          </View>
          <Text style={{ color: Colors.text, fontSize: 20, fontFamily: "PlusJakartaSans_600SemiBold", marginTop: 16, marginBottom: 6 }}>
            Receipt Uploaded!
          </Text>
          <Text style={{ color: Colors.textMuted, fontSize: 13, fontFamily: "PlusJakartaSans_400Regular", textAlign: "center" }}>
            Saved and queued for processing
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state === "uploading") {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center" }}
        edges={["top"]}
      >
        <View style={{ alignItems: "center" }}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ color: Colors.text, fontSize: 20, fontFamily: "PlusJakartaSans_600SemiBold", marginTop: 20, marginBottom: 6 }}>
            Uploading...
          </Text>
          <Text style={{ color: Colors.textMuted, fontSize: 13, fontFamily: "PlusJakartaSans_400Regular" }}>
            Saving your receipt
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={["top"]}>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 }}>
        <Text style={{ color: Colors.text, fontSize: 22, fontFamily: "PlusJakartaSans_600SemiBold", marginBottom: 4 }}>
          Scan Receipt
        </Text>
        <Text style={{ color: Colors.textMuted, fontSize: 13, fontFamily: "PlusJakartaSans_400Regular" }}>
          Capture or upload a receipt to track your expense
        </Text>
      </View>

      {/* Camera Preview Area */}
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        <View
          style={{
            flex: 1,
            minHeight: 360,
            backgroundColor: Colors.card,
            borderRadius: 24,
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: Colors.primary + "4D",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            position: "relative",
            ...cardShadow,
          }}
        >
          {/* Corner guides */}
          <View style={{ position: "absolute", top: 24, left: 24, width: 32, height: 32, borderTopWidth: 3, borderLeftWidth: 3, borderColor: Colors.primary, borderRadius: 4 }} />
          <View style={{ position: "absolute", top: 24, right: 24, width: 32, height: 32, borderTopWidth: 3, borderRightWidth: 3, borderColor: Colors.primary, borderRadius: 4 }} />
          <View style={{ position: "absolute", bottom: 24, left: 24, width: 32, height: 32, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: Colors.primary, borderRadius: 4 }} />
          <View style={{ position: "absolute", bottom: 24, right: 24, width: 32, height: 32, borderBottomWidth: 3, borderRightWidth: 3, borderColor: Colors.primary, borderRadius: 4 }} />

          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: Colors.accent,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Feather name="camera" size={28} color={Colors.primary} />
          </View>
          <Text style={{ color: Colors.textMuted, fontSize: 13, fontFamily: "PlusJakartaSans_400Regular", textAlign: "center", lineHeight: 20 }}>
            Point your camera at a receipt{"\n"}and tap capture
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 28, gap: 10 }}>
        <TouchableOpacity
          onPress={handleCamera}
          activeOpacity={0.85}
          style={{
            width: "100%",
            height: 52,
            backgroundColor: Colors.primary,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            ...primaryShadow,
          }}
        >
          <Feather name="camera" size={18} color={Colors.primaryForeground} />
          <Text style={{ color: Colors.primaryForeground, fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold" }}>
            Capture Receipt
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleGallery}
          activeOpacity={0.85}
          style={{
            width: "100%",
            height: 52,
            backgroundColor: Colors.card,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: Colors.primary + "4D",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            ...cardShadow,
          }}
        >
          <Feather name="upload-cloud" size={18} color={Colors.text} />
          <Text style={{ color: Colors.text, fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold" }}>
            Upload from Gallery
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
