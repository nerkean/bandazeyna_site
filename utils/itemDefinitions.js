import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ItemCategory = {
  CONSUMABLE: 'Расходник',
  COSMETIC: 'Косметика',
  LOOTBOX: 'Лутбокс',
  RESOURCE: 'Ресурс',
  KEY: 'Ключ',
  PROFILE_ACCENT: 'Украшение профиля',
  RESOURCE_PACK: 'Набор ресурсов',
  PREMIUM_ACCESS: 'Доступ к Премиум',
  SPECIAL: 'Особый',
};

export const DecorationType = {
  AVATAR_FRAME: 'avatar_frame',
  CARD_BORDER_FRAME: 'card_border_frame',
  CARD_BACKGROUND: 'card_background',
};

const assetsPath = path.join(__dirname, '..', 'assets');

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getWeightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    if (random < item.weight) {
      return JSON.parse(JSON.stringify(item.value)); 
    }
    random -= item.weight;
  }
  return null;
}

async function applyReward(userProfile, reward) {
  const rewardsOutputEntry = {
    type: reward.type,
    name: 'Неизвестная награда',
    quantity: reward.quantity,
    emoji: '❔'
  };

  if (reward.type === 'item') {
    await userProfile.addItemToInventory(reward.id, reward.quantity);
    const itemDef = getItemDefinition(reward.id);
    rewardsOutputEntry.id = reward.id;
    rewardsOutputEntry.name = itemDef?.name || reward.id;
    rewardsOutputEntry.emoji = itemDef?.emoji || '❔';
  } else if (reward.type === 'stars') {
    userProfile.stars += reward.quantity;
    userProfile.stars = parseFloat(userProfile.stars.toFixed(2));
    rewardsOutputEntry.name = 'Звезд';
    rewardsOutputEntry.emoji = '⭐';
  } else if (reward.type === 'shards') {
    userProfile.shards += reward.quantity;
    rewardsOutputEntry.name = 'Осколков';
    rewardsOutputEntry.emoji = '✨';
  }
  return rewardsOutputEntry;
}


const itemDefinitions = {
  'resource_common_fragment': { 
    itemId: 'resource_common_fragment', name: 'Фрагмент удачи', 
    description: 'Маленький осколок, основа для многих творений', emoji: '🧩', category: ItemCategory.RESOURCE, 
    price: { stars: 50, shards: 0 }, buyable: true, stackable: true,
  },
  'resource_uncommon_spark': { 
    itemId: 'resource_uncommon_spark', name: 'Искра вдохновения', 
    description: 'Концентрированная энергия, необходимая для более сложных предметов', emoji: '💡', category: ItemCategory.RESOURCE, 
    price: { stars: 150, shards: 0 }, buyable: true, stackable: true,
  },
  'resource_rare_core': { 
    itemId: 'resource_rare_core', name: 'Сердцевина энергии', 
    description: 'Редкий и мощный компонент для особых рецептов', emoji: '💖', category: ItemCategory.RESOURCE, 
    price: { stars: 1000, shards: 0 }, buyable: true, stackable: true,
  },

   'star_boost_small': {
    itemId: 'star_boost_small', name: 'Малый бустер Звезд',
    description: '+15% ⭐ на 30 мин', emoji: '🚀', category: ItemCategory.CONSUMABLE,
    price: { stars: 200, shards: 0 }, buyable: false,
    stackable: true,
    craftable: true, 
    recipe: [
        { itemId: 'resource_common_fragment', quantity: 4 },
        { itemId: 'resource_uncommon_spark', quantity: 1 }
    ],
    use: async (userProfile, interaction, quantity) => {
      if (userProfile.activeStarBoost && userProfile.activeStarBoost.expiresAt && new Date(userProfile.activeStarBoost.expiresAt) > new Date()) {
        const timeLeftMs = new Date(userProfile.activeStarBoost.expiresAt).getTime() - Date.now();
        const minutesLeft = Math.ceil(timeLeftMs / (1000 * 60));
        return { success: false, message: `❌ **У вас уже активен другой бустер звезд! Осталось: ~${minutesLeft} мин**` };
      }
      const durationMinutes = 30;
      const multiplier = 1.15;
      userProfile.activeStarBoost = {
        itemId: 'star_boost_small',
        name: 'Малый бустер Звезд',
        multiplier: multiplier,
        durationMinutes: durationMinutes,
        expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000),
        appliedAt: new Date()
      };
      return { success: true, message: `🚀 **Малый бустер Звезд активирован! Вы будете получать +15% звезд в течение ${durationMinutes} минут**` };
    },
  },
  'star_boost_medium': {
    itemId: 'star_boost_medium', name: 'Средний бустер звезд',
    description: '+25% ⭐ на 1 час', emoji: '🚀', category: ItemCategory.CONSUMABLE,
    price: { stars: 500, shards: 0 }, buyable: false, 
    stackable: true,
    craftable: true,
    recipe: [ 
        { itemId: 'star_boost_small', quantity: 2 },
        { itemId: 'resource_uncommon_spark', quantity: 2 }
    ],
    use: async (userProfile, interaction, quantity) => {
      if (userProfile.activeStarBoost && userProfile.activeStarBoost.expiresAt && new Date(userProfile.activeStarBoost.expiresAt) > new Date()) {
        const timeLeftMs = new Date(userProfile.activeStarBoost.expiresAt).getTime() - Date.now();
        const minutesLeft = Math.ceil(timeLeftMs / (1000 * 60));
        return { success: false, message: `❌ **У вас уже активен другой бустер звезд! Осталось: ~${minutesLeft} мин**` };
      }
      const durationMinutes = 60;
      const multiplier = 1.25;
      userProfile.activeStarBoost = {
        itemId: 'star_boost_medium',
        name: 'Средний бустер Звезд',
        multiplier: multiplier,
        durationMinutes: durationMinutes,
        expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000),
        appliedAt: new Date()
      };
      return { success: true, message: `🚀 **Средний бустер звезд активирован! Вы будете получать +25% звезд в течение ${durationMinutes} минут**` };
    },
  },
  'star_boost_large': {
    itemId: 'star_boost_large', name: 'Большой бустер звезд',
    description: '+50% ⭐ на 1 час', emoji: '🚀', category: ItemCategory.CONSUMABLE,
    price: { stars: 1200, shards: 0 }, buyable: false,
    stackable: true,
    craftable: true, 
    recipe: [
        { itemId: 'star_boost_medium', quantity: 2 }, 
        { itemId: 'resource_rare_core', quantity: 1 },
        { itemId: 'resource_uncommon_spark', quantity: 3 }
    ],
    use: async (userProfile, interaction, quantity) => {
      if (userProfile.activeStarBoost && userProfile.activeStarBoost.expiresAt && new Date(userProfile.activeStarBoost.expiresAt) > new Date()) {
        const timeLeftMs = new Date(userProfile.activeStarBoost.expiresAt).getTime() - Date.now();
        const minutesLeft = Math.ceil(timeLeftMs / (1000 * 60));
        return { success: false, message: `❌ **У вас уже активен другой бустер звезд! Осталось: ~${minutesLeft} мин**` };
      }
      const durationMinutes = 60;
      const multiplier = 1.50;
      userProfile.activeStarBoost = {
        itemId: 'star_boost_large',
        name: 'Большой бустер Звезд',
        multiplier: multiplier,
        durationMinutes: durationMinutes,
        expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000),
        appliedAt: new Date()
      };
      return { success: true, message: `🚀 **Большой бустер звезд активирован! Вы будете получать +50% звезд в течение ${durationMinutes} минут**` };
    },
  },
  'luck_clover_small': {
    itemId: 'luck_clover_small', name: 'Малый клевер удачи',
    description: 'Немного повышает шанс на лучшие награды из следующего лутбокса', emoji: '🍀', category: ItemCategory.CONSUMABLE,
    buyable: false, 
    stackable: true,
    craftable: true, 
    recipe: [ 
        { itemId: 'resource_common_fragment', quantity: 3 },
        { itemId: 'resource_uncommon_spark', quantity: 1 }
    ],
    use: async (userProfile) => {
      if (userProfile.activeLuckClover && userProfile.activeLuckClover.itemId) {
        return { success: false, message: `❌ **У вас уже активен другой эффект удачи (${userProfile.activeLuckClover.name || 'Клевер'})**` };
      }
      userProfile.activeLuckClover = {
        itemId: 'luck_clover_small', name: 'Малый клевер удачи',
        description: 'Немного повышает шанс на лучшие награды', luckBoostFactor: 1.2,
        affectsLootboxCategories: ['lootbox_bronze', 'lootbox_silver']
      };
      return { success: true, message: '🍀 **Малый клевер удачи активирован!**' };
    },
  },
  'luck_clover_medium': {
    itemId: 'luck_clover_medium', name: 'Средний клевер удачи',
    description: 'Заметно повышает шанс на лучшие награды из следующего лутбокса', emoji: '🍀', category: ItemCategory.CONSUMABLE,
    buyable: false, 
    stackable: true,
    craftable: true, 
    recipe: [
        { itemId: 'luck_clover_small', quantity: 2 },
        { itemId: 'resource_uncommon_spark', quantity: 3 },
        { itemId: 'resource_common_fragment', quantity: 5 }
    ],
    use: async (userProfile) => {
        if (userProfile.activeLuckClover && userProfile.activeLuckClover.itemId) {
            return { success: false, message: `❌ **У вас уже активен другой эффект удачи (${userProfile.activeLuckClover.name || 'Клевер'})**` };
        }
        userProfile.activeLuckClover = {
            itemId: 'luck_clover_medium', name: 'Средний клевер удачи',
            description: 'Заметно повышает шанс на лучшие награды', luckBoostFactor: 1.5,
            affectsLootboxCategories: ['lootbox_bronze', 'lootbox_silver', 'lootbox_gold', 'lootbox_fortune_chest']
        };
        return { success: true, message: '🍀 **Средний клевер удачи активирован!**' };
    },
  },
  'luck_clover_large': {
    itemId: 'luck_clover_large', name: 'Большой клевер удачи',
    description: 'Значительно повышает шанс на лучшие награды из следующего лутбокса', emoji: '🍀', category: ItemCategory.CONSUMABLE,
    buyable: false, 
    stackable: true,
    craftable: true,
    recipe: [
        { itemId: 'luck_clover_medium', quantity: 2 },
        { itemId: 'resource_rare_core', quantity: 2 },
        { itemId: 'resource_uncommon_spark', quantity: 5 }
    ],
    use: async (userProfile) => {
        if (userProfile.activeLuckClover && userProfile.activeLuckClover.itemId) {
            return { success: false, message: `❌ **У вас уже активен другой эффект удачи (${userProfile.activeLuckClover.name || 'Клевер'})**` };
        }
        userProfile.activeLuckClover = {
            itemId: 'luck_clover_large', name: 'Большой клевер удачи',
            description: 'Значительно повышает шанс на лучшие награды', luckBoostFactor: 2.0,
            affectsLootboxCategories: ['lootbox_silver', 'lootbox_gold', 'lootbox_mythic', 'lootbox_fortune_chest']
        };
        return { success: true, message: '🍀 **Большой клевер удачи активирован!**' };
    },
  },
  'crafting_kit_small': {
    itemId: 'crafting_kit_small', name: 'Малый ремесленный набор',
    description: 'Содержит несколько случайных обычных ресурсов', emoji: '🧰', category: ItemCategory.RESOURCE_PACK, 
    buyable: false, stackable: true,
    open: async (userProfile) => { 
      const rewards = [];
      rewards.push({ type: 'item', id: 'resource_common_fragment', quantity: getRandomInt(1, 3) });
      if (Math.random() < 0.3) rewards.push({ type: 'item', id: 'resource_uncommon_spark', quantity: 1 });
      const rewardsOutput = [];
      for (const reward of rewards) { rewardsOutput.push(await applyReward(userProfile, reward)); }
      return { success: true, message: '🧰 **Вы открыли малый ремесленный набор и получили:**', rewards: rewardsOutput };
    }
  },
   'crafting_kit_medium': {
    itemId: 'crafting_kit_medium', name: 'Средний ремесленный набор',
    description: 'Содержит обычные и необычные ресурсы', emoji: '🛠️', category: ItemCategory.RESOURCE_PACK,
    buyable: false, stackable: true,
    open: async (userProfile) => {
      const rewards = [];
      rewards.push({ type: 'item', id: 'resource_common_fragment', quantity: getRandomInt(3, 5) });
      rewards.push({ type: 'item', id: 'resource_uncommon_spark', quantity: getRandomInt(1, 2) });
      if (Math.random() < 0.1) rewards.push({ type: 'item', id: 'resource_rare_core', quantity: 1 });
      const rewardsOutput = [];
      for (const reward of rewards) { rewardsOutput.push(await applyReward(userProfile, reward)); }
      return { success: true, message: '🛠️ **Вы открыли средний ремесленный набор и получили:**', rewards: rewardsOutput };
    }
  },
  'crafting_kit_large': { 
    itemId: 'crafting_kit_large', name: 'Большой ремесленный набор',
    description: 'Содержит много необычных и редких ресурсов', emoji: '⚙️', category: ItemCategory.RESOURCE_PACK,
    buyable: false, stackable: true,
    open: async (userProfile) => {
      const rewards = [];
      rewards.push({ type: 'item', id: 'resource_uncommon_spark', quantity: getRandomInt(3, 5) });
      rewards.push({ type: 'item', id: 'resource_rare_core', quantity: getRandomInt(1, 2) });
      const rewardsOutput = [];
      for (const reward of rewards) { rewardsOutput.push(await applyReward(userProfile, reward)); }
      return { success: true, message: '⚙️ **Вы открыли большой ремесленный набор и получили:**', rewards: rewardsOutput };
    }
  },

 'lootbox_bronze': {
    itemId: 'lootbox_bronze', name: 'Бронзовый сундук',
    description: 'Содержит обычные ресурсы и небольшой шанс на что-то получше', emoji: '📦', category: ItemCategory.LOOTBOX,
    price: { stars: 250, shards: 0 }, 
    buyable: true, 
    stackable: true,
    craftable: true, 
    recipe: [ 
        { itemId: 'resource_common_fragment', quantity: 5 },
        { itemId: 'resource_uncommon_spark', quantity: 2 }
    ],
    originalLootTable: [
        { value: { type: 'item', id: 'resource_common_fragment', quantityRange: [3, 6] }, weight: 50, quality: 'common' },
        { value: { type: 'item', id: 'resource_uncommon_spark', quantityRange: [1, 2] }, weight: 30, quality: 'uncommon' },
        { value: { type: 'item', id: 'crafting_kit_small', quantity: 1 }, weight: 15, quality: 'good' },
        { value: { type: 'item', id: 'luck_clover_small', quantity: 1 }, weight: 5, quality: 'rare' },
    ],
    open: async function (userProfile, interaction, client, activeCloverEffect = null) {
      let currentLootTable = JSON.parse(JSON.stringify(this.originalLootTable));
      let cloverAppliedMessage = '';

      if (activeCloverEffect && activeCloverEffect.affectsLootboxCategories.includes(this.itemId)) {
        currentLootTable = currentLootTable.map(item => {
          const newItem = { ...item };
          if (newItem.quality === 'good' || newItem.quality === 'rare' || newItem.quality === 'epic') {
            newItem.weight = parseFloat((newItem.weight * activeCloverEffect.luckBoostFactor).toFixed(1));
          }
          return newItem;
        });
        cloverAppliedMessage = `\n✨ **Эффект "${activeCloverEffect.name}" был применен!**`;
      }

      let chosenRewardValue = getWeightedRandom(currentLootTable);
      if (!chosenRewardValue) return { success: false, message: '❌ **Не удалось определить награду**', rewards: [] };

      if (chosenRewardValue.quantityRange) {
        chosenRewardValue.quantity = getRandomInt(chosenRewardValue.quantityRange[0], chosenRewardValue.quantityRange[1]);
      } else if (!chosenRewardValue.quantity && chosenRewardValue.quantity !==0) {
        chosenRewardValue.quantity = 1;
      }

      const rewardsOutput = [await applyReward(userProfile, chosenRewardValue)];
      return { success: true, message: `📦 **Вы открыли ${this.name} и получили:**${cloverAppliedMessage}`, rewards: rewardsOutput };
    },
  },
  'lootbox_silver': {
    itemId: 'lootbox_silver', name: 'Серебряный тайник',
    description: 'Более качественные ресурсы и шанс на полезные предметы', emoji: '🎁', category: ItemCategory.LOOTBOX,
    price: { stars: 500, shards: 0 }, 
    buyable: false, 
    stackable: true,
    craftable: true, 
    recipe: [
        { itemId: 'lootbox_bronze', quantity: 2 },
        { itemId: 'resource_uncommon_spark', quantity: 5 },
        { itemId: 'resource_common_fragment', quantity: 10 }
    ],
    originalLootTable: [
        { value: { type: 'item', id: 'resource_uncommon_spark', quantityRange: [3, 5] }, weight: 40, quality: 'uncommon' },
        { value: { type: 'item', id: 'resource_rare_core', quantity: 1 }, weight: 25, quality: 'good' },
        { value: { type: 'item', id: 'crafting_kit_small', quantityRange: [2,3] }, weight: 15, quality: 'good' },
        { value: { type: 'item', id: 'luck_clover_small', quantityRange: [1,2] }, weight: 10, quality: 'rare' },
        { value: { type: 'item', id: 'profile_badge_silver_star', quantity: 1 }, weight: 10, quality: 'rare' },
    ],
    open: async function (userProfile, interaction, client, activeCloverEffect = null) {
      let currentLootTable = JSON.parse(JSON.stringify(this.originalLootTable));
      let cloverAppliedMessage = '';
      if (activeCloverEffect && activeCloverEffect.affectsLootboxCategories.includes(this.itemId)) {
        currentLootTable = currentLootTable.map(item => {
          const newItem = { ...item };
          if (newItem.quality === 'good' || newItem.quality === 'rare' || newItem.quality === 'epic') {
            newItem.weight = parseFloat((newItem.weight * activeCloverEffect.luckBoostFactor).toFixed(1));
          }
          return newItem;
        });
        cloverAppliedMessage = `\n✨ **Эффект "${activeCloverEffect.name}" был применен!**`;
      }
      let chosenRewardValue = getWeightedRandom(currentLootTable);
      if (!chosenRewardValue) return { success: false, message: '❌ **Не удалось определить награду**', rewards: [] };
      if (chosenRewardValue.quantityRange) {
        chosenRewardValue.quantity = getRandomInt(chosenRewardValue.quantityRange[0], chosenRewardValue.quantityRange[1]);
      } else if (!chosenRewardValue.quantity && chosenRewardValue.quantity !==0) {
        chosenRewardValue.quantity = 1;
      }
      const rewardsOutput = [await applyReward(userProfile, chosenRewardValue)];
      return { success: true, message: `🎁 **Вы открыли ${this.name} и получили:**${cloverAppliedMessage}`, rewards: rewardsOutput };
    }
  },
  'lootbox_gold': {
 itemId: 'lootbox_gold', name: 'Золотой клад',
    description: 'Ценные ресурсы, шанс на косметику и бустеры', emoji: '👑', category: ItemCategory.LOOTBOX,
    price: { stars: 1250, shards: 0 }, 
    buyable: false,
    stackable: true,
    craftable: true, 
    recipe: [ 
        { itemId: 'resource_common_fragment', quantity: 15 },
        { itemId: 'resource_uncommon_spark', quantity: 8 },
        { itemId: 'resource_rare_core', quantity: 1 }
    ],
    originalLootTable: [
        { value: { type: 'item', id: 'resource_rare_core', quantityRange: [2,3] }, weight: 40, quality: 'good' },
        { value: { type: 'item', id: 'star_boost_medium', quantity: 1 }, weight: 20, quality: 'rare' },
        { value: { type: 'item', id: 'profile_frame_patterned_bronze', quantity: 1 }, weight: 5, quality: 'epic' },
        { value: { type: 'item', id: 'crafting_kit_medium', quantity: 1 }, weight: 15, quality: 'good' },
        { value: { type: 'item', id: 'luck_clover_small', quantityRange: [2,3] }, weight: 10, quality: 'good' },
        { value: { type: 'item', id: 'star_boost_small', quantity: 1 }, weight: 10, quality: 'uncommon' },
    ],
    open: async function (userProfile, interaction, client, activeCloverEffect = null) {
        let currentLootTable = JSON.parse(JSON.stringify(this.originalLootTable));
        let cloverAppliedMessage = '';
        if (activeCloverEffect && activeCloverEffect.affectsLootboxCategories.includes(this.itemId)) {
            currentLootTable = currentLootTable.map(item => {
              const newItem = { ...item };
              if (newItem.quality === 'good' || newItem.quality === 'rare' || newItem.quality === 'epic') {
                newItem.weight = parseFloat((newItem.weight * activeCloverEffect.luckBoostFactor).toFixed(1));
              }
              return newItem;
            });
            cloverAppliedMessage = `\n✨ **Эффект "${activeCloverEffect.name}" был применен!**`;
        }
        let chosenRewardValue = getWeightedRandom(currentLootTable);
        if (!chosenRewardValue) return { success: false, message: '❌ **Не удалось определить награду**', rewards: [] };
        if (chosenRewardValue.quantityRange) {
          chosenRewardValue.quantity = getRandomInt(chosenRewardValue.quantityRange[0], chosenRewardValue.quantityRange[1]);
        } else if (!chosenRewardValue.quantity && chosenRewardValue.quantity !==0) {
          chosenRewardValue.quantity = 1;
        }
        const rewardsOutput = [await applyReward(userProfile, chosenRewardValue)];
        return { success: true, message: `👑 **Вы открыли ${this.name} и получили:**${cloverAppliedMessage}`, rewards: rewardsOutput };
    }
  },
  'lootbox_mythic': {
    itemId: 'lootbox_mythic', name: 'Мифический ларец',
    description: 'Очень ценные награды, косметика, мощные предметы', emoji: '🌌', category: ItemCategory.LOOTBOX,
    price: { stars: 5000, shards: 0 }, buyable: true, stackable: true,
    originalLootTable: [
        { value: { type: 'item', id: 'profile_frame_veteran', quantity: 1 }, weight: 35, quality: 'epic' }, 
        { value: { type: 'item', id: 'crafting_kit_large', quantity: 1 }, weight: 30, quality: 'good' },
        { value: { type: 'item', id: 'luck_clover_medium', quantity: 1 }, weight: 20, quality: 'rare' },
        { value: { type: 'item', id: 'title_token', quantity: 1 }, weight: 15, quality: 'rare' },
    ],
    open: async function (userProfile, interaction, client, activeCloverEffect = null) {
        let currentLootTable = JSON.parse(JSON.stringify(this.originalLootTable));
        let cloverAppliedMessage = '';
        if (activeCloverEffect && activeCloverEffect.affectsLootboxCategories.includes(this.itemId)) {
            currentLootTable = currentLootTable.map(item => {
              const newItem = { ...item };
              if (newItem.quality === 'good' || newItem.quality === 'rare' || newItem.quality === 'epic') {
                newItem.weight = parseFloat((newItem.weight * activeCloverEffect.luckBoostFactor).toFixed(1));
              }
              return newItem;
            });
            cloverAppliedMessage = `\n✨ **Эффект "${activeCloverEffect.name}" был применен!**`;
        }
        let chosenRewardValue = getWeightedRandom(currentLootTable);
        if (!chosenRewardValue) return { success: false, message: '❌ **Не удалось определить награду**', rewards: [] };
        if (chosenRewardValue.quantityRange) {
          chosenRewardValue.quantity = getRandomInt(chosenRewardValue.quantityRange[0], chosenRewardValue.quantityRange[1]);
        } else if (!chosenRewardValue.quantity && chosenRewardValue.quantity !==0) {
          chosenRewardValue.quantity = 1;
        }
        const rewardsOutput = [await applyReward(userProfile, chosenRewardValue)];
        return { success: true, message: `🌌 **Вы открыли ${this.name} и получили:**${cloverAppliedMessage}`, rewards: rewardsOutput };
    }
  },
  'lootbox_fortune_chest': {
    itemId: 'lootbox_fortune_chest', name: 'Ларец фортуны',
    description: 'Испытай свою удачу! Может содержать другие лутбоксы, включая легендарный мифический ларец',
    emoji: '🎰', category: ItemCategory.LOOTBOX,
    price: { stars: 400, shards: 0 }, 
    buyable: true, stackable: true,
    originalLootTable: [
        { value: { type: 'item', id: 'lootbox_bronze', quantity: 1 }, weight: 50, quality: 'common' },
        { value: { type: 'item', id: 'lootbox_silver', quantity: 1 }, weight: 30, quality: 'uncommon' },
        { value: { type: 'item', id: 'lootbox_gold', quantity: 1 }, weight: 15, quality: 'rare' },
        { value: { type: 'item', id: 'lootbox_mythic', quantity: 1 }, weight: 5, quality: 'epic' },
    ],
    open: async function (userProfile, interaction, client, activeCloverEffect = null) {
        let currentLootTable = JSON.parse(JSON.stringify(this.originalLootTable));
        let cloverAppliedMessage = '';

        if (activeCloverEffect && activeCloverEffect.affectsLootboxCategories.includes(this.itemId)) {
            console.log(`[LootboxOpen] Клевер "${activeCloverEffect.name}" активен для ${this.name}. Множитель: ${activeCloverEffect.luckBoostFactor}`);
            currentLootTable = currentLootTable.map(item => {
              const newItem = { ...item };
              if (newItem.quality === 'rare' || newItem.quality === 'epic') {
                newItem.weight = parseFloat((newItem.weight * activeCloverEffect.luckBoostFactor).toFixed(1));
              }
              return newItem;
            });
            cloverAppliedMessage = `\n✨ **Эффект "${activeCloverEffect.name}" был применен!**`;
        }

        let chosenRewardValue = getWeightedRandom(currentLootTable);
        if (!chosenRewardValue) return { success: false, message: '❌ **Не удалось определить награду из ларца фортуны**', rewards: [] };
        
        chosenRewardValue.quantity = 1;

        const rewardsOutput = [await applyReward(userProfile, chosenRewardValue)];
        return { 
            success: true, 
            message: `🎰 **Вы открыли ${this.name} и из него выпал...**${cloverAppliedMessage}`, 
            rewards: rewardsOutput 
        };
    }
  },
  'lootbox_shard_pouch': {
    itemId: 'lootbox_shard_pouch', name: 'Мешочек с осколками',
    description: 'Может содержать Осколки, редкую косметику или полезные жетоны', emoji: '💎', category: ItemCategory.LOOTBOX,
    price: { stars: 0, shards: 4 }, buyable: true, stackable: true,
    originalLootTable: [
        { value: { type: 'shards', quantityRange: [1,2] }, weight: 50, quality: 'common' },
        { value: { type: 'shards', quantity: 3 }, weight: 20, quality: 'uncommon' },
        { value: { type: 'item', id: 'luck_clover_large', quantity: 1 }, weight: 10, quality: 'rare' },
        { value: { type: 'stars', quantityRange: [500, 1500] }, weight: 5, quality: 'good' },
    ],
    open: async function (userProfile, interaction, client, activeCloverEffect = null) {
        let currentLootTable = JSON.parse(JSON.stringify(this.originalLootTable));
        if (getItemDefinition('profile_frame_shimmering')) {
            if (!currentLootTable.find(item => item.value.id === 'profile_frame_shimmering')) {
                 currentLootTable.push({ value: { type: 'item', id: 'profile_frame_shimmering', quantity: 1 }, weight: 15, quality: 'epic' });
            }
        } else {
            currentLootTable = currentLootTable.filter(item => item.value.id !== 'profile_frame_shimmering');
        }

        let cloverAppliedMessage = '';
        if (activeCloverEffect && activeCloverEffect.affectsLootboxCategories.includes(this.itemId)) {
            currentLootTable = currentLootTable.map(item => {
              const newItem = { ...item };
              if (newItem.quality === 'good' || newItem.quality === 'rare' || newItem.quality === 'epic') {
                newItem.weight = parseFloat((newItem.weight * activeCloverEffect.luckBoostFactor).toFixed(1));
              }
              return newItem;
            });
            cloverAppliedMessage = `\n✨ **Эффект "${activeCloverEffect.name}" был применен!**`;
        }
        let chosenRewardValue = getWeightedRandom(currentLootTable);
        if (!chosenRewardValue) return { success: false, message: '❌ **Не удалось определить награду**', rewards: [] };
        if (chosenRewardValue.quantityRange) {
          chosenRewardValue.quantity = getRandomInt(chosenRewardValue.quantityRange[0], chosenRewardValue.quantityRange[1]);
        } else if (!chosenRewardValue.quantity && chosenRewardValue.quantity !==0) {
          chosenRewardValue.quantity = 1;
        }
        const rewardsOutput = [await applyReward(userProfile, chosenRewardValue)];
        return { success: true, message: `💎 **Вы открыли ${this.name} и получили:**${cloverAppliedMessage}`, rewards: rewardsOutput };
    }
  },
  'lootbox_weekly_bonus': {
    itemId: 'lootbox_weekly_bonus', name: 'Еженедельный сундучок',
    description: 'Награда за недельную серию ежедневных входов', emoji: '💝', category: ItemCategory.LOOTBOX,
    buyable: false, stackable: true,
    open: async function (userProfile, interaction, client, activeCloverEffect = null) {
      const rewardsOutput = [];
      rewardsOutput.push(await applyReward(userProfile, {type: 'stars', quantity: getRandomInt(100, 200)}));
      rewardsOutput.push(await applyReward(userProfile, {type: 'item', id: 'resource_uncommon_spark', quantity: getRandomInt(1, 3)}));
      rewardsOutput.push(await applyReward(userProfile, {type: 'item', id: 'resource_common_fragment', quantity: getRandomInt(3, 6)}));

      const bonusRoll = Math.random();
      if (bonusRoll < 0.15) {
        rewardsOutput.push(await applyReward(userProfile, {type: 'item', id: 'crafting_kit_small', quantity: 1}));
      } else if (bonusRoll < 0.40) {
        rewardsOutput.push(await applyReward(userProfile, {type: 'item', id: 'luck_clover_small', quantity: 1}));
      } else if (bonusRoll < 0.70) {
        rewardsOutput.push(await applyReward(userProfile, {type: 'item', id: 'star_boost_small', quantity: 1}));
      }
      if (Math.random() < 0.05) {
          rewardsOutput.push(await applyReward(userProfile, {type: 'shards', quantity: 1}));
      }
      return { success: true, message: '💝 **Вы открыли Еженедельный Сундучок и получили следующие награды:**', rewards: rewardsOutput };
    },
  },
    'premium_pass_14d': {
    itemId: 'premium_pass_14d', name: 'Премиум (14 дней)',
    description: 'Активирует Премиум-статус на 14 дней', emoji: '👑', category: ItemCategory.PREMIUM_ACCESS,
    price: { stars: 0, shards: 6 }, buyable: true, stackable: false,
    durationDays: 14,
    isPremiumPass: true,
  },
  'premium_pass_30d': {
    itemId: 'premium_pass_30d', name: 'Премиум (30 дней)',
    description: 'Активирует Премиум-статус на 30 дней', emoji: '👑', category: ItemCategory.PREMIUM_ACCESS,
    price: { stars: 0, shards: 10 }, buyable: true, stackable: false,
    durationDays: 30,
    isPremiumPass: true,
  },
  'premium_pass_permanent': {
    itemId: 'premium_pass_permanent', name: 'Премиум (Навсегда)',
    description: 'Активирует Премиум-статус навсегда', emoji: '💎', category: ItemCategory.PREMIUM_ACCESS,
    price: { stars: 0, shards: 70 }, buyable: true, stackable: false,
    durationDays: Infinity,
    isPremiumPass: true,
     isUsable: true,
  },
  'profile_frame_veteran': { 
      itemId: 'profile_frame_veteran', name: 'Рамка ветерана', 
      description: 'Легенда гласит, что первую такую рамку вручили основатели сервера', emoji: '🖼️', category: ItemCategory.PROFILE_ACCENT, 
      decorationType: DecorationType.AVATAR_FRAME, price: { stars: 20000, shards: 0 }, 
      buyable: true, stackable: false, 
       isUsable: true,
     imageUrl: path.join(assetsPath, 'frames', 'veteran.png'),
     imageUrl_web: 'https://i.ibb.co/wrKzmdHk/veteran.png' 
  },
  'profile_bg_legend': { 
      itemId: 'profile_bg_legend', name: 'Фон легенды', 
      description: 'Там, где свет встречается с тенью, рождаются легенды', emoji: '🏞️', category: ItemCategory.PROFILE_ACCENT, 
      decorationType: DecorationType.CARD_BACKGROUND, price: { stars: 25000, shards: 0 }, 
      buyable: true, stackable: false, 
       isUsable: true,
      imageUrl: path.join(assetsPath, 'backgrounds', 'legend.png'),
      imageUrl_web: 'https://i.ibb.co/m5GHwXNh/legend.png' 
  },
  'profile_frame_laurel_blue': { 
    itemId: 'profile_frame_laurel_blue', name: 'Лавровый венок', 
    description: 'Символ триумфа, признанный с древних времен', emoji: '🌿', category: ItemCategory.PROFILE_ACCENT, 
    decorationType: DecorationType.AVATAR_FRAME, price: { stars: 0, shards: 8 }, 
    buyable: true, stackable: false, 
     isUsable: true,
   imageUrl: path.join(assetsPath, 'frames', 'laurel_blue.png'),
   imageUrl_web: 'https://i.ibb.co/fzcjfqD4/laurel-blue.png' 
  },
  'profile_bg_stars_dark': { 
    itemId: 'profile_bg_stars_dark', name: 'Фон "Темное звездное небо"', 
    description: 'Классический вид ночного неба, который никогда не устареет', emoji: '🌠', category: ItemCategory.PROFILE_ACCENT, 
    decorationType: DecorationType.CARD_BACKGROUND, price: { stars: 0, shards: 15 }, 
    buyable: true, stackable: false, 
     isUsable: true,
    imageUrl: path.join(assetsPath, 'backgrounds', 'stars_dark.png'),
    imageUrl_web: 'https://i.ibb.co/9jqRHnF/stars-dark.png' 
  },
  'profile_badge_silver_star': {
    itemId: 'profile_badge_silver_star', name: "Значок 'Серебряная Звезда'",
    description: 'Простой значок для вашего профиля', emoji: '🥈', category: ItemCategory.COSMETIC,
    buyable: false, stackable: false, 
  },
  'profile_frame_patterned_bronze': {
    itemId: 'profile_frame_patterned_bronze', name: 'Узорчатая бронзовая рамка',
    description: 'Вечная классика. Благородная бронза', emoji: '🖼️', category: ItemCategory.PROFILE_ACCENT,
    decorationType: DecorationType.AVATAR_FRAME, 
    buyable: false, stackable: false,
     isUsable: true,
     imageUrl: path.join(assetsPath, 'frames', 'patterned_bronze.png'),
     imageUrl_web: 'https://i.ibb.co/N66HQJW7/patterned-bronze.png' 
  },
  'premium_avatar_frame_gold_plated': {
    itemId: 'premium_avatar_frame_gold_plated', name: 'Рамка "Золотое сияние" (Премиум)',
    description: 'Ваша репутация говорит сама за себя, а эта рамка лишь подчеркивает ваш статус. Доступна с Премиум-статусом',
    emoji: '🌟', category: ItemCategory.PROFILE_ACCENT,
    decorationType: DecorationType.AVATAR_FRAME,
    price: { stars: 0, shards: 0 }, 
    buyable: false, 
    stackable: false,
    requiresPremium: true, 
    isPremiumPerk: true, 
     isUsable: true,
    imageUrl: path.join(assetsPath, 'frames', 'premium_gold_plated.png'),
    imageUrl_web: 'https://i.ibb.co/fdjvW3Nn/premium-gold-plated.png' 
  },
  'premium_card_bg_galaxy': {
    itemId: 'premium_card_bg_galaxy', name: 'Фон "Галактика" (Премиум)',
    description: 'Твой профиль — целая вселенная. Доступен с Премиум-статусом',
    emoji: '🌌', category: ItemCategory.PROFILE_ACCENT,
    decorationType: DecorationType.CARD_BACKGROUND,
    price: { stars: 0, shards: 0 },
    buyable: false,
    stackable: false,
    requiresPremium: true,
    isPremiumPerk: true,
     isUsable: true,
   imageUrl: path.join(assetsPath, 'backgrounds', 'premium_galaxy.png'),
   imageUrl_web: 'https://i.ibb.co/LD4mc8dG/premium-galaxy.png' 
  },
    'avatar_frame_azure_spark': {
    itemId: 'avatar_frame_azure_spark', name: 'Рамка "Лазурная искра"',
    description: 'Чистая энергия. Яркий стиль. Ничего лишнего',
    emoji: '💠',
    category: ItemCategory.PROFILE_ACCENT,
    decorationType: DecorationType.AVATAR_FRAME,
    price: { stars: 0, shards: 0 }, 
    buyable: false,
    stackable: false, 
    craftable: true,
    recipe: [
        { itemId: 'resource_common_fragment', quantity: 10 },
        { itemId: 'resource_uncommon_spark', quantity: 5 },
        { itemId: 'resource_rare_core', quantity: 1 }
    ],
     isUsable: true,
    imageUrl: path.join(assetsPath, 'frames', 'azure_spark.png'),
    imageUrl_web: 'https://i.ibb.co/0jv1NCyM/azure-spark.png' 
  },
  'title_token': { 
    itemId: 'title_token', name: 'Жетон титула', 
    description: 'Позволяет установить кастомный титул в профиле', emoji: '📜', category: ItemCategory.COSMETIC, 
    price: { stars: 0, shards: 20 }, buyable: true, stackable: false,
    isUsable: true,
  },
    'hween_frame_web': { 
      itemId: 'hween_frame_web', name: 'Рамка "Паутина"', 
      description: 'Жуткая рамка для вашего аватара, доступна только во время Хэллоуина.', emoji: '🕸️', category: ItemCategory.PROFILE_ACCENT, 
      decorationType: DecorationType.AVATAR_FRAME, 
      price: { stars: 0, shards: 0, event_candies: 150 },
      buyable: false, 
      stackable: false, 
      isEventItem: true,
      imageUrl: path.join(assetsPath, 'frames', 'halloween_web.png'),
  },
  'hween_bg_pumpkins': { 
      itemId: 'hween_bg_pumpkins', name: 'Фон "Тыквенное поле"', 
      description: 'Создайте жуткую атмосферу в своем профиле. Доступно только во время Хэллоуина.', emoji: '🎃', category: ItemCategory.PROFILE_ACCENT, 
      decorationType: DecorationType.CARD_BACKGROUND, 
      price: { stars: 0, shards: 0, event_candies: 250 },
      buyable: false,
      stackable: false, 
      isEventItem: true,
      imageUrl: path.join(assetsPath, 'backgrounds', 'halloween_pumpkins.png'), 
  },
  
  'hween_lootbox_spooky': {
    itemId: 'hween_lootbox_spooky', name: 'Жуткий ларец',
    description: 'Содержит хэллоуинские сладости и кошмары. Кто знает, что выпадет тебе?', emoji: '👻', category: ItemCategory.LOOTBOX,
    price: { stars: 0, shards: 0, event_candies: 50 },
    buyable: false, stackable: true, isEventItem: true,
    originalLootTable: [
        { value: { type: 'stars', quantityRange: [250, 750] }, weight: 45, quality: 'common' },
        { value: { type: 'item', id: 'resource_common_fragment', quantityRange: [5, 10] }, weight: 20, quality: 'common' },
        
        { value: { type: 'item', id: 'resource_uncommon_spark', quantityRange: [2, 4] }, weight: 15, quality: 'uncommon' },
        { value: { type: 'item', id: 'luck_clover_small', quantity: 1 }, weight: 10, quality: 'uncommon' },

        { value: { type: 'shards', quantityRange: [1, 2] }, weight: 5, quality: 'rare' },
        { value: { type: 'item', id: 'resource_rare_core', quantity: 1 }, weight: 4, quality: 'rare' },
        
        { value: { type: 'item', id: 'hween_frame_web', quantity: 1 }, weight: 0.6, quality: 'epic' },
        { value: { type: 'item', id: 'hween_bg_pumpkins', quantity: 1 }, weight: 0.4, quality: 'epic' },
    ],
    open: async function (userProfile, interaction, client, activeCloverEffect = null) {
      let currentLootTable = JSON.parse(JSON.stringify(this.originalLootTable));
      let cloverAppliedMessage = '';

      if (activeCloverEffect && activeCloverEffect.affectsLootboxCategories.includes(this.itemId)) {
        currentLootTable = currentLootTable.map(item => {
          const newItem = { ...item };
          if (newItem.quality === 'good' || newItem.quality === 'rare' || newItem.quality === 'epic') {
            newItem.weight = parseFloat((newItem.weight * activeCloverEffect.luckBoostFactor).toFixed(1));
          }
          return newItem;
        });
        cloverAppliedMessage = `\n✨ **Эффект "${activeCloverEffect.name}" был применен!**`;
      }

      let chosenRewardValue = getWeightedRandom(currentLootTable);
      if (!chosenRewardValue) return { success: false, message: '❌ **Не удалось определить награду**', rewards: [] };

      if (chosenRewardValue.quantityRange) {
        chosenRewardValue.quantity = getRandomInt(chosenRewardValue.quantityRange[0], chosenRewardValue.quantityRange[1]);
      } else if (!chosenRewardValue.quantity && chosenRewardValue.quantity !==0) {
        chosenRewardValue.quantity = 1;
      }

      const rewardsOutput = [await applyReward(userProfile, chosenRewardValue)];
      return { success: true, message: `👻 **Вы открыли ${this.name} и получили:**${cloverAppliedMessage}`, rewards: rewardsOutput };
    },
  },
   'golden_ticket': {
        itemId: 'golden_ticket',
        name: 'Золотой билет',
        description: 'Увеличивает шансы на победу в розыгрышах. Можно использовать при входе в розыгрыш, чтобы получить дополнительный голос.',
        emoji: '🎟️',
        category: ItemCategory.SPECIAL,
        price: { stars: 0, shards: 0 },
        buyable: false, 
        stackable: true,
        isUsable: false, 
    },
};

export function getItemDefinition(itemId) {
  return itemDefinitions[itemId] || null;
}
export function getShopItems() {
  return Object.values(itemDefinitions).filter(item => item.buyable);
}

export function getCraftableItems() {
  return Object.values(itemDefinitions).filter(item => item.craftable && item.recipe);
}

export function getAllItemDefinitions() {
  return itemDefinitions;
}
export default itemDefinitions;
