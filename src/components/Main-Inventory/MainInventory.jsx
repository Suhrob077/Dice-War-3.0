//MainInventory.jsx
import React, { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
import { useNavigate } from "react-router-dom";
import FallbackImage from "../../components/FallbackImage";
import {
  listenUserInventory,
  listenEquippedArtifacts,
  tryEquipArtifact,
  tryUnequipArtifact,
  trySellArtifact,
  tryUnlockSlot
} from "./MainInventoryLogic";
import "./MainInventory.css";

export default function MainInventory() {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [equippedSlots, setEquippedSlots] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [artifactBonusOn, setArtifactBonusOn] = useState(true);
  const [saving, setSaving] = useState(false);
  const nav = useNavigate();

  // --- Real-time listener
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return nav("/login");

    const unsubscribeInventory = listenUserInventory(setInventoryItems);
    const unsubscribeEquipped = listenEquippedArtifacts(setEquippedSlots);

    return () => {
      unsubscribeInventory();
      unsubscribeEquipped();
    };
  }, [nav]);

  const selectedArtifact = inventoryItems.find(a => a.docId === selectedId) || null;

  // --- Equip artifact
  const handleEquip = async () => {
    if (!selectedArtifact) return alert("Artifact tanlanmadi.");
    const hasEmptySlot = equippedSlots.some(slot => !slot.locked && !slot.artifact);
    if (!hasEmptySlot) return alert("Bo‘sh slot yo‘q yoki ochilmagan!");
    setSaving(true);
    const res = await tryEquipArtifact(selectedArtifact);
    if (!res.success) alert(res.message);
    setSelectedId(null);
    setSaving(false);
  };

  // --- Unequip artifact
  const handleUnequip = async (slotKey) => {
    setSaving(true);
    const res = await tryUnequipArtifact(slotKey);
    if (!res.success) alert(res.message);
    setSaving(false);
  };

  // --- Sell artifact
  const handleSell = async () => {
    if (!selectedArtifact) return alert("Artifact tanlanmadi.");
    setSaving(true);
    const res = await trySellArtifact(selectedArtifact);
    if (res.success) alert(`Artifact sotildi! +${res.sellPrice} SS`);
    else alert(res.message);
    setSaving(false);
  };

  // --- Unlock slot
  const handleUnlockSlot = async (slotIdx) => {
    const res = await tryUnlockSlot(slotIdx, "SS", 500);
    if (!res.success) alert(res.message);
  };

  return (
    <div className="inv-main">
      <header className="inv-header">
        <h2>🎒 Inventory</h2>
        <button className="mm-btn ghost" onClick={() => nav("/mainmenu")}>⬅️ Back</button>
      </header>

      <section className="inv-slots" aria-label="Equipped slots">
  {equippedSlots.map(slot => (
    <div key={slot.slot} className="inv-slot">
      {slot.artifact ? (
        <div className="inv-artifact equipped">
          <FallbackImage src={slot.artifact.img_url} alt={slot.artifact.name} fallback="/Artifact-none.png"/>
          <p>{slot.artifact.name} (Lv {slot.artifact.artifact_lvl || 1})</p>
          <button className="mm-btn xs" disabled={saving} onClick={() => handleUnequip(slot.keyName)}>❌ Unequip</button>
        </div>
      ) : slot.locked ? (
        <div className="inv-slot-locked">
          🔒 Locked Slot
          <button className="mm-btn xs" disabled={saving} onClick={() => handleUnlockSlot(slot.slot)}>💰 Unlock</button>
        </div>
      ) : (
        <div className="inv-slot-empty">⬜ Empty Slot</div>
      )}
    </div>
  ))}
      </section>

      <section className="inv-detail" style={{ minHeight: 220 }}>
        {selectedArtifact ? (
          <div className="inv-detail-card">
            <h3>{selectedArtifact.name}</h3>
            <FallbackImage src={selectedArtifact.img_url} alt={selectedArtifact.name} fallback="/Artifact-none.png"/>
            <p>Level: {selectedArtifact.artifact_lvl || 1}</p>
            {selectedArtifact.status && (
              <ul className="artifact-status">
                {Object.entries(selectedArtifact.status).map(([key, value]) => (
                  <li key={key}>{key}: {value}</li>
                ))}
              </ul>
            )}
            <div className="inv-detail-actions">
              <button className="mm-btn sm" disabled={saving} onClick={handleEquip}>⚔️ Equip</button>
              <button className="mm-btn sm danger" disabled={saving} onClick={handleSell}>💰 Sell</button>
            </div>
          </div>
        ) : <div className="inv-detail-empty">⬆️ Inventordan artifact tanla</div>}
      </section>

      <section className="inv-list">
        <h3>📦 Sizning artifactlaringiz</h3>
        <div className="inv-grid">
          {inventoryItems.length === 0 ? (
            <p>Inventorda artifact yo‘q.</p>
          ) : (
            inventoryItems.map((a, i) => (
              <div key={a.docId ?? i} className={`inv-item ${String(selectedId) === String(a.docId) ? "selected" : ""}`} onClick={() => setSelectedId(a.docId ?? i)}>
                <FallbackImage src={a.img_url} alt={a.name} fallback="/Artifact-none.png"/>
                <span>{a.name} Lv {a.artifact_lvl || 1}</span>
                {a.status && (
                  <ul className="artifact-status">
                    {Object.entries(a.status).map(([key, value]) => (
                      <li key={key}>{key}: {value}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
