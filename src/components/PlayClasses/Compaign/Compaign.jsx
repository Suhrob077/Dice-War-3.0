// src/components/PlayClasses/Compaign/Campaign.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../../lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import FallbackImage from "../../FallbackImage";
import "./Compaign.css";

export default function Campaign({ onClose, userData }) {
  const navigate = useNavigate();
  const currentStage = userData?.["stage-lvl"] || 1;

  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStageIndex, setSelectedStageIndex] = useState(0);
  const [selectedDifficulty, setSelectedDifficulty] = useState("Easy");

  const unlockedDifficulties = {
    Easy: true,
    Mid: (userData?.["stage-lvl-mid"] ?? 0) >= currentStage || currentStage >= 5,
    Hard: (userData?.["stage-lvl-hard"] ?? 0) >= currentStage || currentStage >= 10,
  };

  const getMaxUnlockedStage = () => ({
    easy: userData?.["stage-lvl"] ?? 1,
    mid: userData?.["stage-lvl-mid"] ?? 1,
    hard: userData?.["stage-lvl-hard"] ?? 1,
  });

  useEffect(() => {
    const fetchStages = async () => {
      try {
        const q = query(collection(db, "Dragons"));
        const snap = await getDocs(q);
        let data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        data.sort((a, b) => {
          const numA = a.stageNumber ?? parseInt(a.Stage_name?.match(/\d+/)?.[0] || "0");
          const numB = b.stageNumber ?? parseInt(b.Stage_name?.match(/\d+/)?.[0] || "0");
          return numA - numB;
        });
        setStages(data);
      } catch (err) {
        console.error("Stage'larni yuklashda xato:", err);
        alert("Stage'larni yuklashda xato yuz berdi!");
      } finally {
        setLoading(false);
      }
    };
    fetchStages();
  }, []);

  const startGame = (stageNum) => {
    const maxUnlocked = getMaxUnlockedStage();
    const diffKey = selectedDifficulty.toLowerCase();

    if (stageNum > maxUnlocked[diffKey]) {
      alert(`${selectedDifficulty} rejimida ${stageNum}-bosqich hali ochilmagan!`);
      return;
    }

    navigate("/game/classic", {
      state: { stage: stageNum, difficulty: diffKey },
    });
    onClose();
  };

  const getSSReward = (index) => 100 + index * 20;

  const nextStage = () => {
    if (selectedStageIndex < stages.length - 1) {
      setSelectedStageIndex(selectedStageIndex + 1);
    }
  };

  const prevStage = () => {
    if (selectedStageIndex > 0) {
      setSelectedStageIndex(selectedStageIndex - 1);
    }
  };

  if (loading) {
    return (
      <div className="campaign-overlay">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="campaign-modal">
          <div className="loading-text">Ajdaholar uyg'onmoqda...</div>
        </motion.div>
      </div>
    );
  }

  const stage = stages[selectedStageIndex];
  const stageNum = selectedStageIndex + 1;
  const maxUnlocked = getMaxUnlockedStage();
  const diffKey = selectedDifficulty.toLowerCase();
  const stats = stage[selectedDifficulty] || stage.Easy || {};
  const ssReward = getSSReward(selectedStageIndex);

  return (
    <div className="campaign-overlay" onClick={onClose}>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="campaign-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="campaign-header">
            <h2>Dragon Kampaniyasi</h2>
            <p>Joriy bosqich: <strong>{currentStage}</strong> / {stages.length}</p>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>

          {/* Stage Display */}
          <div className="stage-display">
            {/* Chap: Status */}
            <div className="stage-left">
              <h3>Statuslar</h3>
              <p>Attack: {stats.Atk ?? "?"}</p>
              <p>Defense: {stats.Def ?? "?"}</p>
              <p>Health: {stats.Hp ?? "?"}</p>
            </div>

            {/* Markaz: Ajdar rasmi */}
            <motion.div
              key={stage.id}
              className="dragon-center"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.5 }}
            >
              <FallbackImage
                src={stage.Dragon_img}
                fallback="/img/dragons/dragon-default.png"
                alt={stage.Stage_name || `Stage ${stageNum}`}
              />
              {stageNum % 5 === 0 && <div className="boss-crown">BOSS</div>}
            </motion.div>

            {/* O'ng: Sovg'alar */}
            <div className="stage-right">
              <h3>Sovg'alar</h3>
              <div className="gifts">
                <div className="gift">Gift 1</div>
                <div className="gift">Gift 2</div>
                <div className="gift">Gift 3</div>
              </div>
            </div>
          </div>

          {/* Qiyinchilik darajalari */}
          <div className="difficulty-tabs">
            {["Easy", "Mid", "Hard"].map((diff) => (
              <button
                key={diff}
                className={`tab ${selectedDifficulty === diff ? "active" : ""} ${
                  !unlockedDifficulties[diff] ? "locked" : ""
                }`}
                onClick={() => unlockedDifficulties[diff] && setSelectedDifficulty(diff)}
                disabled={!unlockedDifficulties[diff]}
              >
                {diff === "Easy" && "Oson"}
                {diff === "Mid" && "Oʻrta"}
                {diff === "Hard" && "Qiyin"}
              </button>
            ))}
          </div>

          {/* Play tugmasi */}
          <button className="play-button" onClick={() => startGame(stageNum)}>
            {selectedDifficulty === "Easy" && stageNum === currentStage ? "Boshlash" : "Qayta oʻynash"}
          </button>

          {/* Arrowlar */}
          <div className="stage-arrows">
            <button onClick={prevStage} disabled={selectedStageIndex === 0}>←</button>
            <button onClick={nextStage} disabled={selectedStageIndex === stages.length - 1}>→</button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
