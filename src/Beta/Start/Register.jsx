import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { playSound } from "../../utils/playSound"; // 🔊 tovush util
import "./login.css";

export default function Register() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // 🔹 Email/Password bilan register
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    playSound("click.mp3");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ✅ Users hujjati
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        createdAt: new Date(),
      });

      // ✅ Inventory hujjati
      await setDoc(doc(db, "inventory", user.uid), {
        artifacts: [],
      });

      // ✅ EquippedArtifacts hujjati
      await setDoc(doc(db, "equippedArtifacts", user.uid), {
        slot1: { artifact: null, locked: false },
        slot2: { artifact: null, locked: true },
        slot3: { artifact: null, locked: true },
        slot4: { artifact: null, locked: true },
        slot5: { artifact: null, locked: true },
        slot6: { artifact: null, locked: true },
      });

      playSound("success.mp3");
      nav("/select-hero");
    } catch (err) {
      console.error("Register error:", err);
      playSound("error.mp3");
      setError("❌ Ro‘yxatdan o‘tishda xatolik: " + err.message);
    }
  };

  // 🔹 Google bilan register/login
  const handleGoogleRegister = async () => {
    setError("");
    playSound("click.mp3");

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // ✅ Agar users/{uid} mavjud bo‘lmasa yaratamiz
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          createdAt: new Date(),
        });
      }

      // ✅ Inventory kolleksiyasi
      const invRef = doc(db, "inventory", user.uid);
      const invSnap = await getDoc(invRef);
      if (!invSnap.exists()) {
        await setDoc(invRef, { artifacts: [] });
      }

      // ✅ EquippedArtifacts kolleksiyasi
      const eqRef = doc(db, "equippedArtifacts", user.uid);
      const eqSnap = await getDoc(eqRef);
      if (!eqSnap.exists()) {
        await setDoc(eqRef, { slots: [null, null, null, null, null, null] });
      }

      playSound("success.mp3");
      nav("/select-hero");
    } catch (err) {
      console.error("Google register error:", err);
      playSound("error.mp3");
      setError("❌ Google orqali kirishda xatolik: " + err.message);
    }
  };

  return (
    <div className="login-page">
      <video autoPlay muted loop className="bg-video">
        <source src="../../../public/LiveBg/Bg-start.mp4" type="video/mp4" />
      </video>

      <div className="overlay"></div>

      <div className="login-box">
        <h1>📝 Ro‘yxatdan o‘tish</h1>

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email kiriting..."
              required
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Parol..."
              required
              minLength={6}
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button type="submit" className="btn-register">
            Ro‘yxatdan o‘tish
          </button>
        </form>

        <button onClick={handleGoogleRegister} className="google-btn">
          🔥 Google bilan kirish
        </button>

        <p className="switch">
          Hisobingiz bormi?{" "}
          <span onClick={() => { playSound("click.mp3"); nav("/login"); }}>
            Login
          </span>
        </p>
      </div>
    </div>
  );
}
