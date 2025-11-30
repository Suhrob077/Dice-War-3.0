// MainShop.jsx — TOʻLIQ YANGILANGAN & 100% ISHLAYDI (2025) — Duplicate key tuzatildi
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, writeBatch, increment } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import FallbackImage from "../FallbackImage";
import OpenCase from "./Case/OpenCase";
import { listMainArtifacts, tryBuyMainArtifact, tryOpenChest } from "./MainShopLogic";
import { supabase } from "./MainShopLogic";
import { playSound } from "../../utils/playSound";
import Logo from '../../../public/favicon.jpg'
import "./MainShop.css";

export default function MainShop() {
  const [userData, setUserData] = useState(null);
  const [shopArtifacts, setShopArtifacts] = useState([]);
  const [weapons, setWeapons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingShop, setLoadingShop] = useState(true);
  const [loadingWeapons, setLoadingWeapons] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [buyingId, setBuyingId] = useState(null);
  const [openChest, setOpenChest] = useState(null);
  const [confirmBuy, setConfirmBuy] = useState(null); // ← YAGONA CONFIRM MODAL

  const [activeTab, setActiveTab] = useState("artifacts");
  const [weaponFilter, setWeaponFilter] = useState("all");

  const nav = useNavigate();

  // USER FETCH
  useEffect(() => {
    let mounted = true;
    (async () => {
      const user = auth.currentUser;
      if (!user) { nav("/login"); return; }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!mounted) return;
        if (snap.exists()) setUserData(snap.data());
        else nav("/select-hero");
      } catch (e) {
        setError("Foydalanuvchi ma'lumotlarini olishda xatolik.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [nav]);

  // ARTIFACTS FETCH
  const loadShop = useCallback(async () => {
    setLoadingShop(true);
    try {
      const list = await listMainArtifacts(24);
      setShopArtifacts(Array.isArray(list) ? list : []);
    } catch (e) {
      setError("Shop yuklanmadi.");
    } finally {
      setLoadingShop(false);
    }
  }, []);

  useEffect(() => { loadShop(); }, [loadShop]);

  const loadWeapons = async () => {
    setLoadingWeapons(true);
    try {
      const tables = ["swords", "knives", "axes", "hammers", "shields"];
      
      const categoryMap = {
        swords: "sword",
        knives: "knife",
        axes: "axe",
        hammers: "hammer",
        shields: "shield"
      };

      const requests = tables.map(table =>
        supabase.from(table).select("id, name, img, attack, defense, Cost, skill")
      );

      const responses = await Promise.all(requests);
      let all = [];

      responses.forEach((res, i) => {
        const tableName = tables[i];
        if (!res || res.error) {
          console.error(`Table ${tableName} yuklanmadi:`, res?.error);
          return;
        }

        const category = categoryMap[tableName];

        res.data.forEach(item => {
          if (!item || !item.name) return; // agar name bo'lmasa o'tkazib yuboramiz

          // --- MUHIM: dbId = asl numeric id, uid = unik React key (jadval + id) ---
          const dbId = item.id;
          const uid = `${tableName}-${dbId}`; // misol: "swords-17" — bu hamma jadval bo'ylab noyob bo'ladi

          all.push({
            uid,                // unique key for React + comparisons
            dbId,               // original DB id (numeric)
            table: tableName,   // original table name (eg "swords")
            name: item.name,
            img_url: item.img || "/img/no-image.png",
            atk: item.attack || 0,
            def: item.defense || 0,
            cost: item.Cost ?? 0,
            skill: item.skill || null,
            category: category, // "sword" | "knife" | ...
          });
        });
      });

      all.sort((a, b) => a.cost - b.cost);
      setWeapons(all);
      console.log("Yuklangan qurollar soni:", all.length); // DEBUG uchun
    } catch (err) {
      console.error("Qurollar yuklanmadi:", err);
      setError("Qurollar yuklanmadi");
    } finally {
      setLoadingWeapons(false);
    }
  };

  useEffect(() => {
    if (activeTab === "weapons") loadWeapons();
  }, [activeTab]);

  // CHESTS
  const chests = useMemo(() => [
    { id: 1, name: "Bronze Chest", rarity: "common", price: { SS: 100 }, roll: { base: [5, 15], bonus: [1, 3] } },
    { id: 2, name: "Silver Chest", rarity: "uncommon", price: { SS: 200 }, roll: { base: [10, 25], bonus: [2, 5] } },
    { id: 3, name: "Gold Chest", rarity: "rare", price: { SC: 2 }, roll: { base: [20, 40], bonus: [5, 10] } },
    { id: 4, name: "Mythic Chest", rarity: "epic", price: { SBC: 1 }, roll: { base: [50, 80], bonus: [10, 20] } },
    { id: 5, name: "Daily Chest", rarity: "free", price: {}, roll: { base: [1, 5], bonus: [0, 1] } },
  ], []);

  // HELPERS
  const fmt = n => typeof n === "number" ? n.toLocaleString() : n;

  const enough = (priceObj) => {
    if (!priceObj || Object.keys(priceObj).length === 0) return true;
    const [coin, amt] = Object.entries(priceObj)[0];
    return (userData?.[coin] || 0) >= amt;
  };

  const priceView = (priceObj) => {
    if (!priceObj || Object.keys(priceObj).length === 0) return { text: "FREE", coin: null };
    const [coin, amt] = Object.entries(priceObj)[0];
    return { text: fmt(amt), coin };
  };

  const weaponPriceView = (cost) => {
    if (!cost || cost === 0) return { text: "FREE", coin: null };
    if (cost < 1) return { text: Math.round(cost * 1000).toLocaleString(), coin: "SS" };
    return { text: fmt(Math.floor(cost)), coin: "SC" };
  };

  // UNIVERSAL CONFIRM HANDLER
  const confirmPurchase = async () => {
    if (!confirmBuy) return;
    const { type, item, price } = confirmBuy;
    setConfirmBuy(null);
    // buyingId is uid for weapons, for artifacts/chests it's item.id or item.id-like
    setBuyingId(item.uid || item.id || null);

    try {
      // === WEAPON ===
      if (type === "weapon") {
        // item.cost is numeric (may be <1 for SS)
        const cost = item.cost || 0;
        const isSS = cost < 1 && cost > 0;
        const coin = isSS ? "SS" : "SC";
        const amount = isSS ? Math.round(cost * 1000) : Math.floor(cost);

        // use dbId and table (from supabase) for inventory metadata (keeps original ids)
        const uniqueKey = `weapon_${item.table}_${item.dbId}_${Date.now()}`;
        const artifactObj = {
          artifactId: item.dbId,
          table: item.table,          // eg "swords"
          type: "weapon",
          source: "shop",
          name: item.name,
          img_url: item.img_url,
          attack: item.atk || 0,
          defense: item.def || 0,
          skill: item.skill || null,
          equipped: false,
          category: item.category,
        };

        const batch = writeBatch(db);
        batch.update(doc(db, "users", auth.currentUser.uid), { [coin]: increment(-amount) });
        batch.set(doc(db, "inventory", auth.currentUser.uid), { [uniqueKey]: artifactObj }, { merge: true });
        await batch.commit();

        setUserData(prev => ({ ...prev, [coin]: (prev[coin] || 0) - amount }));
        playSound("buy");
        setMessage(`${item.name} muvaffaqiyatli sotib olindi!`);
      }

      // === ARTIFACT ===
      else if (type === "artifact") {
        const res = await tryBuyMainArtifact(userData, item);
        if (res?.success) {
          setUserData(res.userData);
          playSound("buy");
          setMessage(`${item.name} sotib olindi!`);
        } else {
          playSound("error");
          setError(res?.message || "Sotib olishda xatolik.");
        }
      }

      // === CHEST ===
      else if (type === "chest") {
        const res = await tryOpenChest(userData, item);
        if (res?.success) {
          setUserData(res.userData);
          playSound("open-chest");
          setOpenChest({ ...item, openedArtifact: res.artifact });
          setMessage(`${item.name} ochildi!`);
        } else {
          playSound("error");
          setError(res?.message || "Sandiq ochilmadi!");
        }
      }
    } catch (e) {
      console.error(e);
      setError("Xarid yoki ochishda xatolik yuz berdi.");
      playSound("error");
    } finally {
      setBuyingId(null);
    }
  };

  if (loading || !userData) return <div className="ms-loading-screen"><div className="ms-loader" /><p>Yuklanmoqda...</p></div>;

  const filteredWeapons = weapons.filter(w => weaponFilter === "all" || w.category === weaponFilter);

  return (
    <div className="m-shop-container">

      {/* ALERTS */}
      <div className="m-shop-alerts" aria-live="polite">
        {error && <div className="m-shop-toast error">{error}<button onClick={() => setError("")}>×</button></div>}
        {message && <div className="m-shop-toast ok">{message}<button onClick={() => setMessage("")}>×</button></div>}
      </div>

      {/* UNIVERSAL CONFIRM MODAL */}
      {confirmBuy && (
        <div className="artifact-preview-overlay" onClick={() => setConfirmBuy(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <h3>Xaridni tasdiqlang</h3>
            <p>{confirmBuy.message || `${confirmBuy.item.name} ni sotib olasizmi?`}</p>
            <div className="price-tag" style={{ justifyContent: "center", margin: "20px 0", fontSize: "1.4em" }}>
              {confirmBuy.price.coin && <FallbackImage src={`/SSS/${confirmBuy.price.coin}.png`} className="coin-icon" />}
              <span>{confirmBuy.price.text} {confirmBuy.price.coin || ""}</span>
            </div>
            <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
              <button className="m-shop-btn" onClick={confirmPurchase}>Ha</button>
              <button className="m-shop-btn" style={{ background: "#666" }} onClick={() => setConfirmBuy(null)}>Yoʻq</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="m-shop-header">
        <div className="m-shop-title">
          <FallbackImage src={Logo} alt="Dice War" className="m-shop-logo" />
          <div>
            <h1>Arcane Emporium</h1>
            <p className="m-shop-sub">Dice-War RPG Shop</p>
          </div>
        </div>
        <div className="m-shop-coins">
          {["SS", "SC", "SBC"].map(c => (
            <div key={c} className="m-shop-coin-card">
              <FallbackImage src={`/SSS/${c}.png`} alt={c} className="m-shop-coin-img" />
              <span>{fmt(userData[c] || 0)}</span>
            </div>
          ))}
          <button className="m-shop-btn" onClick={() => nav("/mainmenu")}>Back</button>
        </div>
      </header>

      {/* LEFT NAV */}
      <nav className="m-shop-left-nav">
        <button className={activeTab === "artifacts" ? "active" : ""} onClick={() => setActiveTab("artifacts")}>Artifacts</button>
        <button className={activeTab === "chests" ? "active" : ""} onClick={() => setActiveTab("chests")}>Chests</button>
        <button className={activeTab === "weapons" ? "active" : ""} onClick={() => setActiveTab("weapons")}>Weapons</button>
        <button className={`donate-btn ${activeTab === "donate" ? "active" : ""}`} onClick={() => setActiveTab("donate")}>Donate</button>
      </nav>

      {/* MAIN CONTENT */}
      <div className="m-shop-main-content">

        {/* WEAPON FILTERS */}
        <div className={`weapon-filters-wrapper ${activeTab === "weapons" ? "active" : ""}`}>
          <div className="weapon-filters">
            {["all", "sword", "knife", "axe", "hammer", "shield"].map(cat => (
              <button key={cat} className={weaponFilter === cat ? "active" : ""} onClick={() => setWeaponFilter(cat)}>
                {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ARTIFACTS */}
        {activeTab === "artifacts" && (
          <section className="m-shop-section">
            <h3>Main Artifacts</h3>
            <div className="m-shop-controls">
              <button className="m-shop-btn" onClick={loadShop} disabled={loadingShop}>
                {loadingShop ? "Yangilanmoqda…" : "Refresh Shop"}
              </button>
            </div>
            <div className="m-shop-zigzag-grid">
              {shopArtifacts.map(a => {
                const priceInfo = priceView(a.price);
                const canBuy = enough(a.price);
                return (
                  <div
                    key={a.id}
                    className={`m-shop-card ${canBuy ? "" : "disabled"} ${buyingId === a.id ? "buying" : ""}`}
                    onClick={() => canBuy && setConfirmBuy({
                      type: "artifact",
                      item: a,
                      message: `${a.name} artifactini sotib olasizmi?`,
                      price: priceInfo
                    })}
                  >
                    <FallbackImage src={a.img_url} alt={a.name} className="m-shop-card-img" />
                    <h4>{a.name}</h4>
                    <div className="price-tag">
                      {priceInfo.coin && <FallbackImage src={`/SSS/${priceInfo.coin}.png`} className="coin-icon" />}
                      <span className={canBuy ? "affordable" : "not"}>{priceInfo.text} {priceInfo.coin || ""}</span>
                    </div>
                    {buyingId === a.id && <div className="buying-overlay">Sotib olinmoqda...</div>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CHESTS */}
        {activeTab === "chests" && (
          <section className="m-shop-section">
            <h3>Chests</h3>
            <div className="m-shop-zigzag-grid">
              {chests.map(ch => {
                const priceInfo = priceView(ch.price);
                const canOpen = enough(ch.price);
                return (
                  <div
                    key={ch.id}
                    className={`m-shop-chest-card ${canOpen ? "" : "disabled"}`}
                    onClick={() => canOpen && setConfirmBuy({
                      type: "chest",
                      item: ch,
                      message: `${ch.name} sandiqni ochmoqchimisiz?`,
                      price: priceInfo
                    })}
                  >
                    <FallbackImage src={`/Shop-chest/Shop-chest-${ch.id}.png`} alt={ch.name} className="m-shop-chest-img" />
                    
                    <div className="price-tag">
                      {priceInfo.coin && <FallbackImage src={`/SSS/${priceInfo.coin}.png`} className="coin-icon" />}
                      <span>{priceInfo.text} {priceInfo.coin || ""}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* WEAPONS */}
        {activeTab === "weapons" && (
          <section className="m-shop-section">
            <h3>Weapons Shop</h3>
            {loadingWeapons ? <p>Yuklanmoqda...</p> : filteredWeapons.length === 0 ? <p>Qurol topilmadi.</p> : (
              <div className="m-shop-zigzag-grid">
                {filteredWeapons.map(w => {
                  const p = weaponPriceView(w.cost);
                  const amount = p.coin === "SS" ? parseInt(p.text.replace(/,/g, "")) : parseInt(p.text.replace(/,/g, ""));
                  const canBuy = !p.coin || (userData[p.coin] || 0) >= amount;

                  const mainStat = w.category === "shield"
                    ? (w.def > 0 ? `DEF +${w.def}` : "")
                    : (w.atk > 0 ? `ATK +${w.atk}` : "");

                  return (
                    <div
                      key={w.uid} // <-- unique key (tableName-dbId)
                      className={`m-shop-card ${canBuy ? "" : "disabled"} ${buyingId === w.uid ? "buying" : ""}`}
                      onClick={() => canBuy && setConfirmBuy({
                        type: "weapon",
                        item: w, // w contains uid, dbId, table, etc.
                        message: `${w.name} qurolini sotib olasizmi?`,
                        price: p
                      })}
                    >
                      <FallbackImage src={w.img_url} alt={w.name} className="m-shop-card-img" />
                      <h4>{w.name}</h4>
                      {mainStat && <p className="weapon-main-stat">{mainStat}</p>}
                      {w.skill && <p className="weapon-skill">{w.skill}</p>}
                      <div className="price-tag">
                        {p.coin && <FallbackImage src={`/SSS/${p.coin}.png`} className="coin-icon" />}
                        <span className={canBuy ? "affordable" : "not"}>{p.text} {p.coin || ""}</span>
                      </div>
                      {buyingId === w.uid && <div className="buying-overlay">Sotib olinmoqda...</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* DONATE */}
        {activeTab === "donate" && (
          <section className="m-shop-section">
            <h3>Donate & Get Rewards</h3>
            <div className="m-shop-donate-grid">
              {/* Donate kartalari */}
            </div>
          </section>
        )}
      </div>

      {/* CHEST OCHILGANDA */}
      {openChest && (
        <OpenCase
          chest={openChest}
          openedArtifact={openChest.openedArtifact}
          onClose={() => {
            setOpenChest(null);
            loadShop();
          }}
        />
      )}
    </div>
  );
}
