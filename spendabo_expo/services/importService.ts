import { addDoc, collection, getDocs, orderBy, query } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
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

export async function uploadImport(
  fileName: string,
  uri: string,
  mimeType: string = "application/octet-stream"
): Promise<Import> {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Not authenticated");

  const importId = `imp_${Date.now()}`;
  const storageRef = ref(storage(), `users/${user.uid}/imports/${importId}/${fileName}`);

  const response = await fetch(uri);
  const blob = await response.blob();
  await uploadBytes(storageRef, blob, { contentType: mimeType });

  const importData: Omit<Import, "id"> = {
    fileName,
    status: "uploaded",
    totalRows: 0,
    importedCount: 0,
    errorCount: 0,
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(importsCol(user.uid), importData);
  return { id: docRef.id, ...importData };
}
