import { addDoc, collection, getDocs, orderBy, query } from "firebase/firestore";
import { ref, uploadString } from "firebase/storage";
import { getAuth } from "firebase/auth";
import * as FileSystem from "expo-file-system";
import { db, storage } from "./firebase";
import type { Import } from "../types";

function importsCol(uid: string) {
  return collection(db(), "users", uid, "imports");
}

export async function getImports(): Promise<Import[]> {
  const user = getAuth().currentUser;
  if (!user) return [];
  const q = query(importsCol(user.uid), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Import));
}

export async function uploadImport(
  fileName: string,
  uri: string,
  mimeType: string = "application/octet-stream"
): Promise<Import> {
  console.log("[uploadImport] start", { fileName, uri, mimeType });

  const user = getAuth().currentUser;
  if (!user) throw new Error("Not authenticated");
  console.log("[uploadImport] user uid:", user.uid);

  const importId = `imp_${Date.now()}`;
  const storagePath = `users/${user.uid}/imports/${importId}/${fileName}`;
  const storageRef = ref(storage(), storagePath);
  console.log("[uploadImport] storage path:", storagePath);

  // Read the file as base64 via expo-file-system, which handles both
  // file:// and content:// URIs reliably on Android (XHR is unreliable for local URIs).
  console.log("[uploadImport] reading file via FileSystem...");
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  console.log("[uploadImport] base64 ready, length:", base64.length);

  console.log("[uploadImport] uploading to Firebase Storage...");
  await uploadString(storageRef, base64, "base64", { contentType: mimeType });
  console.log("[uploadImport] Storage upload complete");

  const importData: Omit<Import, "id"> = {
    fileName,
    status: "uploaded",
    totalRows: 0,
    importedCount: 0,
    errorCount: 0,
    createdAt: new Date().toISOString(),
  };

  console.log("[uploadImport] writing Firestore doc...");
  const docRef = await addDoc(importsCol(user.uid), importData);
  console.log("[uploadImport] Firestore doc written, id:", docRef.id);

  return { id: docRef.id, ...importData };
}
