// /MainShop/MainShopLogic.js
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@supabase/supabase-js";
import { auth, db } from "../../lib/firebase";
import { doc, writeBatch, increment } from "firebase/firestore";
import { playSound } from "../../utils/playSound";

/* -------------------- SUPABASE CLIENT -------------------- */
const SUPABASE_URL = "https://yvuxspfineghfyzoztng.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2dXhzcGZpbmVnaGZ5em96dG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMzczMjgsImV4cCI6MjA3MDkxMzMyOH0.WsHBNJ11eSeCu2IhWr-GZvN5XCs9hlYOPmZbO_XqbOg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* -------------------- HELPERS -------------------- */
const BASE_KEYS = ["attack", "defense", "health"];
const BONUS_KEYS = ["attack_bonus", "defense_bonus", "health_bonus"];

const randInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pickTwoDistinct = (arr) => {
  if (arr.length < 2) return arr.slice();
  const i = Math.floor(Math.random() * arr.length);
  let j = Math.floor(Math.random() * arr.length);
  while (j === i) j = Math.floor(Math.random() * arr.length);
  return [arr[i], arr[j]];
};

const firstPriceEntry = (priceObj = {}) => {
  const k = Object.keys(priceObj)[0];
  return k ? [k, priceObj[k]] : [null, 0];
};

/* -------------------- PRICE RULES -------------------- */
export function priceForMainType(type) {
  switch (type) {
    case "legendary":
      return { SBC: 3 };
    case "epic":
      return { SBC: 1 };
    case "rare":
      return { SC: 3 };
    case "uncommon":
      return { SC: 1 };
    case "common":
    default:
      return { SS: 300 };
  }
}

/* -------------------- CRAFT STATS GENERATOR -------------------- */
export function craftStatsWithTwoRandomValues(roll) {
  const { base = [1, 1], bonus = [0, 0] } = roll || {};
  const [k1, k2] = pickTwoDistinct(BASE_KEYS);

  const stats = {
    health: 0,
    attack: 0,
    defense: 0,
    health_bonus: 0,
    attack_bonus: 0,
    defense_bonus: 0,
  };

  stats[k1] = randInt(base[0], base[1]);
  stats[k2] = randInt(base[0], base[1]);

  const bonusKey = BONUS_KEYS[Math.floor(Math.random() * BONUS_KEYS.length)];
  stats[bonusKey] = randInt(bonus[0], bonus[1]);

  return stats;
}

/* -------------------- SUPABASE: MAIN ARTIFACTS -------------------- */
export async function listMainArtifacts(limit = 12) {
  try {
    const { data, error } = await supabase
      .from("main_artifacts")
      .select(
        "id, name, type, img_url, health, attack, defense, health_bonus, attack_bonus, defense_bonus, artifact_lvl"
      )
      .limit(limit);

    if (error) {
      console.error("Supabase error (listMainArtifacts):", error);
      return [];
    }

    return (data || []).map((row) => ({
      ...row,
      price: priceForMainType(row.type),
    }));
  } catch (e) {
    console.error("Unexpected error (listMainArtifacts):", e);
    return [];
  }
}

/* -------------------- CHEST OPENING -------------------- */
export async function tryOpenChest(userData, chest) {
  const user = auth.currentUser;
  if (!user) return { success: false, message: "User mavjud emas." };

  const [coin, amount] = firstPriceEntry(chest.price || {});
  if (coin && (userData[coin] || 0) < amount) {
    playSound("error");
    return { success: false, message: `${coin} yetarli emas!` };
  }

  try {
    const { data, error } = await supabase
      .from("craft_artifacts")
      .select("id, category, name, img_url, artifact_lvl");

    if (error || !data?.length) {
      console.error("Supabase error (craft_artifacts):", error);
      playSound("error");
      return { success: false, message: "Supabase: craft_artifacts topilmadi!" };
    }

    const row = data[Math.floor(Math.random() * data.length)];
    const stats = craftStatsWithTwoRandomValues(chest.roll);

    const uniqueKey = row.id + "_" + uuidv4();

    const artifactObj = {
      artifactId: row.id,
      table: "craft_artifacts",
      type: "craft",
      source: "chest",
      name: row.name,
      img_url: row.img_url,
      stats,              // ✅ stats nomi yagona
      artifact_lvl: row.artifact_lvl ?? 0,
      equipped: false,
    };

    const invDoc = { [uniqueKey]: artifactObj };

    const batch = writeBatch(db);
    if (coin && amount > 0) {
      batch.update(doc(db, "users", user.uid), { [coin]: increment(-amount) });
    }
    batch.set(doc(db, "inventory", user.uid), invDoc, { merge: true });

    await batch.commit();

    const updatedCoins = coin
      ? { ...userData, [coin]: (userData[coin] || 0) - amount }
      : { ...userData };

    playSound("open-chest");
    return { success: true, artifact: artifactObj, userData: updatedCoins };
  } catch (e) {
    console.error("Unexpected error (tryOpenChest):", e);
    playSound("error");
    return { success: false, message: "Chest ochishda kutilmagan xatolik." };
  }
}


/* -------------------- BUY MAIN ARTIFACT -------------------- */
export async function tryBuyMainArtifact(userData, artifactRowWithPrice) {
  const user = auth.currentUser;
  if (!user) return { success: false, message: "User mavjud emas." };

  const { id, price } = artifactRowWithPrice || {};
  const [coin, amount] = firstPriceEntry(price || {});

  if (!coin) return { success: false, message: "Narx topilmadi." };
  if ((userData[coin] || 0) < amount) {
    playSound("error");
    return { success: false, message: `${coin} yetarli emas!` };
  }

  try {
    const { data, error } = await supabase
      .from("main_artifacts")
      .select(
        "id, name, type, img_url, health, attack, defense, health_bonus, attack_bonus, defense_bonus, artifact_lvl"
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error("Supabase error (main_artifacts):", error);
      playSound("error");
      return { success: false, message: "Supabase: main_artifacts topilmadi!" };
    }

    const uniqueKey = data.id + "_" + uuidv4();

    const invDoc = {
      [uniqueKey]: {
        artifactId: data.id,
        table: "main_artifacts",
        type: "main",
        source: "shop",
        name: data.name,
        img_url: data.img_url,
        status: {
          health: data.health || 0,
          attack: data.attack || 0,
          defense: data.defense || 0,
          health_bonus: data.health_bonus || 0,
          attack_bonus: data.attack_bonus || 0,
          defense_bonus: data.defense_bonus || 0,
        },
        artifact_lvl: data.artifact_lvl ?? 1,
        equipped: false,
      },
    };

    const batch = writeBatch(db);
    batch.update(doc(db, "users", user.uid), { [coin]: increment(-amount) });
    batch.set(doc(db, "inventory", user.uid), invDoc, { merge: true });

    await batch.commit();

    const updatedCoins = { ...userData, [coin]: (userData[coin] || 0) - amount };
    playSound("buy");

    return { success: true, artifact: invDoc[uniqueKey], userData: updatedCoins };
  } catch (e) {
    console.error("Unexpected error (tryBuyMainArtifact):", e);
    playSound("error");
    return { success: false, message: "Sotib olishda kutilmagan xatolik." };
  }
}
