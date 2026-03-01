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

function setupKey(uid: string) {
  return `spendabo_setup_${uid}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthState = {
  user: User | null;
  loading: boolean;
  isNewUser: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  markSetupComplete: () => Promise<void>;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  isNewUser: false,
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  logOut: async () => {},
  markSetupComplete: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Check AsyncStorage to see if this user has completed setup
        const done = await ReactNativeAsyncStorage.getItem(setupKey(firebaseUser.uid));
        setIsNewUser(!done);
      } else {
        setIsNewUser(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged handles isNewUser detection via AsyncStorage
  }

  async function signUp(email: string, password: string) {
    // Set isNewUser before creating the account so AuthGuard sees it
    // when onAuthStateChanged fires with the new user
    setIsNewUser(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setIsNewUser(false);
      throw e;
    }
  }

  async function signInWithGoogle() {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (response.type !== "success" || !response.data?.idToken) {
      throw new Error("Google sign-in was cancelled or failed");
    }
    const credential = GoogleAuthProvider.credential(response.data.idToken);
    await signInWithCredential(auth, credential);
    // onAuthStateChanged handles isNewUser detection via AsyncStorage
  }

  async function logOut() {
    await signOut(auth);
    try {
      await GoogleSignin.signOut();
    } catch {
      // Google sign-out is best-effort; may fail if signed in via email
    }
    setIsNewUser(false);
  }

  async function markSetupComplete() {
    if (auth.currentUser) {
      await ReactNativeAsyncStorage.setItem(setupKey(auth.currentUser.uid), "true");
    }
    setIsNewUser(false);
  }

  return (
    <AuthContext.Provider value={{ user, loading, isNewUser, signIn, signUp, signInWithGoogle, logOut, markSetupComplete }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
