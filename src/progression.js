const CLASS_TIERS = [
  { rank: "E", title: "Awakening", minLevel: 1 },
  { rank: "D", title: "Initiate", minLevel: 4 },
  { rank: "C", title: "Strider", minLevel: 7 },
  { rank: "B", title: "Vanguard", minLevel: 10 },
  { rank: "A", title: "Elite", minLevel: 13 },
  { rank: "S", title: "Sovereign", minLevel: 16 },
  { rank: "SS", title: "Mythic", minLevel: 19 },
  { rank: "SSS", title: "Apex", minLevel: 22 },
  { rank: "X", title: "Transcendent", minLevel: 25 },
];

const REWARD_IDEAS = {
  2: "A guilt-free evening for a favorite film, game, or hobby",
  4: "A favorite meal or café visit within your usual budget",
  7: "A book, art supply, or small hobby upgrade you will use",
  10: "A half-day outing or activity you have been looking forward to",
  13: "A planned experience or hobby upgrade within your budget",
  16: "A day trip, class, or meaningful upgrade you have saved for",
  19: "A bigger experience you can comfortably plan and afford",
  22: "A memorable day doing something that matters to you",
  25: "A meaningful reward you choose and plan in advance",
};

const REWARD_LEVELS = [2, 4, 7, 10, 13, 16, 19, 22, 25];

function xpForLevel(level) {
  const completedLevels = Math.max(0, Math.floor(level) - 1);
  return 600 * completedLevels + 50 * completedLevels * (completedLevels - 1);
}

function getLevelProgress(totalXP) {
  const xp = Math.max(0, Math.floor(Number(totalXP) || 0));
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level += 1;

  const levelStartXP = xpForLevel(level);
  const nextLevelXP = xpForLevel(level + 1);
  return {
    level,
    totalXP: xp,
    levelStartXP,
    nextLevelXP,
    levelProgressXP: xp - levelStartXP,
    levelRequirementXP: nextLevelXP - levelStartXP,
    progressPercent: Math.round(
      ((xp - levelStartXP) / (nextLevelXP - levelStartXP)) * 100
    ),
  };
}

function getClassForLevel(level) {
  return (
    [...CLASS_TIERS].reverse().find((tier) => level >= tier.minLevel) ||
    CLASS_TIERS[0]
  );
}

function getNextClassForLevel(level) {
  return CLASS_TIERS.find((tier) => tier.minLevel > level) || null;
}

export {
  CLASS_TIERS,
  REWARD_IDEAS,
  REWARD_LEVELS,
  getClassForLevel,
  getLevelProgress,
  getNextClassForLevel,
  xpForLevel,
};
