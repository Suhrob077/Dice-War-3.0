import React, { useEffect, useState, useCallback, useMemo } from "react";
import "./MainQuest.css";
import {
  listQuestsForStages,
  tryClaimQuest,
  formatReward,
  getQuestIdForStage,
  getUserQuestClaims,
  getQuestMeta,
} from "./mainQuestLogic";
import { auth } from "../../lib/firebase";

/**
 * 🎯 MainQuest Panel
 * - Vazifalar ro‘yxati (Free va Pro mukofotlar)
 * - Bosqich darajasi asosida locked/unlocked
 * - Progress bar, reward preview
 * - Real-time claim holati
 */
export default function MainQuest({ onClose, stageLvl, hasPro }) {
  const [quests, setQuests] = useState([]);
  const [claimed, setClaimed] = useState({});
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [activeQuest, setActiveQuest] = useState(null);
  const [searchStage, setSearchStage] = useState("");
  const uid = auth.currentUser?.uid;

  // 🔹 Userning claimed questlarini olish
  const fetchClaims = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const data = await getUserQuestClaims(uid);
      setClaimed(data);
    } catch (e) {
      console.error("❌ Claimlarni olishda xato:", e);
    }
    setLoading(false);
  }, [uid]);

  // 🔹 Questlarni olish
  useEffect(() => {
    const q = listQuestsForStages(16); // jami 16 stage
    setQuests(q);
  }, []);

  // 🔹 Claimed holatni olish
  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  // 🔹 Progressni hisoblash
  useEffect(() => {
    if (!quests.length) return;
    const done = quests.filter((q) => {
      const qid = getQuestIdForStage(q.stage);
      return claimed[`${qid}-free`] || claimed[`${qid}-pro`];
    }).length;
    setProgress(Math.floor((done / quests.length) * 100));
  }, [quests, claimed]);

  // 🔹 Claim qilish
  const handleClaim = async (stage, type) => {
    if (!uid) return alert("Foydalanuvchi topilmadi!");
    const questId = getQuestIdForStage(stage);
    const res = await tryClaimQuest(uid, questId, type);
    if (res.ok) {
      setClaimed((prev) => ({ ...prev, [`${questId}-${type}`]: true }));
    } else {
      alert(res.reason || "Olishda xatolik");
    }
  };

  // 🔹 Search filter
  const filteredQuests = useMemo(() => {
    if (!searchStage) return quests;
    return quests.filter((q) =>
      q.stage.toString().includes(searchStage.toString())
    );
  }, [quests, searchStage]);

  if (loading) {
    return (
      <div className="mainquest-panel open">
        <div className="mq-header">
          <h2>📜 Asosiy Vazifalar</h2>
        </div>
        <div className="mq-loading">⏳ Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="mainquest-panel open">
      {/* HEADER */}
      <div className="mq-header">
        <h2>📜 Asosiy Vazifalar</h2>
        <button className="mq-close" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* Search */}
      <div className="mq-search">
        <input
          type="number"
          placeholder="Bosqich raqamini qidirish..."
          value={searchStage}
          onChange={(e) => setSearchStage(e.target.value)}
        />
      </div>

      {/* Progress */}
      <div className="mq-progress">
        <div className="mq-progress-bar">
          <div
            className="mq-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span>{progress}% bajarildi</span>
      </div>

      {/* QUEST LIST */}
      <div className="mq-content">
        {filteredQuests.map((q) => {
          const bloklangan = q.stage > stageLvl;
          const questId = getQuestIdForStage(q.stage);
          const freeClaimed = claimed[`${questId}-free`];
          const proClaimed = claimed[`${questId}-pro`];
          const meta = getQuestMeta(q.stage);

          return (
            <div
              key={q.stage}
              className={`mq-card ${bloklangan ? "locked" : ""} ${
                activeQuest?.stage === q.stage ? "active" : ""
              }`}
              onClick={() => setActiveQuest(q)}
            >
              <div className="mq-stage">Bosqich {q.stage}</div>

              {/* META */}
              {meta && (
                <div className="mq-meta">
                  <p>{meta.description}</p>
                  <small>🕒 {meta.time}</small>
                </div>
              )}

              {/* FREE */}
              <div className="mq-row">
                <span className="mq-type">Free:</span>
                <span className="mq-reward">{formatReward(q.free)}</span>
                <button
                  disabled={bloklangan || freeClaimed}
                  onClick={() => handleClaim(q.stage, "free")}
                >
                  {freeClaimed ? "✅ Olingan" : "🎁 Olish"}
                </button>
              </div>

              {/* PRO */}
              {hasPro && (
                <div className="mq-row">
                  <span className="mq-type pro">Pro:</span>
                  <span className="mq-reward">{formatReward(q.pro)}</span>
                  <button
                    disabled={bloklangan || proClaimed}
                    onClick={() => handleClaim(q.stage, "pro")}
                  >
                    {proClaimed ? "✅ Olingan" : "🎁 Olish"}
                  </button>
                </div>
              )}

              {bloklangan && (
                <div className="mq-lock-overlay">🔒 Bosqich bloklangan</div>
              )}
            </div>
          );
        })}
      </div>

      {/* ACTIVE QUEST DETAIL */}
      {activeQuest && (
        <div className="mq-detail">
          <h3>📌 Bosqich {activeQuest.stage} haqida</h3>
          <p>
            Free mukofot: {formatReward(activeQuest.free)} <br />
            Pro mukofot: {formatReward(activeQuest.pro)}
          </p>
          <button onClick={() => setActiveQuest(null)}>Yopish</button>
        </div>
      )}

      {/* FOOTER INFO */}
      <div className="mq-footer">
        <p>✔️ Vazifalar har bir bosqichga qarab ochiladi.</p>
        <p>
          🎁 Free vazifalar hamma uchun mavjud, Pro vazifalar faqat obuna
          foydalanuvchilar uchun.
        </p>
      </div>
    </div>
  );
}
