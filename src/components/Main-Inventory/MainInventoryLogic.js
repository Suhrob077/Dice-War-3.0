//MainInventoryLogic.js
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, setDoc, updateDoc, deleteField, onSnapshot } from "firebase/firestore";
import { playSound } from "../../utils/playSound";
import { v4 as uuidv4 } from "uuid";

/** --- REAL-TIME INVENTORY LISTENER --- */
export function listenUserInventory(callback) {
  const user = auth.currentUser;
  if (!user) return () => {};

  const invRef = doc(db, "inventory", user.uid);
  const unsubscribe = onSnapshot(invRef, (snapshot) => {
    const data = snapshot.data() || {};
    const items = Object.entries(data)
      .filter(([key]) => key !== "userId")
      .map(([key, val]) => ({ ...val, docId: key }));
    callback(items);
  });

  return unsubscribe;
}

/** --- REAL-TIME EQUIPPED ARTIFACTS --- */
export function listenEquippedArtifacts(callback) {
  const user = auth.currentUser;
  if (!user) return () => {};

  const eqRef = doc(db, "equippedArtifacts", user.uid);
  const unsubscribe = onSnapshot(eqRef, (snapshot) => {
    const data = snapshot.data() || {};
    const slots = Array.from({ length: 6 }, (_, i) => {
      const key = `slot${i + 1}`;
      return {
        slot: i + 1,
        artifact: data[key]?.artifact || null,
        keyName: key,
        locked: data[key]?.locked ?? (i !== 0), // slot1 ochiq, qolganlari locked
      };
    });
    callback(slots);
  });

  return unsubscribe;
}

/** --- INITIALIZE EQUIPPED ARTIFACTS --- */
export async function initEquippedArtifacts() {
  const user = auth.currentUser;
  if (!user) return;

  const eqRef = doc(db, "equippedArtifacts", user.uid);
  const eqSnap = await getDoc(eqRef);
  if (!eqSnap.exists()) {
    await setDoc(eqRef, {
      slot1: { artifact: null, locked: false },
      slot2: { artifact: null, locked: true },
      slot3: { artifact: null, locked: true },
      slot4: { artifact: null, locked: true },
      slot5: { artifact: null, locked: true },
      slot6: { artifact: null, locked: true },
    });
  }
}

/** --- EQUIP ARTIFACT --- */
export async function tryEquipArtifact(artifact) {
  const user = auth.currentUser;
  if (!user || !artifact) return { success: false, message: "User yoki artifact topilmadi." };

  const eqRef = doc(db, "equippedArtifacts", user.uid);
  const eqSnap = await getDoc(eqRef);
  const slots = eqSnap.exists() ? eqSnap.data() : {};

  // Bo‘sh va unlock slot topish
  let slotKey = Object.keys(slots).find(k => !slots[k]?.artifact && !(slots[k]?.locked ?? true));
  if (!slotKey) return { success: false, message: "Bo‘sh slot yo‘q!" };

  await updateDoc(eqRef, { [slotKey]: { artifact, locked: false } });

  // Inventorydan artifactni o‘chirish
  const invRef = doc(db, "inventory", user.uid);
  await updateDoc(invRef, { [artifact.docId]: deleteField() });

  playSound("equip");
  return { success: true };
}

/** --- UNEQUIP ARTIFACT --- */
export async function tryUnequipArtifact(slotKey) {
  const user = auth.currentUser;
  if (!user) return { success: false, message: "User topilmadi." };

  const eqRef = doc(db, "equippedArtifacts", user.uid);
  const eqSnap = await getDoc(eqRef);
  if (!eqSnap.exists()) return { success: false, message: "Slot mavjud emas." };

  const slots = eqSnap.data();
  const artifact = slots[slotKey]?.artifact;
  if (!artifact) return { success: false, message: "Slot bo‘sh!" };

  const invRef = doc(db, "inventory", user.uid);
  await setDoc(invRef, { [uuidv4()]: artifact }, { merge: true });

  await updateDoc(eqRef, { [slotKey]: { locked: slots[slotKey]?.locked ?? true, artifact: null } });

  playSound("unequip");
  return { success: true };
}

/** --- SELL ARTIFACT --- */
export async function trySellArtifact(artifact) {
  const user = auth.currentUser;
  if (!user || !artifact) return { success: false, message: "User yoki artifact topilmadi." };

  const invRef = doc(db, "inventory", user.uid);
  await updateDoc(invRef, { [artifact.docId]: deleteField() });

  const sellPrice = (Number(artifact.artifact_lvl) || 1) * 100;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};
  await updateDoc(userRef, { SS: (userData.SS || 0) + sellPrice });

  playSound("sell");
  return { success: true, sellPrice };
}

/** --- UNLOCK SLOT (PULLI) --- */
export async function tryUnlockSlot(slotIdx, costKey = "SS", costAmount = 500) {
  const user = auth.currentUser;
  if (!user) return { success: false, message: "User topilmadi." };

  const eqRef = doc(db, "equippedArtifacts", user.uid);
  const eqSnap = await getDoc(eqRef);
  const slots = eqSnap.exists() ? eqSnap.data() : {};

  const keyName = `slot${slotIdx}`;
  if (!slots[keyName] || !slots[keyName].locked) return { success: false, message: "Allaqachon ochilgan!" };

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};

  if (!userData[costKey] || userData[costKey] < costAmount) {
    playSound("error");
    return { success: false, message: "Yetarli pul yo‘q!" };
  }

  await updateDoc(userRef, { [costKey]: userData[costKey] - costAmount });
  await updateDoc(eqRef, { [keyName]: { locked: false, artifact: null } });

  playSound("unlock");
  return { success: true };
}
