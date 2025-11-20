// src/pages/MainMenu.jsx
import React, { useEffect, useMemo, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";

import MainQuest from "../../components/Quests/MainQuest";
import FallbackImage from "../../components/FallbackImage";

import {
  tryLevelUpStat,
  tryLevelUpArtifact,
  tryUnlockArtifact,
  computeArtifactBonus,
  getLevelUpCost
} from "./MainMenuLogic";

import { listenEquippedArtifacts } from "../../components/Main-Inventory/MainInventoryLogic";

import "./MainMenu.css";

export default function MainMenu() {
  const [userData, setUserData] = useState(null);
  const [equippedSlots, setEquippedSlots] = useState([]);
  const [showHero, setShowHero] = useState(false);
  const [playMode, setPlayMode] = useState(false);
  const [artifactBonusOn, setArtifactBonusOn] = useState(true);
  const [questOpen, setQuestOpen] = useState(false);
  const [hasNewQuest, setHasNewQuest] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) return navigate("/login");
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setUserData(snap.data());
      else navigate("/select-hero");
    });
    return unsub;
  }, [navigate]);

  useEffect(() => {
    if (!auth.currentUser) return;
    return listenEquippedArtifacts(setEquippedSlots);
  }, []);

  const handleLogout = () => signOut(auth).then(() => navigate("/login"));

  const incLevel = async (key) => {
    const result = tryLevelUpStat(userData, key);
    if (result.success) {
      setUserData(result.userData);
      await updateDoc(doc(db, "users", auth.currentUser.uid), result.userData);
    } else alert(result.message);
  };

  const incArtifactLevel = async (idx) => {
    const result = tryLevelUpArtifact(userData, idx);
    if (result.success) {
      setUserData(result.userData);
      await updateDoc(doc(db, "users", auth.currentUser.uid), result.userData);
    } else alert(result.message);
  };

  const unlockArtifact = async (idx) => {
    const result = tryUnlockArtifact(userData, idx);
    if (result.success) {
      setUserData(result.userData);
      await updateDoc(doc(db, "users", auth.currentUser.uid), result.userData);
    } else alert(result.message);
  };

  const artifacts = useMemo(() => {
    if (!userData) return [];
    return Array.from({ length: 6 }, (_, i) => {
      const idx = i + 1;
      const slot = equippedSlots.find(s => s.slot === idx);
      const unlocked = userData[`artifact${idx}-unlocked`] ?? false;
      const level = slot?.artifact?.artifact_lvl || userData[`artifact${idx}-lvl`] || 1;
      const icon = slot?.artifact?.img_url || userData[`artifact${idx}-img`] || `/img/artifact-${idx}.png`;
      const name = userData[`artifact${idx}-name`] || `Artifact ${idx}`;

      return { idx, name, level, unlocked, icon, equipped: !!slot?.artifact };
    });
  }, [userData, equippedSlots]);

  const artifactBonus = useMemo(() => computeArtifactBonus(artifacts), [artifacts]);

  const shownStats = useMemo(() => {
    if (!userData) return null;
    const base = { attack: userData.attack || 0, defense: userData.defense || 0, health: userData.health || 0 };
    if (!artifactBonusOn) return base;
    return {
      attack: base.attack + artifactBonus.attack,
      defense: base.defense + artifactBonus.defense,
      health: base.health + artifactBonus.health,
    };
  }, [userData, artifactBonus, artifactBonusOn]);

  if (!userData || !shownStats) return <div className="mm-loading">Yuklanmoqda...</div>;

  const heroLvl = userData["hero-lvl"] || 1;
  const stageLvl = userData["stage-lvl"] || 1;

  const openHero = () => { setShowHero(true); setPlayMode(false); };
  const openPlay = () => { setPlayMode(true); setShowHero(false); };
  const closeAll = () => { setShowHero(false); setPlayMode(false); };

  const renderArtifact = (a) => {
    const cost = getLevelUpCost("artifact", a.level);
    return (
      <div className={`mm-artifact-card ${!a.unlocked && "locked"} ${a.equipped && "equipped"}`} key={a.idx}>
        <div className="mm-artifact-icon">
          <FallbackImage src={a.icon} fallback="/Artifact-none.png" alt={a.name} />
        </div>
        <div className="mm-artifact-info">
          <div className="mm-artifact-name">{a.name}</div>
          <div className="mm-artifact-level">
            {a.unlocked ? (
              <>Lv.{a.level} {a.equipped && <span style={{color: '#67f7a3'}}>(Equipped)</span>}</>
            ) : (
              <button className="mm-btn sm primary" onClick={() => unlockArtifact(a.idx)}>
                Unlock (500 SS)
              </button>
            )}
            {a.unlocked && !a.equipped && (
              <button className="mm-btn xs primary" onClick={() => incArtifactLevel(a.idx)}>
                Lv+ <img src="/SSS/SS.png" alt="SS" width={16} /> {cost}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mm-main">
      <video className="mm-bg-video" autoPlay muted loop playsInline poster="/bg/mainmenu-poster.jpg">
        <source src="/bg/mainmenu-bg.mp4" type="video/mp4" />
      </video>

      <div className={`mm-dim-overlay ${showHero || playMode ? "show" : ""}`} onClick={closeAll} />

      {/* Header */}
      <header className="mm-header">
        <div className="mm-coins">
          {["SS", "SC", "SBC"].map(c => (
            <div className="mm-coin" key={c}>
              <FallbackImage src={`/SSS/${c}.png`} alt={c} />
              <span>{userData[c] ?? 0}</span>
            </div>
          ))}
        
        </div>
        

        <div className="mm-player-chip">
          <FallbackImage src={userData["hero-image"] || "/hero-default.png"} className="mm-player-avatar" fallback="/hero-default.png" />
          <div>
            <div className="mm-player-name">{userData.playerName}</div>
            <div className="mm-player-level">Lv {heroLvl}</div>
          </div>
          <button className="mm-btn ghost sm" onClick={handleLogout}>Chiqish</button>
        </div>
      </header>

      {/* Top Nav */}
      <nav className={`mm-top-nav ${showHero || playMode ? "hidden" : ""}`}>
        <button className={`mm-btn ${hasNewQuest ? "primary" : ""}`} onClick={() => setQuestOpen(true)}>
          Vazifalar {hasNewQuest && "✦"}
        </button>
        <button className="mm-btn" onClick={() => navigate("/Global-Rank")}>Rank</button>
        <button className="mm-btn" onClick={() => navigate("/mainshop")}>Shop</button>
        <button className="mm-btn" onClick={() => navigate("/maininventor")}>Inventory</button>
        <button className="mm-btn" onClick={openHero}>Hero</button>
        <button className="mm-btn play primary" onClick={openPlay}>PLAY</button>
      </nav>

      {/* Hero Panel */}
      <aside className={`mm-hero-preview ${showHero ? "open" : ""}`}>
        {showHero && <div className="mm-dismiss" onClick={closeAll} />}
        <div className="mm-hero-header">
          <h3>Hero Stats & Artifacts</h3>
          <button className="mm-btn xs ghost" onClick={closeAll}>✕</button>
        </div>

        <div className="mm-hero-body">
          <div className="mm-artifact-col">{artifacts.slice(0, 3).map(renderArtifact)}</div>

          <div className="mm-hero-figure">
            <FallbackImage src={userData["hero-image"]} className="mm-hero-img" fallback="/Hero-none.png" />
          </div>

          <div className="mm-artifact-col">{artifacts.slice(3, 6).map(renderArtifact)}</div>
        </div>

        <div className="mm-hero-stats">
          <div className="mm-stat-toggle">
            <label className="mm-switch">
              <input type="checkbox" checked={artifactBonusOn} onChange={e => setArtifactBonusOn(e.target.checked)} />
              <span className="mm-slider"></span>
            </label>
            <span>Artifact bonus: {artifactBonusOn ? "Yoqilgan" : "O‘chirilgan"}</span>
          </div>

          {["attack", "defense", "health"].map(key => {
            const lvl = userData[`${key}-lvl`] || 1;
            const val = shownStats[key];
            const bonus = artifactBonusOn ? artifactBonus[key] : 0;
            const cost = getLevelUpCost(key, lvl);

            return (
              <div className="mm-stat-row" key={key}>
                <div>
                  <strong>{key === "attack" ? "⚔️ Hujum" : key === "defense" ? "🛡️ Himoya" : "❤️ Sog‘liq"}</strong> Lv.{lvl}
                </div>
                <div className="mm-value">
                  {val} {bonus > 0 && <span >+{bonus}</span>}
                </div>
                <button className="mm-btn sm primary" onClick={() => incLevel(key)}>
                  Lv+ <img src="/SSS/SS.png" width={16} alt="SS" /> {cost}
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Play Mode Panel */}
      <aside className={`mm-mode-panel ${playMode ? "open" : ""}`}>
        {playMode && <div className="mm-dismiss" onClick={closeAll} />}
        <div className="mm-hero-header">
          <h3>O‘yin Rejimi</h3>
          <button className="mm-btn xs ghost" onClick={closeAll}>✕</button>
        </div>

        <div className="mm-mode-list">
          <div className="mm-mode-item" onClick={() => navigate("/game/classic")}>
            <video autoPlay muted loop playsInline poster="../">
              <source src="/modes/classic-preview.mp4" type="video/mp4" />
            </video>
            <div className="mm-mode-title">Classic Mode</div>
          </div>

          <div className={`mm-mode-item ${stageLvl < 10 ? "mm-locked" : ""}`}
               onClick={() => stageLvl >= 10 && navigate("/game/endless")}>
            <video autoPlay muted loop playsInline poster="/modes/endless-poster.jpg">
              <source src="/modes/endless-preview.mp4" type="video/mp4" />
            </video>
            <div className="mm-mode-title">
              {stageLvl < 10 ? `🔒 Endless Mode (${stageLvl}/10)` : "Endless Mode"}
            </div>
          </div>

          <div className={`mm-mode-item ${stageLvl < 20 ? "mm-locked" : ""}`}
               onClick={() => stageLvl >= 20 && navigate("/game/bossrush")}>
            <video autoPlay muted loop playsInline poster="/modes/bossrush-poster.jpg">
              <source src="/modes/bossrush-preview.mp4" type="video/mp4" />
            </video>
            <div className="mm-mode-title">
              {stageLvl < 20 ? `🔒 Boss Rush (${stageLvl}/20)` : "Boss Rush"}
            </div>
          </div>
        </div>
      </aside>

      {questOpen && <MainQuest onClose={() => setQuestOpen(false)} />}
    </div>
  );
}