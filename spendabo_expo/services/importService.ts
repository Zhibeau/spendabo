import { addDoc, collection, getDocs, orderBy, query } from "firebase/firestore";
import { ref, uploadString } from "firebase/storage";
import { getAuth } from "firebase/auth";
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

// base64Data: raw base64 string from expo-image-picker (preferred, no file I/O)
export async function uploadImport(
  fileName: string,
  mimeType: string = "application/octet-stream",
  base64Data: string,
): Promise<Import> {
  console.log("[uploadImport] start", { fileName, mimeType, base64Len: base64Data.length });

  const user = getAuth().currentUser;
  if (!user) throw new Error("Not authenticated");

  const importId = `imp_${Date.now()}`;
  const storagePath = `users/${user.uid}/imports/${importId}/${fileName}`;
  const storageRef = ref(storage(), storagePath);
  console.log("[uploadImport] storage path:", storagePath);

  console.log("[uploadImport] uploading to Firebase Storage...");
  await uploadString(storageRef, base64Data, "base64", { contentType: mimeType });
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
