export const DailyRewardType = {
  STARS: 'stars',
  SHARDS: 'shards',
  ITEM: 'item',
};

export const dailyRewards = [
  { day: 1, type: DailyRewardType.STARS, quantity: 50, description: "50 Звезд", emoji: "⭐" },
  { day: 2, type: DailyRewardType.ITEM, itemId: 'resource_common_fragment', quantity: 1, description: "1 Фрагмент Удачи", emoji: "🧩" },
  { day: 3, type: DailyRewardType.STARS, quantity: 75, description: "75 Звезд", emoji: "⭐" },
  { day: 4, type: DailyRewardType.ITEM, itemId: 'resource_uncommon_spark', quantity: 1, description: "1 Искра Вдохновения", emoji: "💡" },
  { day: 5, type: DailyRewardType.STARS, quantity: 100, description: "100 Звезд", emoji: "⭐" },
  { day: 6, type: DailyRewardType.ITEM, itemId: 'luck_clover_small', quantity: 1, description: "1 Малый Клевер Удачи", emoji: "🍀" },
  { day: 7, type: DailyRewardType.ITEM, itemId: 'lootbox_weekly_bonus', quantity: 1, description: "Еженедельный Сундучок!", emoji: "💝" }
];

export function getDailyReward(dayInCycle) { 
  if (dayInCycle < 1 || dayInCycle > 7) return null;
  return dailyRewards[dayInCycle - 1]; 
}

export default dailyRewards;