export const QuestType = {
  MESSAGES_SENT: 'messages_sent',   
  VOICE_TIME: 'voice_time',     
  USE_DAILY_COMMAND: 'use_daily_command',
  CRAFT_ITEM: 'craft_item',         
  PRAISE_USER: 'praise_user',    
  OPEN_LOOTBOX: 'open_lootbox',       
  GIVE_REACTION: 'give_reaction',  
  GET_REACTION: 'get_reaction',     
  SPEND_STARS: 'spend_stars',     
  BUY_STOCK: 'buy_stock',          
};

export const QuestFrequency = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
};

const questDefinitions = {
  'daily_msg_10': {
    id: 'daily_msg_10',
    name: 'Разминка для пальцев',
    description: 'Отправить 10 сообщений на сервере',
    type: QuestType.MESSAGES_SENT,
    frequency: QuestFrequency.DAILY,
    target: 10, 
    reward: { stars: 10 },
    emoji: '💬',
  },
  'daily_voice_15m': {
    id: 'daily_voice_15m',
    name: 'Короткий разговор',
    description: 'Провести 15 минут в активном голосовом канале',
    type: QuestType.VOICE_TIME,
    frequency: QuestFrequency.DAILY,
    target: 15 * 60, 
    reward: { stars: 15 },
    emoji: '🎙️',
  },
  'daily_use_daily': {
    id: 'daily_use_daily',
    name: 'Не забудь про бонус!',
    description: 'Использовать команду /daily',
    type: QuestType.USE_DAILY_COMMAND,
    frequency: QuestFrequency.DAILY,
    target: 1,
    reward: { itemId: 'resource_common_fragment', quantity: 1 },
    emoji: '🎁',
  },
  'daily_praise_one': {
    id: 'daily_praise_one',
    name: 'Доброе слово',
    description: 'Похвалить одного пользователя через его профиль',
    type: QuestType.PRAISE_USER,
    frequency: QuestFrequency.DAILY,
    target: 1,
    reward: { stars: 5 },
    emoji: '👍',
  },
  'weekly_msg_100': {
    id: 'weekly_msg_100',
    name: 'Неделя общения',
    description: 'Отправить 100 сообщений за неделю',
    type: QuestType.MESSAGES_SENT,
    frequency: QuestFrequency.WEEKLY,
    target: 100,
    reward: { stars: 50, itemId: 'resource_uncommon_spark', quantity: 1 },
    emoji: '🗣️',
  },
  'weekly_voice_1h': {
    id: 'weekly_voice_1h',
    name: 'Час в эфире',
    description: 'Провести 1 час в активных голосовых каналах за неделю',
    type: QuestType.VOICE_TIME,
    frequency: QuestFrequency.WEEKLY,
    target: 60 * 60, 
    reward: { stars: 60, itemId: 'luck_clover_small', quantity: 1 },
    emoji: '🎧',
  },
  'weekly_craft_3': {
    id: 'weekly_craft_3',
    name: 'Мастер на все руки',
    description: 'Создать 3 любых предмета за неделю',
    type: QuestType.CRAFT_ITEM,
    frequency: QuestFrequency.WEEKLY,
    target: 3,
    reward: { stars: 40, itemId: 'resource_uncommon_spark', quantity: 2 },
    emoji: '🛠️',
  },
  'weekly_open_lootbox_2': {
    id: 'weekly_open_lootbox_2',
    name: 'Охотник за сокровищами',
    description: 'Открыть 2 любых лутбокса за неделю',
    type: QuestType.OPEN_LOOTBOX,
    frequency: QuestFrequency.WEEKLY,
    target: 2,
    reward: { stars: 30, itemId: 'lootbox_bronze', quantity: 1 },
    emoji: '📦',
  },

  'daily_react_5': {
    id: 'daily_react_5',
    name: 'Живой отклик',
    description: 'Поставить 5 реакций на сообщения других участников',
    type: QuestType.GIVE_REACTION,
    frequency: QuestFrequency.DAILY,
    target: 5,
    reward: { stars: 10 },
    emoji: '👍',
},
'daily_spend_100_stars': {
    id: 'daily_spend_100_stars',
    name: 'Шопинг-терапия',
    description: 'Потратить 100 ⭐ в магазине',
    type: QuestType.SPEND_STARS,
    frequency: QuestFrequency.DAILY,
    target: 100,
    reward: { stars: 150 },
    emoji: '🛍️',
},
'daily_get_3_reactions': {
    id: 'daily_get_3_reactions',
    name: 'В центре внимания',
    description: 'Получить 3 реакции на любые свои сообщения',
    type: QuestType.GET_REACTION,
    frequency: QuestFrequency.DAILY,
    target: 3,
    reward: { stars: 20 },
    emoji: '❤️',
},
'weekly_praise_5': {
    id: 'weekly_praise_5',
    name: 'Посол доброй воли',
    description: 'Похвалить 5 разных пользователей за неделю',
    type: QuestType.PRAISE_USER,
    frequency: QuestFrequency.WEEKLY,
    target: 5,
    reward: { stars: 75 },
    emoji: '🤝',
},
'weekly_buy_stock': {
    id: 'weekly_buy_stock',
    name: 'Начинающий инвестор',
    description: 'Купить любую акцию на бирже через /invest buy',
    type: QuestType.BUY_STOCK,
    frequency: QuestFrequency.WEEKLY,
    target: 1,
    reward: { stars: 40 },
    emoji: '📈',
},
'weekly_get_20_reactions': {
    id: 'weekly_get_20_reactions',
    name: 'Создатель контента',
    description: 'Собрать в сумме 20 реакций на своих сообщениях за неделю',
    type: QuestType.GET_REACTION,
    frequency: QuestFrequency.WEEKLY,
    target: 20,
    reward: { itemId: 'resource_uncommon_spark', quantity: 3, stars: 100 },
    emoji: '⭐',
},
'weekly_craft_luck_clover': { 
  id: 'weekly_craft_luck_clover', 
  name: 'На удачу!', 
  description: 'Создать 1 Малый клевер удачи', 
  type: QuestType.CRAFT_ITEM, 
  frequency: QuestFrequency.WEEKLY, 
  target: 1, 
  criteria: { itemId: 'luck_clover_small' }, 
  reward: { stars: 100 }, 
  emoji: '🍀' },
};

/**
 * @param {string} questId
 * @returns {object|null}
 */
export function getQuestDefinition(questId) {
  return questDefinitions[questId] || null;
}

/**
 * @returns {object}
 */
export function getAllQuestDefinitions() {
  return questDefinitions;
}

/**
 * @param {QuestFrequency} frequency 
 * @param {number} count 
 * @param {string[]} excludeIds 
 * @returns {object[]} 
 */
export function getRandomQuests(frequency, count, excludeIds = []) {
  const availableQuests = Object.values(questDefinitions).filter(
    q => q.frequency === frequency && !excludeIds.includes(q.id)
  );

  const shuffled = availableQuests.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export default questDefinitions;
