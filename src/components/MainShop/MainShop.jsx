import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import FallbackImage from "../../components/FallbackImage";
import "./MainShop.css";
import { listMainArtifacts, tryBuyMainArtifact } from "./MainShopLogic";
import OpenCase from "./Case/OpenCase";

export default function MainShop() {
  const [userData, setUserData] = useState(null);
  const [shopArtifacts, setShopArtifacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingShop, setLoadingShop] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [buyingId, setBuyingId] = useState(null);

  const [filterType, setFilterType] = useState("all");
  const [selectedArtifact, setSelectedArtifact] = useState(null); // modal uchun
  const [openChest, setOpenChest] = useState(null); // yangi state OpenCase uchun

  const nav = useNavigate();

  const artifactsRef = useRef(null);
  const chestsRef = useRef(null);
  const donateRef = useRef(null);

  // --- USER FETCH ---
  useEffect(() => {
    let mounted = true;
    (async () => {
      const user = auth.currentUser;
      if (!user) {
        nav("/login");
        return;
      }
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (!mounted) return;
        if (snap.exists()) {
          setUserData(snap.data());
        } else {
          nav("/select-hero");
          return;
        }
      } catch (e) {
        console.error("User fetch error:", e);
        setError("Foydalanuvchi ma'lumotlarini olishda xatolik.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [nav]);

  // --- MAIN ARTIFACTS FETCH ---
  const loadShop = useCallback(async () => {
    setLoadingShop(true);
    setError("");
    try {
      const list = await listMainArtifacts(24);
      setShopArtifacts(Array.isArray(list) ? list : []);
      if (!list || !list.length) {
        setMessage("Hozircha shop bo'sh. Keyinroq tekshirib ko'ring.");
      }
    } catch (e) {
      console.error("Shop artifacts load error:", e);
      setError("Shop ma'lumotlarini yuklashda muammo yuz berdi.");
    } finally {
      setLoadingShop(false);
    }
  }, []);

  useEffect(() => {
    loadShop();
  }, [loadShop]);

  // --- CHESTS CONFIG ---
  const chests = useMemo(
    () => [
      { id: 1, name: "Bronze Chest", rarity: "common", price: { SS: 100 }, roll: { base: [5, 15], bonus: [1, 3] } },
      { id: 2, name: "Silver Chest", rarity: "uncommon", price: { SS: 200 }, roll: { base: [10, 25], bonus: [2, 5] } },
      { id: 3, name: "Gold Chest", rarity: "rare", price: { SC: 2 }, roll: { base: [20, 40], bonus: [5, 10] } },
      { id: 4, name: "Mythic Chest", rarity: "epic", price: { SBC: 1 }, roll: { base: [50, 80], bonus: [10, 20] } },
      { id: 5, name: "Daily Chest", rarity: "free", price: {}, roll: { base: [1, 5], bonus: [0, 1] } },
    ],
    []
  );

  // --- DONATE OPTIONS ---
  const donateOptions = useMemo(
    () => [
      { id: 1, price: "$1", reward: "1000 SS" },
      { id: 2, price: "$2", reward: "2200 SS" },
      { id: 3, price: "$5", reward: "6000 SS" },
      { id: 4, price: "$10", reward: "1 SC" },
      { id: 5, price: "$20", reward: "3 SC" },
      { id: 6, price: "$30", reward: "5 SC" },
      { id: 7, price: "$50", reward: "10 SC" },
      { id: 8, price: "$70", reward: "1 SBC" },
      { id: 9, price: "$100", reward: "2 SBC" },
      { id: 10, price: "$200", reward: "5 SBC" },
    ],
    []
  );

  // --- HELPERS ---
  const fmt = (n) => (typeof n === "number" ? n.toLocaleString() : String(n));
  const priceView = (priceObj) => {
    const k = Object.keys(priceObj || {})[0];
    if (!k) return "FREE";
    return `${fmt(priceObj[k])} ${k}`;
  };
  const enough = (priceObj) => {
    const k = Object.keys(priceObj || {})[0];
    if (!k) return true;
    return (userData?.[k] || 0) >= (priceObj?.[k] || 0);
  };

  // --- BUY ARTIFACT ---
  const onBuy = async (a) => {
    if (!userData) return;
    setBuyingId(a.id);
    setError("");
    setMessage("");
    try {
      const res = await tryBuyMainArtifact(userData, a);
      if (res?.success) {
        setUserData(res.userData);
        setMessage(`${a.name} sotib olindi va inventor’ga qo‘shildi!`);
      } else {
        setError(res?.message || "Sotib olishda xatolik.");
      }
    } catch (e) {
      console.error(e);
      setError("Sotib olishda kutilmagan xatolik.");
    } finally {
      setBuyingId(null);
    }
  };

  if (loading || !userData) {
    return (
      <div className="ms-loading-screen">
        <div className="ms-loader" />
        <p>Yuklanmoqda...</p>
      </div>
    );
  }

  // Unique artifact types
  const artifactTypes = [
    "all",
    ...Array.from(new Set((shopArtifacts || []).map((x) => x.type || "common"))),
  ];
  const filteredArtifacts = (shopArtifacts || []).filter((a) =>
    filterType === "all" ? true : (a.type || "common") === filterType
  );

  return (
    <div className="m-shop-container">
      {/* NOTICES */}
      <div className="m-shop-alerts" aria-live="polite">
        {error && <div className="m-shop-toast error">{error}</div>}
        {message && <div className="m-shop-toast ok">{message}</div>}
      </div>

      {/* HEADER */}
      <header className="m-shop-header">
        <div className="m-shop-title">
          <FallbackImage
            src="/img/dice-logo.png"
            fallback="/img/dice-fallback.png"
            alt="Dice War"
            className="m-shop-logo"
          />
          <div>
            <h1>Arcane Emporium</h1>
            <p className="m-shop-sub">Dice-War RPG Shop</p>
          </div>
        </div>

        <div className="m-shop-coins">
          {["SS", "SC", "SBC"].map((coin) => (
            <div key={coin} className="m-shop-coin-card" title={coin}>
              <FallbackImage
                src={`/SSS/${coin}.png`}
                alt={coin}
                className="m-shop-coin-img"
                fallback={`/SSS/${coin}-fallback.png`}
              />
              <span>{fmt(userData?.[coin] || 0)}</span>
            </div>
          ))}
          <button className="m-shop-btn" onClick={() => nav("/mainmenu")}>
            🔙 Back
          </button>
        </div>
      </header>

      {/* NAV BUTTONS */}
      <div className="m-shop-nav">
        <button onClick={() => artifactsRef.current.scrollIntoView({ behavior: "smooth" })}>
          Artifacts
        </button>
        <button onClick={() => chestsRef.current.scrollIntoView({ behavior: "smooth" })}>
          Chests
        </button>
        <button onClick={() => donateRef.current.scrollIntoView({ behavior: "smooth" })}>
          Donate
        </button>
      </div>

      {/* ARTIFACTS */}
      <section ref={artifactsRef} className="m-shop-section">
        <h3>Main Artifacts</h3>
        <div className="m-shop-controls">
          <select
            className="m-shop-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            {artifactTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button className="m-shop-btn" onClick={loadShop} disabled={loadingShop}>
            {loadingShop ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="m-shop-zigzag-grid">
          {filteredArtifacts.map((a, i) => (
            <div
              key={a.id}
              className={`m-shop-card ${i % 2 === 0 ? "left" : "right"}`}
              onClick={() => setSelectedArtifact(a)}
            >
              <FallbackImage
                src={a.img_url}
                alt={a.name}
                className="m-shop-card-img"
                fallback="/Artifact-none.png"
              />
              <h4>{a.name}</h4>
            </div>
          ))}
        </div>
      </section>

      {/* CHESTS */}
      <section ref={chestsRef} className="m-shop-section">
        <h3>Chests</h3>
        <div className="m-shop-zigzag-grid">
          {chests.map((ch, i) => {
            const can = enough(ch.price);
            return (
              <div
                key={ch.id}
                className={`m-shop-chest-card ${i % 2 === 0 ? "left" : "right"} ${can ? "" : "disabled"}`}
                onClick={() => can && setOpenChest(ch)}
              >
                <FallbackImage
                  src={`/Shop-chest/Shop-chest-${ch.id}.png`}
                  alt={ch.name}
                  className="m-shop-chest-img"
                  fallback="/img/chest-fallback.png"
                />
                <strong>{ch.name}</strong>
                <span>{priceView(ch.price)}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* DONATE */}
      <section ref={donateRef} className="m-shop-section">
        <h3>Donate</h3>
        <div className="m-shop-donate-grid">
          {donateOptions.map((d) => (
            <div key={d.id} className="m-shop-donate-card">
              <p>{d.price}</p>
              <strong>{d.reward}</strong>
              <button className="m-shop-btn">Buy</button>
            </div>
          ))}
        </div>
      </section>

      {/* ARTIFACT INFO MODAL */}
      {selectedArtifact && (
        <div className="m-shop-modal">
          <div className="m-shop-modal-content">
            <div className="stats-left">
              <p>HP: {fmt(selectedArtifact.health || 0)}</p>
              <p>ATK: {fmt(selectedArtifact.attack || 0)}</p>
              <p>DEF: {fmt(selectedArtifact.defense || 0)}</p>
            </div>
            <div className="modal-center">
              <FallbackImage
                src={selectedArtifact.img_url}
                alt={selectedArtifact.name}
                className="modal-img"
                fallback="/Artifact-none.png"
              />
              <h3>{selectedArtifact.name}</h3>
            </div>
            <div className="stats-right">
              <p>HP%: {fmt(selectedArtifact.health_bonus || 0)}</p>
              <p>ATK%: {fmt(selectedArtifact.attack_bonus || 0)}</p>
              <p>DEF%: {fmt(selectedArtifact.defense_bonus || 0)}</p>
            </div>
          </div>
          <div className="modal-actions">
            <button className="m-shop-btn" onClick={() => setSelectedArtifact(null)}>
              Close
            </button>
            <button
              className="m-shop-btn"
              disabled={buyingId === selectedArtifact.id}
              onClick={() => onBuy(selectedArtifact)}
            >
              {buyingId === selectedArtifact.id ? "Buying…" : "Buy"}
            </button>
          </div>
        </div>
      )}

      {/* OPEN CASE MODAL */}
      {openChest && (
        <OpenCase
          chest={openChest}
          userData={userData}
          onClose={() => setOpenChest(null)}
          onComplete={() => {
            setOpenChest(null);
            loadShop();
          }}
        />
      )}
    </div>
  );
}
