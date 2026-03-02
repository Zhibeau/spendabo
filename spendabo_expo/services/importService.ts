import { addDoc, collection, getDocs, orderBy, query } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
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
  console.log("[uploadImport] start", { fileName, uri, mimeType });

  const user = getAuth().currentUser;
  if (!user) throw new Error("Not authenticated");
  console.log("[uploadImport] user uid:", user.uid);

  const importId = `imp_${Date.now()}`;
  const storagePath = `users/${user.uid}/imports/${importId}/${fileName}`;
  const storageRef = ref(storage(), storagePath);
  console.log("[uploadImport] storage path:", storagePath);

  // XHR-based blob creation works on Android for both file:// and content:// URIs.
  // Note: xhr.onload fires for any HTTP response (including non-200), so we check
  // xhr.status. For local file:// URIs the status is always 0 but response is valid.
  console.log("[uploadImport] reading blob via XHR...");
  const blob = await new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      console.log("[uploadImport] XHR onload, status:", xhr.status, "blobSize:", (xhr.response as Blob)?.size);
      if (xhr.status !== 0 && xhr.status >= 400) {
        reject(new Error(`Failed to read file (HTTP ${xhr.status})`));
      } else {
        resolve(xhr.response as Blob);
      }
    };
    xhr.onerror = (e) => {
      console.error("[uploadImport] XHR onerror:", e);
      reject(new Error("Failed to read image file (XHR error)"));
    };
    xhr.ontimeout = () => {
      console.error("[uploadImport] XHR timeout");
      reject(new Error("Failed to read image file (timeout)"));
    };
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });

  console.log("[uploadImport] blob ready, size:", blob.size, "type:", blob.type);

  console.log("[uploadImport] uploading to Firebase Storage...");
  await uploadBytes(storageRef, blob, { contentType: mimeType });
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
