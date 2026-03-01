import { getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Lazy getters — safe to call after Firebase app is initialized in AuthContext
export const db = () => getFirestore(getApp());
export const storage = () => getStorage(getApp());
