// components/Rank.jsx
import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase"; // Firebase config
import { useNavigate } from "react-router-dom";
import "./Rank.css";
import FallbackImage from "../FallbackImage";
import debounce from "lodash.debounce";

// ---------------- UTILS -----------------
function computePower(user) {
  return (user.attack || 0) + (user.defense || 0) + (user.health || 0);
}

async function getTopUsers(stat = "power", pageSize = 100) {
  try {
    const storedStats = ["attack", "defense", "health"];

    if (storedStats.includes(stat)) {
      const q = query(
        collection(db, "users"),
        orderBy(stat, "desc"),
        limit(pageSize)
      );
      const snap = await getDocs(q);
      const users = [];
      snap.forEach((d) => users.push({ id: d.id, ...d.data() }));
      return users.map((u) => ({ ...u, power: computePower(u) }));
    }

    // if stat === "power"
    const CAP = Math.max(pageSize, 1000);
    const q = query(collection(db, "users"), limit(CAP));
    const snap = await getDocs(q);
    const users = [];
    snap.forEach((d) => users.push({ id: d.id, ...d.data() }));
    const enriched = users.map((u) => ({ ...u, power: computePower(u) }));
    enriched.sort((a, b) => b.power - a.power);
    return enriched.slice(0, pageSize);
  } catch (err) {
    console.error("getTopUsers error:", err);
    return [];
  }
}

async function getEquippedArtifacts(userId) {
  try {
    const eqRef = doc(db, "equippedArtifacts", userId);
    const eqSnap = await getDoc(eqRef);
    if (!eqSnap.exists()) {
      return Array.from({ length: 6 }, (_, i) => ({
        slot: i + 1,
        artifact: null,
        locked: i > 0,
      }));
    }
    const data = eqSnap.data() || {};
    return Array.from({ length: 6 }, (_, i) => {
      const key = `slot${i + 1}`;
      return {
        slot: i + 1,
        artifact: data[key]?.artifact || null,
        locked: data[key]?.locked ?? (i > 0),
      };
    });
  } catch (err) {
    console.error("getEquippedArtifacts error:", err);
    return Array.from({ length: 6 }, (_, i) => ({
      slot: i + 1,
      artifact: null,
      locked: i > 0,
    }));
  }
}

// ---------------- COMPONENT -----------------
const STAT_OPTIONS = ["power", "attack", "defense", "health"];

export default function Rank({ defaultStat = "power", pageSize = 100 }) {
  const [stat, setStat] = useState(defaultStat);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [equippedSlots, setEquippedSlots] = useState([]);
  const [showArtifacts, setShowArtifacts] = useState(false);

  const nav = useNavigate();

  // Debounced stat changer
  const changeStat = useMemo(
    () =>
      debounce((s) => {
        setStat(s);
        setRefreshKey((k) => k + 1);
      }, 180),
    []
  );

  useEffect(() => {
    return () => {
      if (changeStat && typeof changeStat.cancel === "function")
        changeStat.cancel();
    };
  }, [changeStat]);

  // Fetch users
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await getTopUsers(stat, pageSize);
        if (!mounted) return;
        setUsers(data);
        if (data.length > 0) {
          setSelectedUser(data[0]);
        }
      } catch (err) {
        console.error("Rank fetch error:", err);
        setError("Ma'lumotni yuklashda xato yuz berdi");
        setUsers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [stat, refreshKey, pageSize]);

  // Fetch equipped artifacts for selected user
  useEffect(() => {
    if (!selectedUser?.id) {
      setEquippedSlots([]);
      return;
    }
    (async () => {
      const slots = await getEquippedArtifacts(selectedUser.id);
      setEquippedSlots(slots);
    })();
  }, [selectedUser]);

  return (
    <div className="rank-shell">
      {/* Header Controls */}
      <header className="rank-header">
        <button
          className="menu-btn"
          onClick={() => nav("/mainmenu")}
          title="Main Menu"
        >
          ⬅️
        </button>
        <h1 className="rank-title">Top {pageSize}</h1>
        <div className="rank-controls">
          {STAT_OPTIONS.map((s) => (
            <button
              key={s}
              className={`rank-btn ${stat === s ? "active" : ""}`}
              onClick={() => changeStat(s)}
              aria-pressed={stat === s}
              title={`Sort by ${s}`}
            >
              {s === "power"
                ? "🔥 Power"
                : s === "attack"
                ? "⚔️ Attack"
                : s === "defense"
                ? "🛡️ Defense"
                : "❤️ Health"}
            </button>
          ))}
          <button
            className="rank-btn refresh"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            🔄
          </button>
        </div>
      </header>

      <div className="rank-body">
        {/* LEFT SIDE LIST */}
        <aside className="rank-left">
          {loading ? (
            <div className="rank-loading">⏳ Yuklanmoqda...</div>
          ) : error ? (
            <div className="rank-empty">⚠️ {error}</div>
          ) : users.length === 0 ? (
            <div className="rank-empty">⚠️ Hali hech kim yo‘q</div>
          ) : (
            <div className="rank-list">
              {users.map((u, i) => {
                const isSelected = selectedUser?.id === u.id;
                return (
                  <div
                    key={u.id || i}
                    className={`rank-row ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedUser(u)}
                  >
                    <div className="rank-pos">{i + 1}</div>
                    <div className="rank-name">{u.playerName || "Unknown"}</div>
                    <div className="rank-value">
                      {stat === "power" ? computePower(u) : u[stat] || 0}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        {/* RIGHT SIDE DETAIL */}
        <section
          className={`rank-right ${showArtifacts ? "show-artifacts" : ""}`}
        >
          {!selectedUser ? (
            <div className="rank-empty">⚠️ Foydalanuvchi tanlanmagan</div>
          ) : (
            <div className="rank-top-card">
              <div className="top-info">
                <h2 className="top-name">{selectedUser.playerName}</h2>
                <div className="rank-stars">
                  {[1, 2, 3, 4].map((s) => {
                    let active = false;
                    if (s === 1 && selectedUser.donate) active = true;
                    if (s === 2 && selectedUser.proQuest) active = true;
                    if (s === 3 && selectedUser.vip) active = true;
                    if (
                      s === 4 &&
                      (selectedUser["hero-lvl"] || 1) >= 100 &&
                      [selectedUser.donate, selectedUser.proQuest, selectedUser.vip].filter(
                        Boolean
                      ).length >= 3 &&
                      (selectedUser["stage-lvl"] || 0) >= 16
                    )
                      active = true;
                    return (
                      <span key={s} className={`rank-star ${active ? "active" : ""}`} title={
                        s === 1 ? "Donate" :
                        s === 2 ? "ProQuest" :
                        s === 3 ? "VIP" :
                        "Hero 100lvl + all + Stage16"
                      }>
                        ⭐
                      </span>
                    );
                  })}
                </div>
                <div className="artifact-toggle">
                {!showArtifacts ? (
                  <button onClick={() => setShowArtifacts(true)}>
                    🎒 Artifact Set
                  </button>
                ) : (
                  <button onClick={() => setShowArtifacts(false)}>
                    ⬅️ Back
                  </button>
                )}
              </div>
              </div>

              <div className="Rank-hero-section">
                <div className="hero-stats">
                  <div>⚔️ {selectedUser.attack || 0}</div>
                  <div>🛡️ {selectedUser.defense || 0}</div>
                  <div>❤️ {selectedUser.health || 0}</div>
                  <p className="rank-power">🔥 {computePower(selectedUser)}</p>
                </div>

                <div className="hero-avatar-wrap">
                  <FallbackImage
                    src={selectedUser["hero-image"] || "/Hero-none.png"}
                    alt={selectedUser.playerName}
                    className="hero-avatar"
                  />
                </div>
              </div>

              {showArtifacts && (
                <div className="artifact-slots">
                  {equippedSlots.map((slot) => (
                    <div key={slot.slot} className="artifact-slot">
                      {slot.artifact ? (
                        <div className="artifact-card">
                          <FallbackImage
                            src={slot.artifact.img_url}
                            fallback="/Artifact-none.png"
                          />
                          <p>lvl-
                            {slot.artifact.artifact_lvl || 1}
                          </p>
                        </div>
                      ) : slot.locked ? (
                        <div className="artifact-locked">🔒 Locked</div>
                      ) : (
                        <div className="artifact-empty">⬜ Empty</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

Rank.propTypes = {
  defaultStat: PropTypes.oneOf(STAT_OPTIONS),
  pageSize: PropTypes.number,
};
