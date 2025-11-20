// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 🔹 Firebase project config (o'zingizning project configingizni yozing!)
const firebaseConfig = {
  apiKey: "AIzaSyCnTaZx0NcGQWXYMGTeMt3ZzApINuA2VJ0",
  authDomain: "test1web-2887a.firebaseapp.com",
  projectId: "test1web-2887a",
  storageBucket: "test1web-2887a.firebasestorage.app",
  messagingSenderId: "259716263052",
  appId: "1:259716263052:web:42239661ba1786db7ddfa9",
  measurementId: "G-0HGB16968J"
};


// 🔹 Init
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
