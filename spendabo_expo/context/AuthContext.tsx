import Constants from "expo-constants";
import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import {
  Auth,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { createContext, useContext, useEffect, useState } from "react";

const extra = Constants.expoConfig?.extra ?? {};

const firebaseConfig = {
  apiKey: extra.firebaseApiKey as string,
  authDomain: extra.firebaseAuthDomain as string,
  projectId: extra.firebaseProjectId as string,
  storageBucket: extra.firebaseStorageBucket as string,
  messagingSenderId: extra.firebaseMessagingSenderId as string,
  appId: extra.firebaseAppId as string,
};

// Reuse existing app instance (prevents duplicate initialization on hot reload)
const isNewApp = getApps().length === 0;
const app: FirebaseApp = isNewApp ? initializeApp(firebaseConfig) : getApps()[0];

const auth: Auth = isNewApp
  ? initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    })
  : getAuth(app);

GoogleSignin.configure({
  webClientId: extra.googleWebClientId as string,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthState = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  logOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUp(email: string, password: string) {
    await createUserWithEmailAndPassword(auth, email, password);
  }

  async function signInWithGoogle() {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (response.type !== "success" || !response.data?.idToken) {
      throw new Error("Google sign-in was cancelled or failed");
    }
    const credential = GoogleAuthProvider.credential(response.data.idToken);
    await signInWithCredential(auth, credential);
  }

  async function logOut() {
    await signOut(auth);
    await GoogleSignin.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
