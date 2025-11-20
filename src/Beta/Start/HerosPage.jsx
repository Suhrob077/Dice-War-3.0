import React, { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { playSound } from "../../utils/playSound"; 
import "./HerosPage.css";

// --- Supabase client for heroes table ---
const supabase = createClient(
  "https://wcmrbzppkqfeiapxczin.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjbXJienBwa3FmZWlhcHhjemluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNjYyMzAsImV4cCI6MjA3MDg0MjIzMH0.zbPzlkKDnKniArInLAD_6McAsXs1i0obNu1UvLXbkGc"
);

export default function HerosPage() {
  const [heroes, setHeroes] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selectedHero, setSelectedHero] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [chosen, setChosen] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [animatingChoose, setAnimatingChoose] = useState(false);
  const navigate = useNavigate();

  // Audio refs
  const audioSelectRef = useRef(null);
  const audioConfirmRef = useRef(null);
  const audioCancelRef = useRef(null);
  const audioBtnRef = useRef(null);
  const audioHoverRef = useRef(null);

  useEffect(() => {
    loadHeroes();

    // Preload audio
    audioSelectRef.current = new Audio("/assets/sfx/select.mp3");
    audioConfirmRef.current = new Audio("/assets/sfx/confirm.mp3");
    audioCancelRef.current = new Audio("/assets/sfx/cancel.mp3");
    audioBtnRef.current = new Audio("../../../public/sounds/ambient-soundscapes-004-space-atmosphere-303243.mp3");
    audioHoverRef.current = new Audio("/assets/sfx/hover.mp3");

    [audioSelectRef, audioConfirmRef, audioCancelRef, audioBtnRef, audioHoverRef].forEach((r) => {
      if (r.current) r.current.volume = 0.9;
    });
  }, []);

  async function loadHeroes() {
    const { data, error } = await supabase.from("heroes").select("*");
    if (error) {
      console.error("Error loading heroes:", error);
    } else {
      setHeroes(data || []);
    }
  }

  const filteredHeroes =
    filter === "all" ? heroes : heroes.filter((h) => h.kind === filter);

  const play = (audioRef) => {
    if (!soundOn) return;
    try {
      if (audioRef && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    } catch {
      if (typeof playSound === "function" && soundOn) {
        try {
          playSound();
        } catch {}
      }
    }
  };

  const handleCardClick = (hero) => {
    setSelectedHero(hero);
    setConfirming(true);
    play(audioSelectRef);
  };

  const handleOverlayChoice = (choice) => {
    play(audioBtnRef);
    if (choice === "yes") {
      setConfirming(false);
      setTimeout(() => {
        setChosen(true);
        setAnimatingChoose(true);
        play(audioConfirmRef);
      }, 180);
    } else {
      setConfirming(false);
      setSelectedHero(null);
      play(audioCancelRef);
    }
  };

  const cancelCreate = () => {
    play(audioCancelRef);
    setChosen(false);
    setSelectedHero(null);
    setPlayerName("");
    setAnimatingChoose(false);
  };

  const handleNext = async () => {
    if (!playerName.trim() || !selectedHero) {
      alert("Ism kiriting va qahramon tanlang!");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        alert("Iltimos, avval login yoki register qiling!");
        navigate("/login");
        return;
      }

      const userDoc = {
        playerName,
        "hero-image": selectedHero.image_url,
        "hero-lvl": 1,
        attack: 10,
        "attack-lvl": 1,
        defense: 10,
        "defense-lvl": 1,
        health: 10,
        "health-lvl": 1,
        "stage-lvl": 1,
        SS: 1000,
        SC: 0,
        SBC: 0,
      };
      await setDoc(doc(db, "users", user.uid), userDoc);
      await setDoc(doc(db, "inventory", user.uid), {});
      await setDoc(doc(db, "equippedArtifacts", user.uid), {
        slot1: { artifact: null, locked: false },
        slot2: { artifact: null, locked: true },
        slot3: { artifact: null, locked: true },
        slot4: { artifact: null, locked: true },
        slot5: { artifact: null, locked: true },
        slot6: { artifact: null, locked: true },
      });

      play(audioConfirmRef);
      console.log("✅ User + Inventory + EquippedArtifacts yaratildi:", userDoc);
      navigate("/mainmenu");
    } catch (err) {
      console.error("Error saving hero:", err);
      play(audioCancelRef);
      alert("❌ Xatolik: ma'lumot saqlanmadi!");
    }
  };

  const onFilterHover = () => play(audioHoverRef);

  return (
    <div className="hp-container with-bg-video" role="main">
          <video className="hp-bg-video" autoPlay muted loop playsInline>
            <source src="../../../public/LiveBg/Bgcreate.mp4" type="video/mp4" />
          </video>

      <header className="hp-header">
        <h1 className="hp-title">Qahramon Tanlash</h1>
        <div className="hp-header-controls">
          <div className="hp-sound-toggle">
            <button
              className={`hp-sound-btn ${soundOn ? "on" : "off"}`}
              onClick={() => {
                setSoundOn((s) => !s);
                play(audioBtnRef);
              }}
            >
              {soundOn ? "🔊 Tovush: ON" : "🔈 Tovush: OFF"}
            </button>
          </div>
        </div>
      </header>

      {!selectedHero && (
        <>
          <div className="hp-filter-buttons" role="tablist">
            {["all", "human", "monster", "evolution", "team"].map((kind) => (
              <button
                key={kind}
                onClick={() => {
                  setFilter(kind);
                  play(audioBtnRef);
                }}
                onMouseEnter={onFilterHover}
                className={`hp-filter-btn ${filter === kind ? "active" : ""}`}
              >
                {kind}
              </button>
            ))}
          </div>

          <div className="hp-hero-grid" role="list">
            {filteredHeroes.map((hero) => (
              <div
                key={hero.id}
                className="hp-hero-card"
                data-kind={hero.kind}
                onClick={() => handleCardClick(hero)}
                onMouseEnter={() => play(audioHoverRef)}
              >
                <div className="hp-hero-image-wrapper">
                  <img
                    src={hero.image_url}
                    alt={hero.name}
                    className="hp-hero-thumb"
                  />
                </div>
                <div className="hp-hero-meta">
                  <div className="hp-hero-name">{hero.name}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {confirming && selectedHero && (
        <div className="hp-confirm-overlay">
          <div
            className="hp-confirm-split hp-left-cancel"
            onClick={() => handleOverlayChoice("no")}
          >
            <div className="hp-split-inner">
              <h3>❌ Bekor qilaman</h3>
              <p>Qahramon tanlanmadi — orqaga qaytish</p>
            </div>
          </div>

          <div
            className="hp-confirm-split hp-right-confirm"
            onClick={() => handleOverlayChoice("yes")}
          >
            <div className="hp-split-inner">
              <h3>✅ Tanlayman</h3>
              <p>Qahramonni tasdiqlash va davom etish</p>
            </div>
          </div>

          <div className="hp-confirm-hero-visual">
            <img src={selectedHero.image_url} alt={selectedHero.name} />
            <div className="hp-confirm-hero-name">{selectedHero.name}</div>
          </div>
        </div>
      )}

      {selectedHero && chosen && (
        <div className="hp-chosen-hero hp-chosen-slide">
          <div className="hp-chosen-left">
            <h2>Ismingizni kiriting</h2>
            <input
              type="text"
              placeholder="O‘yinchi ismi"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <div className="hp-chosen-actions">
              <button
                className="hp-create-btn"
                onClick={handleNext}
                disabled={!playerName.trim()}
              >
                Create
              </button>
              <button className="hp-cancel-btn" onClick={cancelCreate}>
                Otmena
              </button>
            </div>
            <p className="hp-choose-hint">
              Agar bekor qilinsa, tanlash sahifasiga qaytadi.
            </p>
          </div>

          <div className={`hp-chosen-right ${animatingChoose ? "animate-enter" : ""}`}>
            <div className="hp-chosen-hero-card">
              <img
                src={selectedHero.image_url}
                alt={selectedHero.name}
                className="hp-chosen-hero-img"
              />
              <div className="hp-chosen-hero-info">
                <h3>{selectedHero.name}</h3>
                <div className="hp-statline">
                  <span>HP: {selectedHero.health || 10}</span>
                  <span>ATK: {selectedHero.attack || 10}</span>
                  <span>DEF: {selectedHero.defense || 10}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="hp-footer">
        <small>Dice War — Qahramon tanlash sahifasi</small>
      </footer>
    </div>
  );
}
