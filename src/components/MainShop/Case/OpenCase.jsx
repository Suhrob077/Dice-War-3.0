//OpenCase.jsx
import React, { useState } from "react";
import FallbackImage from "../../FallbackImage";
import { tryOpenChest } from "../MainShopLogic";
import "./OpenCase.css";

export default function OpenCase({ chest, userData, onClose, onComplete }) {
  const [opened, setOpened] = useState(false);
  const [artifact, setArtifact] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleOpen = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await tryOpenChest(userData, chest);
      if (res?.artifact) {
        setArtifact(res.artifact);
        setOpened(true);
      } else {
        setError(res?.message || "Chest ochishda xatolik.");
      }
    } catch (e) {
      console.error(e);
      setError("Chest ochishda kutilmagan xatolik.");
    } finally {
      setLoading(false);
    }
  };

  const handleUse = () => {
    // bu joyda artifactni darhol characterga qo‘shish bo‘lishi mumkin
    // hozircha faqat shopga qaytaramiz
    if (onComplete) onComplete();
  };

  return (
    <div className="oc-overlay">
      <div className="oc-modal">
        <button className="oc-close" onClick={onClose}>✖</button>

        {!opened ? (
          <div className="oc-stage">
            <h2>{chest.name}</h2>
            <FallbackImage
              src={`/Shop-chest/Shop-chest-${chest.id}.png`}
              fallback="/img/chest-fallback.png"
              alt={chest.name}
              className="oc-chest-img"
            />
            {error && <p className="oc-error">{error}</p>}
            <button
              className="oc-btn"
              disabled={loading}
              onClick={handleOpen}
            >
              {loading ? "Opening…" : "Open Chest"}
            </button>
          </div>
        ) : (
          <div className="oc-result">
            <h2>🎉 You got an Artifact!</h2>
            <div className={`oc-artifact-card rarity-${artifact?.rarity || "common"}`}>
              <FallbackImage
                src={artifact?.img_url || "/Artifact-none.png"}
                fallback="/Artifact-none.png"
                alt={artifact?.name}
                className="oc-artifact-img"
              />
              <h3>{artifact?.name}</h3>
              <div className="oc-stats">
                <p>HP: {artifact?.health}</p>
                <p>ATK: {artifact?.attack}</p>
                <p>DEF: {artifact?.defense}</p>
                <p>HP%: {artifact?.health_bonus}</p>
                <p>ATK%: {artifact?.attack_bonus}</p>
                <p>DEF%: {artifact?.defense_bonus}</p>
              </div>
            </div>
            <div className="oc-actions">
              <button className="oc-btn" onClick={handleUse}>Use</button>
              <button className="oc-btn secondary" onClick={onComplete}>Back to Shop</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
