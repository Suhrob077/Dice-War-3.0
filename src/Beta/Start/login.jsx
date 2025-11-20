import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { playSound } from "../../utils/playSound"; // 🔊 tovush util
import "./login.css";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // 🔹 Email/Password bilan login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    playSound("click.mp3");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        playSound("success.mp3");
        nav("/mainmenu");
      } else {
        playSound("error.mp3");
        setError("❌ Ushbu foydalanuvchi topilmadi. Iltimos, ro‘yxatdan o‘ting.");
      }
    } catch (err) {
      console.error("Login error:", err);
      playSound("error.mp3");
      setError("❌ Email yoki parol noto‘g‘ri!");
    }
  };

  // 🔹 Google bilan login
  const handleGoogleLogin = async () => {
    setError("");
    playSound("click.mp3");

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        playSound("success.mp3");
        nav("/mainmenu");
      } else {
        playSound("error.mp3");
        setError("❌ Siz hali ro‘yxatdan o‘tmagansiz. Iltimos, avval register qiling.");
        nav("/register");
      }
    } catch (err) {
      console.error("Google login error:", err);
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
        <h1>🔑 Login</h1>

        <form onSubmit={handleLogin}>
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

          <button type="submit" className="btn-login">Kirish</button>
        </form>

        <button onClick={handleGoogleLogin} className="google-btn">
          🔥 Google bilan kirish
        </button>

        <p className="switch">
          Hisobingiz yo‘qmi?{" "}
          <span onClick={() => { playSound("click.mp3"); nav("/register"); }}>
            Ro‘yxatdan o‘tish
          </span>
        </p>
      </div>
    </div>
  );
}
