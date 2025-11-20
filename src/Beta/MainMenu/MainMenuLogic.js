// src/logic/MainMenuLogic.js
// Barcha logikalar shu yerda – toza, izohli va xatosiz

/**
 * Oddiy statni level up qilish (attack, defense, health)
 */
export function tryLevelUpStat(userData, keyBase) {
  const lvlKey = `${keyBase}-lvl`;
  const currentLvl = userData[lvlKey] || 1;
  const cost = getLevelUpCost(keyBase, currentLvl);

  if ((userData.SS || 0) < cost) {
    return { success: false, message: "SS yetarli emas!" };
  }

  const newData = {
    ...userData,
    SS: userData.SS - cost,
    [keyBase]: (userData[keyBase] || 0) + 1,        // asosiy stat oshadi
    [lvlKey]: currentLvl + 1,
  };

  return { success: true, userData: newData };
}

/**
 * Artifactni level up qilish
 */
export function tryLevelUpArtifact(userData, artifactIndex) {
  const unlockedKey = `artifact${artifactIndex}-unlocked`;
  const lvlKey = `artifact${artifactIndex}-lvl`;

  if (!userData[unlockedKey]) {
    return { success: false, message: "Artifact ochilmagan!" };
  }

  const currentLvl = userData[lvlKey] || 1;
  const cost = getLevelUpCost("attack", currentLvl); // hamma artifact bir xil narxda

  if ((userData.SS || 0) < cost) {
    return { success: false, message: "SS yetarli emas!" };
  }

  const newData = {
    ...userData,
    SS: userData.SS - cost,
    [lvlKey]: currentLvl + 1,
  };

  return { success: true, userData: newData };
}

/**
 * Artifactni ochish (unlock)
 */
export function tryUnlockArtifact(userData, artifactIndex) {
  const cost = 500; // o'zing xohlagan narxni qo'y

  if ((userData.SS || 0) < cost) {
    return { success: false, message: "SS yetarli emas!" };
  }

  const newData = {
    ...userData,
    SS: userData.SS - cost,
    [`artifact${artifactIndex}-unlocked`]: true,
    [`artifact${artifactIndex}-lvl`]: 1, // ochilganda 1-lvl
  };

  return { success: true, userData: newData };
}

/**
 * Qahramonni level up qilish – to'g'ri bonuslar!
 */
export function tryHeroLevelUp(userData) {
  const heroLvl = userData["hero-lvl"] || 1;
  const cost = 300 + (heroLvl - 1) * 200; // 300, 500, 700...

  if ((userData.SS || 0) < cost) {
    return { success: false, message: "SS yetarli emas!" };
  }

  const newData = {
    ...userData,
    SS: userData.SS - cost,
    "hero-lvl": heroLvl + 1,

    // Har levelda +1 attack, +1 defense, +5 health
    attack: (userData.attack || 0) + 1,
    defense: (userData.defense || 0) + 1,
    health: (userData.health || 0) + 5,
  };

  return { success: true, userData: newData };
}

/**
 * Barcha artifact bonuslarini hisoblash (equipped artifactlar + ularning statslari)
 */
export function computeArtifactBonus(artifacts = []) {
  const bonus = { attack: 0, defense: 0, health: 0 };

  artifacts.forEach((a) => {
    if (!a.unlocked) return;

    const lvl = a.level || 1;

    // Har bir unlocked artifact beradigan oddiy bonus
    bonus.attack += lvl;
    bonus.defense += lvl;
    bonus.health += lvl * 5;

    // Agar equipped bo'lsa va o'z statsi bo' bo'lsa – qo'shimcha bonus
    if (a.equipped && a.stats) {
      bonus.attack += a.stats.attack || 0;
      bonus.defense += a.stats.defense || 0;
      bonus.health += a.stats.health || 0;
    }
  });

  return bonus;
}

/**
 * Level up narxini hisoblash formulasi
 */
export function getLevelUpCost(statType, currentLvl) {
  let base = 50;
  if (statType === "health") base = 75;
  if (statType === "defense") base = 60;

  return base + currentLvl * 30; // o'sish tezligi o'rtacha
}