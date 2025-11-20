// mainQuestLogic.js
import { db } from "../../lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

/**
 * ===========================
 *  QUESTS (16) - Master List
 * ===========================
 * Bu massiv faqat o‘qish uchun — UI (jsx) faqat listQuestsForStages orqali oladi.
 * Har bir obyekt:
 *  - stage: Number
 *  - free: { coins: Number, artifacts: [String] }
 *  - pro:  { coins: Number, artifacts: [String] }
 */
const QUESTS = [
  { stage: 1, free: { coins: 50, artifacts: [] }, pro: { coins: 100, artifacts: ["Wooden Sword"] } },
  { stage: 2, free: { coins: 100, artifacts: [] }, pro: { coins: 200, artifacts: ["Iron Shield"] } },
  { stage: 3, free: { coins: 150, artifacts: ["Bronze Ring"] }, pro: { coins: 300, artifacts: ["Silver Ring"] } },
  { stage: 4, free: { coins: 200, artifacts: [] }, pro: { coins: 400, artifacts: ["Magic Staff"] } },

  { stage: 5, free: { coins: 250, artifacts: [] }, pro: { coins: 500, artifacts: ["Dragon Scale"] } },
  { stage: 6, free: { coins: 300, artifacts: ["Hunter Bow"] }, pro: { coins: 600, artifacts: ["Elven Bow"] } },
  { stage: 7, free: { coins: 350, artifacts: [] }, pro: { coins: 700, artifacts: ["Rare Crystal"] } },
  { stage: 8, free: { coins: 400, artifacts: ["Leather Armor"] }, pro: { coins: 800, artifacts: ["Steel Armor"] } },

  { stage: 9, free: { coins: 450, artifacts: [] }, pro: { coins: 900, artifacts: ["Fire Amulet"] } },
  { stage: 10, free: { coins: 500, artifacts: ["Magic Scroll"] }, pro: { coins: 1000, artifacts: ["Ancient Scroll"] } },
  { stage: 11, free: { coins: 550, artifacts: [] }, pro: { coins: 1100, artifacts: ["Sacred Gem"] } },
  { stage: 12, free: { coins: 600, artifacts: ["Silver Helmet"] }, pro: { coins: 1200, artifacts: ["Golden Helmet"] } },

  { stage: 13, free: { coins: 700, artifacts: [] }, pro: { coins: 1400, artifacts: ["Ice Crystal"] } },
  { stage: 14, free: { coins: 800, artifacts: ["Wizard Cloak"] }, pro: { coins: 1600, artifacts: ["Enchanted Cloak"] } },
  { stage: 15, free: { coins: 900, artifacts: [] }, pro: { coins: 1800, artifacts: ["Phoenix Feather"] } },
  { stage: 16, free: { coins: 1000, artifacts: ["Hero Crown"] }, pro: { coins: 2000, artifacts: ["Legendary Crown"] } },
];

/**
 * ===========================
 *  HELPERS / UTILS
 * ===========================
 */

/** return stage id like 'stage-1' */
export function getQuestIdForStage(stage) {
  return `stage-${stage}`;
}

/** build claim key: 'stage-1-free' or 'stage-1-pro' */
function buildClaimKey(stage, type) {
  return `${getQuestIdForStage(stage)}-${type}`;
}

/** Format reward for UI text (also used by MainQuest.jsx previously) */
export function formatReward(reward) {
  if (!reward) return "—";
  const parts = [];
  if (reward.coins) parts.push(`${reward.coins} 💰`);
  if (reward.artifacts && reward.artifacts.length) {
    reward.artifacts.forEach((a) => parts.push(`🗡️ ${a}`));
  }
  return parts.join(", ");
}

/** Return a shallow clone of quest for a stage */
export function getQuestForStage(stage) {
  return QUESTS.find((q) => q.stage === stage) || null;
}

/** metadata for UI detail (optional) */
export function getQuestMeta(stage) {
  // You can expand descriptions, times, tips per stage here
  const metaMap = {
    1: { description: "Boshlang'ich vazifa: kichik sovrinlar.", time: "1-2 min" },
    2: { description: "Ozroq qiyinroq. Oddiy dushmanlar.", time: "2-4 min" },
    3: { description: "Yangi artifact imkoniyati.", time: "3-5 min" },
    4: { description: "Kuchli o‘yinchi uchun sinov.", time: "4-6 min" },
    // generic fallback
  };
  return metaMap[stage] || { description: "Standard vazifa", time: "—" };
}

/**
 * listQuestsForStages(maxStage)
 * - UI ga barcha stage ma'lumotlarni beradi, lekin masalan unlocked state JSX ichida stageLvl bilan hisoblanadi.
 * - maxStage param — qancha stagegacha qaytarish kerakligini bildiradi (ko'pincha 16).
 */
export function listQuestsForStages(maxStage = 16) {
  return QUESTS.filter((q) => q.stage <= (maxStage || 16));
}

/**
 * ===========================
 *  FIRESTORE ACCESSORS
 * ===========================
 */

/**
 * getUserQuestClaims(uid)
 * - mainQuests collection ichida hujjat (doc) saqlanadi per user
 * - strukturasi:
 *    mainQuests/{uid} => { claimed: { "stage-1-free": true, ... }, updatedAt: Timestamp }
 */
export async function getUserQuestClaims(uid) {
  if (!uid) return {};
  try {
    const ref = doc(db, "mainQuests", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return {};
    const data = snap.data() || {};
    return data.claimed || {};
  } catch (err) {
    console.error("getUserQuestClaims error:", err);
    return {};
  }
}

/**
 * tryClaimQuest(uid, questId, type)
 *
 * Atomik tranzaksiya bilan:
 *  - tekshiradi: allaqachon claimed emasmi
 *  - tekshiradi: user mavjudmi (users collection)
 *  - tekshiradi: user.stage-lvl yetarlimi (unlock sharti)
 *  - tekshiradi: agar type==='pro' bo'lsa user.hasPro yoki user.pro true ekanligini
 *  - agar hammasi ok bo'lsa -> update users doc (SS — coins va artifact field qo'shish)
 *  - mainQuests docga claimed yoziladi (setDoc merge: true)
 *
 * Qaytaradi:
 *  { ok: true, awarded: { coins, artifacts }, snapshot: ... }
 * yoki
 *  { ok: false, reason: "..." }
 */
export async function tryClaimQuest(uid, questId, type = "free") {
  if (!uid) return { ok: false, reason: "Foydalanuvchi topilmadi" };
  if (!questId) return { ok: false, reason: "Quest identifikatori berilmagan" };
  type = type === "pro" ? "pro" : "free";

  const stage = parseInt(questId.split("-")[1], 10);
  if (Number.isNaN(stage)) return { ok: false, reason: "Noto'g'ri questId" };

  const quest = getQuestForStage(stage);
  if (!quest) return { ok: false, reason: "Quest topilmadi" };

  const claimKey = buildClaimKey(stage, type);
  const mainQuestRef = doc(db, "mainQuests", uid);
  const userRef = doc(db, "users", uid);

  try {
    // runTransaction ensures atomic check+update (prevents double-claim)
    const result = await runTransaction(db, async (tx) => {
      // load docs inside transaction
      const mainSnap = await tx.get(mainQuestRef);
      const userSnap = await tx.get(userRef);

      if (!userSnap.exists()) {
        throw new Error("UserNotFound");
      }

      const mainData = mainSnap.exists() ? mainSnap.data() : { claimed: {} };
      const userData = userSnap.data() || {};

      // 1) Already claimed?
      if (mainData.claimed && mainData.claimed[claimKey]) {
        throw new Error("AlreadyClaimed");
      }

      // 2) Is stage unlocked for this user? (userData['stage-lvl'] must be >= stage)
      const stageLvl = parseInt(userData["stage-lvl"] || 0, 10);
      if (stageLvl < stage) {
        throw new Error("StageLocked");
      }

      // 3) If claiming pro — ensure user has pro flag
      const userHasPro = Boolean(userData.pro || userData.hasPro || false);
      if (type === "pro" && !userHasPro) {
        throw new Error("ProRequired");
      }

      // 4) Build updates to user doc
      const reward = type === "pro" ? quest.pro : quest.free;
      if (!reward) throw new Error("NoReward");

      const userUpdates = {};
      // SS coins handling
      if (reward.coins && Number.isFinite(reward.coins)) {
        // increment SS safely
        userUpdates.SS = (userData.SS || 0) + reward.coins;
      }

      // add artifact-reward entries — keyed by stage and index
      if (Array.isArray(reward.artifacts) && reward.artifacts.length) {
        reward.artifacts.forEach((artifactName, idx) => {
          // key example: artifact-reward-3-0: "Bronze Ring"
          userUpdates[`artifact-reward-${stage}-${idx}`] = artifactName;
        });
      }

      // 5) Persist updates:
      // update user doc
      tx.update(userRef, userUpdates);

      // mark claimed in mainQuests doc: merge with existing claimed map
      const newMainData = {
        ...mainData,
        claimed: {
          ...(mainData.claimed || {}),
          [claimKey]: true,
        },
        updatedAt: serverTimestamp(),
      };
      // set with merge behaviour: here we write full doc inside transaction via tx.set
      // Note: runTransaction's tx doesn't have set with options param in web modular API,
      // so we emulate by writing the merged object (newMainData) — this is safe because we read mainData earlier.
      tx.set(mainQuestRef, newMainData);

      // 6) Return awarded data so the transaction can resolve with info
      return {
        awarded: {
          coins: reward.coins || 0,
          artifacts: reward.artifacts ? [...reward.artifacts] : [],
        },
      };
    });

    // Transaction success
    return { ok: true, ...result };
  } catch (err) {
    // Map common errors to friendly messages
    const msgMap = {
      AlreadyClaimed: "Allaqachon olingan!",
      StageLocked: "Bu bosqich hali ochilmagan!",
      ProRequired: "Pro obuna talab etiladi!",
      UserNotFound: "Foydalanuvchi topilmadi!",
      NoReward: "Mukofot yo'q",
    };

    const code = err.message || err.code || "Unknown";
    const reason = msgMap[code] || err.message || "Xatolik yuz berdi";
    console.warn("tryClaimQuest failed:", code, err);
    return { ok: false, reason };
  }
}

/**
 * ===========================
 *  Additional utilities (optional helpers for server/admin)
 * ===========================
 */

/**
 * adminMarkAllClaimed(uid)
 * - (Admin / testing utility) barcha questlarni claimed deb belgilaydi.
 * - ishlatilganda ehtiyot bo'ling
 */
export async function adminMarkAllClaimed(uid) {
  if (!uid) throw new Error("uid required");
  const mainRef = doc(db, "mainQuests", uid);
  const allClaimed = {};
  QUESTS.forEach((q) => {
    allClaimed[buildClaimKey(q.stage, "free")] = true;
    allClaimed[buildClaimKey(q.stage, "pro")] = true;
  });
  await setDoc(mainRef, { claimed: allClaimed, updatedAt: serverTimestamp() }, { merge: true });
  return { ok: true };
}

/**
 * resetUserClaims(uid)
 * - (testing) qayta o'rnatadi
 */
export async function resetUserClaims(uid) {
  if (!uid) throw new Error("uid required");
  const mainRef = doc(db, "mainQuests", uid);
  await setDoc(mainRef, { claimed: {} }, { merge: true });
  return { ok: true };
}

/**
 * ===========================
 *  NOTES & SAFETY
 * ===========================
 * - tryClaimQuest ishlatishda front-end faqat tugma disabled/enable bilan cheklaydi.
 * - Ammo server-side/transaction bilan ham tekshirish bajariladi (double-claim, locked stage, pro-check).
 * - Artifactlar user doc ichida alohida key sifatida yoziladi: artifact-reward-<stage>-<idx>
 *   Bu strukturagacha odatdagi: bundan keyin inventory array ko‘rinishiga o'tkazish oson.
 * - Agar siz artifactlarni array formatida saqlamoqchi bo'lsangiz, tx.update bilan arrayUnion ishlatish mumkin.
 * - runTransaction ishlatildi — quyidagi holatlarda u muvaffaqiyatli bo'ladi: read -> checks -> write
 *
 * ===========================
 *  EXPORT SUMMARY
 * ===========================
 */
export default {
  listQuestsForStages,
  getQuestIdForStage,
  formatReward,
  getUserQuestClaims,
  tryClaimQuest,
  getQuestMeta,
};
