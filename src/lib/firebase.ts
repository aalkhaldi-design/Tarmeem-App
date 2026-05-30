import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "tarmeem-app-2026.firebaseapp.com",
  projectId: "tarmeem-app-2026",
  storageBucket: "tarmeem-app-2026.firebasestorage.app",
  messagingSenderId: "1081328491905",
  appId: "1:1081328491905:web:9c06751e2c9bff3e695c80",
  measurementId: "G-R9HNQJQNZE"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
export const storage = getStorage(app);
export default app;
