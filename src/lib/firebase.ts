import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "enteka-control-center",
  appId: "1:725325837933:web:de9ca396230552585d7164",
  apiKey: "AIzaSyBAEF9cHxi6GCJ5IVCAmu9yATkEUIasSv0",
  authDomain: "enteka-control-center.firebaseapp.com",
  storageBucket: "enteka-control-center.firebasestorage.app",
  messagingSenderId: "725325837933",
};

// Avoid re-initializing on HMR
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
