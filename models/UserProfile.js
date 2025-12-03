import mongoose from 'mongoose';
import { getQuestDefinition, QuestType } from '../utils/questDefinitions.js';

const inventoryItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1, min: 0 },
  reservedQuantity: { type: Number, default: 0, min: 0 },
}, { _id: false });

const activeStarBoostSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  name: { type: String, required: true },
  multiplier: { type: Number, required: true },
  durationMinutes: { type: Number, required: true },
  appliedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
}, { _id: false });

const activeLuckCloverSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  luckBoostFactor: { type: Number, required: true },
  affectsLootboxCategories: [{ type: String }],
}, { _id: false });

const userAchievementSchema = new mongoose.Schema({
  achievementId: { type: String, required: true },
  dateCompleted: { type: Date, default: Date.now },
}, { _id: false });

const dailyChannelStatsSchema = new mongoose.Schema({
  messageCount: { type: Number, default: 0 },
  voiceSeconds: { type: Number, default: 0 },
}, { _id: false });

const dailyActivityRecordSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    messages: { type: Number, default: 0 },
    voiceSeconds: { type: Number, default: 0 },
}, { _id: false });

const profileCommentSchema = new mongoose.Schema({
    authorId: { type: String, required: true },
    authorUsername: { type: String, required: true },
    comment: { type: String, required: true, maxlength: 250 },
    timestamp: { type: Date, default: Date.now },
}, { _id: false });

const activeQuestSchema = new mongoose.Schema({
  questId: { type: String, required: true },
  progress: { type: Number, default: 0 },
  target: { type: Number, required: true },
  isCompleted: { type: Boolean, default: false },
  isClaimed: { type: Boolean, default: false },
  assignedAt: { type: Date, default: Date.now },
  frequency: { type: String, required: true },
}, { _id: false });

const topAppearanceSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    rank: { type: Number, required: true, min: 1, max: 3 },
}, { _id: false });

const topCategoryStatsSchema = new mongoose.Schema({
    count: { type: Number, default: 0 },
    lastAppearance: topAppearanceSchema,
}, { _id: false });

const portfolioItemSchema = new mongoose.Schema({
    ticker: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    avgBuyPrice: { type: Number, required: true }, 
    totalInvested: { type: Number, default: 0 } 
}, { _id: false });

const dailyStockTradeVolumeSchema = new mongoose.Schema({
    bought: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },
}, { _id: false });

const userProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  username: { type: String, required: true, default: 'Unknown' },
  avatar: { type: String, default: null },
  stars: { type: Number, default: 0 },
  shards: { type: Number, default: 0 },
  reservedStars: { type: Number, default: 0 },
  reservedShards: { type: Number, default: 0 },

  totalMessages: { type: Number, default: 0 },
  totalVoiceTime: { type: Number, default: 0 },

  messagesToday: { type: Number, default: 0 },
  voiceTimeToday: { type: Number, default: 0 },
  oracleUsesToday: { type: Number, default: 0 },

  messagesLast7Days: { type: Number, default: 0 },
  voiceLast7Days: { type: Number, default: 0 },
  messagesLast30Days: { type: Number, default: 0 },
  voiceLast30Days: { type: Number, default: 0 },

  dailyActivityHistory: [dailyActivityRecordSchema],
  achievements: [userAchievementSchema],
  showcasedAchievements: [{ type: String, default: [] }],

  profileBannerURL: { type: String, default: null },
  activeAvatarFrameId: { type: String, default: null },
  activeCardBorderId: { type: String, default: null },
  activeCardBgId: { type: String, default: null },
  activeTitle: { type: String, default: null, maxlength: 50 },
  usedAvatarFrames: [{ type: String, default: [] }],

  dailyChannelActivity: {
    type: Map,
    of: dailyChannelStatsSchema,
    default: () => new Map()
  },

  reputation: { type: Number, default: 0 },
  profileComments: [profileCommentSchema],
  lastPraiseTimestamp: { type: Date, default: null },
  lastDisrespectTimestamp: { type: Date, default: null },

  marriedTo: { type: String, default: null },
  marriageDate: { type: Date, default: null },
   marriageProposals: { 
        type: [{
            userId: String, 
            expiresAt: Date 
        }],
        default: []
    },

  premiumRoleExpiresAt: { type: Date, default: null },
  premiumType: { type: String, enum: ['temporary', 'permanent', null], default: null },
  premiumExpiryNotified: { type: Boolean, default: false },

  lastMessageStarTimestamp: { type: Date, default: null },
  inventory: [inventoryItemSchema],
  activeStarBoost: { type: activeStarBoostSchema, default: null },
  activeLuckClover: { type: activeLuckCloverSchema, default: null },
  activeQuests: [activeQuestSchema],
  lastDailyQuestsUpdate: { type: Date, default: null },
  lastWeeklyQuestsUpdate: { type: Date, default: null },
  joinedAt: { type: Date },

  topStats: {
    type: Map,
    of: topCategoryStatsSchema,
    default: () => new Map(),
  },

 mutesIssued: { type: Number, default: 0 },
     warningsIssued: { type: Number, default: 0 },
    warningsReceived: { type: Number, default: 0 },
    notificationSettings: {
        type: Map,
        of: Boolean,
        default: () => new Map([
            ['questCompletion', true],
            ['achievementUnlock', true],
            ['taxNotification', true]
        ])
    },
     maxReactionsOnMessage: { type: Number, default: 0 },
      portfolio: [portfolioItemSchema],
      dailyStockTradeVolume: {
        type: Map,
        of: dailyStockTradeVolumeSchema,
        default: () => new Map()
    },
       event_candies: { type: Number, default: 0 },
       event_messagesForCandy: { type: Number, default: 0 }, 
  event_candiesFromMessagesToday: { type: Number, default: 0 }, 
    event_ghostsCaught: { type: Number, default: 0 },
     totalStarsPaidInTax: { type: Number, default: 0 },
       taxDue: { 
        type: Number,
        default: 0,
        min: 0 
    },
        isTaxDelinquent: { 
        type: Boolean,
        default: false,
        index: true 
    },
    blockedUsers: [{ type: String, default: [] }],
}, { timestamps: true });

userProfileSchema.index({ userId: 1, guildId: 1 }, { unique: true });
userProfileSchema.index({ guildId: 1, stars: -1 });
userProfileSchema.index({ guildId: 1, shards: -1 });
userProfileSchema.index({ guildId: 1, totalMessages: -1 });
userProfileSchema.index({ guildId: 1, totalVoiceTime: -1 });
userProfileSchema.index({ guildId: 1, messagesLast7Days: -1 });
userProfileSchema.index({ guildId: 1, voiceLast7Days: -1 });
userProfileSchema.index({ guildId: 1, messagesLast30Days: -1 });
userProfileSchema.index({ guildId: 1, voiceLast30Days: -1 });
userProfileSchema.index({ guildId: 1, messagesToday: -1 });
userProfileSchema.index({ guildId: 1, voiceTimeToday: -1 });
userProfileSchema.index({ premiumType: 1, premiumRoleExpiresAt: 1 });
userProfileSchema.index({ guildId: 1, premiumType: 1, premiumRoleExpiresAt: 1 });
userProfileSchema.index({ userId: 1, guildId: 1, 'activeQuests.questId': 1 });


userProfileSchema.statics.fetchProfile = async function(userId, guildId, username, guildMember = null) {
  let userProfile = await this.findOne({ userId, guildId });
  const now = new Date();

  const avatar = guildMember ? guildMember.user.avatar : null;

  if (!userProfile) {
    const profileData = {
      userId,
      guildId,
      username,
      avatar,
      joinedAt: guildMember ? guildMember.joinedAt : now,
      inventory: [],
      achievements: [],
      showcasedAchievements: [],
      activeAvatarFrameId: null,
      activeCardBorderId: null,
      activeCardBgId: null,
      activeTitle: null,
      usedAvatarFrames: [],
      dailyActivityHistory: [],
      dailyChannelActivity: new Map(),
      reputation: 0,
      profileComments: [],
      oracleUsesToday: 0,
      lastPraiseTimestamp: null,
      lastDisrespectTimestamp: null,
      activeStarBoost: null,
      activeLuckClover: null,
      premiumRoleExpiresAt: null,
      premiumType: null,
      premiumExpiryNotified: false,
      reservedStars: 0,
      reservedShards: 0,
      activeQuests: [],
      dailyStockTradeVolume: new Map(),
                  taxDue: 0,
            isTaxDelinquent: false,
      lastDailyQuestsUpdate: null,
      lastWeeklyQuestsUpdate: null,
      topStats: new Map(),
            warningsIssued: 0,
            warningsReceived: 0,
      mutesIssued: 0,
                  notificationSettings: new Map([
                ['questCompletion', true],
                ['achievementUnlock', true],
                ['taxNotification', true]
            ]),
 event_candies: 0,
      event_messagesForCandy: 0,
      event_candiesFromMessagesToday: 0,    
      totalStarsPaidInTax: 0, 
       event_ghostsCaught: 0,
    };
    userProfile = new this(profileData);
    await userProfile.save();
    console.log(`✨ [ProfileDB] Создан новый профиль для ${username} (${userId}) на сервере ${guildId}`);
  } else {
    let updated = false;
    if (userProfile.username !== username) { userProfile.username = username; updated = true; }
    if (avatar && userProfile.avatar !== avatar) { userProfile.avatar = avatar; updated = true; }
  if (typeof userProfile.event_candies === 'undefined') { userProfile.event_candies = 0; updated = true; }
    if (typeof userProfile.event_messagesForCandy === 'undefined') { userProfile.event_messagesForCandy = 0; updated = true; }
    if (typeof userProfile.event_candiesFromMessagesToday === 'undefined') { userProfile.event_candiesFromMessagesToday = 0; updated = true; }
     if (typeof userProfile.event_ghostsCaught === 'undefined') { userProfile.event_ghostsCaught = 0; updated = true; }
    if (typeof userProfile.oracleUsesToday === 'undefined') { userProfile.oracleUsesToday = 0; updated = true; }
    if (!userProfile.achievements) { userProfile.achievements = []; updated = true; }
    if (!userProfile.showcasedAchievements) { userProfile.showcasedAchievements = []; updated = true; }
    if (typeof userProfile.activeTitle === 'undefined') { userProfile.activeTitle = null; updated = true; }
    if (!userProfile.dailyStockTradeVolume || !(userProfile.dailyStockTradeVolume instanceof Map)) {
            userProfile.dailyStockTradeVolume = new Map(); updated = true;
        }
                if (typeof userProfile.taxDue === 'undefined') {
             userProfile.taxDue = 0;
             updated = true;
        }
         if (typeof userProfile.isTaxDelinquent === 'undefined') {
             userProfile.isTaxDelinquent = false;
             updated = true;
        }
    if (!userProfile.usedAvatarFrames) { userProfile.usedAvatarFrames = []; updated = true; }
    if (!userProfile.dailyActivityHistory) { userProfile.dailyActivityHistory = []; updated = true; }
    if (!userProfile.dailyChannelActivity || !(userProfile.dailyChannelActivity instanceof Map)) { userProfile.dailyChannelActivity = new Map(); updated = true; }
    if (typeof userProfile.messagesLast7Days === 'undefined') { userProfile.messagesLast7Days = 0; updated = true; }
    if (typeof userProfile.voiceLast7Days === 'undefined') { userProfile.voiceLast7Days = 0; updated = true; }
    if (typeof userProfile.messagesLast30Days === 'undefined') { userProfile.messagesLast30Days = 0; updated = true; }
    if (typeof userProfile.voiceLast30Days === 'undefined') { userProfile.voiceLast30Days = 0; updated = true; }
    if (typeof userProfile.reputation === 'undefined') { userProfile.reputation = 0; updated = true; }
    if (!userProfile.profileComments) { userProfile.profileComments = []; updated = true; }
    if (typeof userProfile.lastPraiseTimestamp === 'undefined') { userProfile.lastPraiseTimestamp = null; updated = true; }
    if (typeof userProfile.lastDisrespectTimestamp === 'undefined') { userProfile.lastDisrespectTimestamp = null; updated = true; }
    if (typeof userProfile.activeStarBoost === 'undefined') { userProfile.activeStarBoost = null; updated = true; }
    if (typeof userProfile.activeLuckClover === 'undefined') { userProfile.activeLuckClover = null; updated = true; }
    if (typeof userProfile.premiumRoleExpiresAt === 'undefined') { userProfile.premiumRoleExpiresAt = null; updated = true; }
    if (typeof userProfile.premiumType === 'undefined') { userProfile.premiumType = null; updated = true; }
    if (typeof userProfile.premiumExpiryNotified === 'undefined') { userProfile.premiumExpiryNotified = false; updated = true; }
    if (typeof userProfile.reservedStars === 'undefined') { userProfile.reservedStars = 0; updated = true; }
    if (typeof userProfile.reservedShards === 'undefined') { userProfile.reservedShards = 0; updated = true; }
    userProfile.inventory.forEach(item => {
        if (typeof item.reservedQuantity === 'undefined') {
            item.reservedQuantity = 0;
            updated = true;
        }
    });
    if (!userProfile.activeQuests) { userProfile.activeQuests = []; updated = true; }
    if (typeof userProfile.lastDailyQuestsUpdate === 'undefined') { userProfile.lastDailyQuestsUpdate = null; updated = true; }
    if (typeof userProfile.lastWeeklyQuestsUpdate === 'undefined') { userProfile.lastWeeklyQuestsUpdate = null; updated = true; }
    if (!userProfile.topStats || !(userProfile.topStats instanceof Map)) { userProfile.topStats = new Map(); updated = true; }
   if (typeof userProfile.warningsIssued === 'undefined') { userProfile.warningsIssued = 0; updated = true; }
        if (typeof userProfile.warningsReceived === 'undefined') { userProfile.warningsReceived = 0; updated = true; }
    if (typeof userProfile.mutesIssued === 'undefined') { userProfile.mutesIssued = 0; updated = true; }
        if (!userProfile.notificationSettings || !(userProfile.notificationSettings instanceof Map) || userProfile.notificationSettings.size === 0) {
            userProfile.notificationSettings = new Map([
                ['questCompletion', true],
                ['achievementUnlock', true],
                ['taxNotification', true]
            ]);
            updated = true;
        } else {
            if (userProfile.notificationSettings.get('taxNotification') === undefined) {
                 userProfile.notificationSettings.set('taxNotification', true);
                 updated = true;
            }
        }
    if (typeof userProfile.totalStarsPaidInTax === 'undefined') { 
        userProfile.totalStarsPaidInTax = 0;
        updated = true;
    }


    if (updated) {
      await userProfile.save();
    }
  }
  return userProfile;
};

userProfileSchema.methods.hasAchievement = function(achievementId) {
    return this.achievements.some(ach => ach.achievementId === achievementId);
};

userProfileSchema.methods.grantAchievement = async function(achievementId) {
    if (!this.hasAchievement(achievementId)) {
        this.achievements.push({ achievementId: achievementId, dateCompleted: new Date() });
        return true;
    }
    return false;
};

userProfileSchema.methods.hasItem = function(itemId, quantity = 1) {
    const item = this.inventory.find(invItem => invItem.itemId === itemId);
    return item && item.quantity >= quantity;
};

userProfileSchema.methods.addItemToInventory = async function(itemId, quantity = 1) {
  if (quantity <= 0) return false;
  const itemIndex = this.inventory.findIndex(item => item.itemId === itemId);
  if (itemIndex > -1) {
    this.inventory[itemIndex].quantity += quantity;
  } else {
    this.inventory.push({ itemId, quantity, reservedQuantity: 0 });
  }
  return true;
};

userProfileSchema.methods.removeItemFromInventory = async function(itemId, quantity = 1) {
  if (quantity <= 0) return false;
  const itemIndex = this.inventory.findIndex(item => item.itemId === itemId);
  if (itemIndex > -1) {
    if (this.inventory[itemIndex].quantity >= quantity) {
      this.inventory[itemIndex].quantity -= quantity;
      if (this.inventory[itemIndex].quantity === 0 && this.inventory[itemIndex].reservedQuantity === 0) {
        this.inventory.splice(itemIndex, 1);
      }
      return true;
    } else {
      return false;
    }
  }
  return false;
};

userProfileSchema.methods.reserveItem = function(itemId, quantityToReserve) {
    if (quantityToReserve <= 0) return false;
    const itemIndex = this.inventory.findIndex(item => item.itemId === itemId);

    if (itemIndex > -1) {
        if (this.inventory[itemIndex].quantity >= quantityToReserve) {
            this.inventory[itemIndex].quantity -= quantityToReserve;
            this.inventory[itemIndex].reservedQuantity = (this.inventory[itemIndex].reservedQuantity || 0) + quantityToReserve;
            return true;
        }
    }
    return false;
};

userProfileSchema.methods.releaseReservedItem = function(itemId, quantityToRelease) {
    if (quantityToRelease <= 0) return false;
    const itemIndex = this.inventory.findIndex(item => item.itemId === itemId);

    if (itemIndex > -1) {
        if (this.inventory[itemIndex].reservedQuantity >= quantityToRelease) {
            this.inventory[itemIndex].reservedQuantity -= quantityToRelease;
            this.inventory[itemIndex].quantity += quantityToRelease;
            return true;
        }
    }
    return false;
};

userProfileSchema.methods.consumeReservedItem = function(itemId, quantityToConsume) {
    if (quantityToConsume <= 0) return false;
    const itemIndex = this.inventory.findIndex(item => item.itemId === itemId);

    if (itemIndex > -1) {
        if (this.inventory[itemIndex].reservedQuantity >= quantityToConsume) {
            this.inventory[itemIndex].reservedQuantity -= quantityToConsume;
            if (this.inventory[itemIndex].quantity === 0 && this.inventory[itemIndex].reservedQuantity === 0) {
                this.inventory.splice(itemIndex, 1);
            }
            return true;
        }
    }
    return false;
};

userProfileSchema.methods.reserveCurrency = function(amount, currencyType) {
    if (amount <= 0) return false;
    if (currencyType === 'stars') {
        if (this.stars >= amount) {
            this.stars -= amount;
            this.reservedStars = (this.reservedStars || 0) + amount;
            this.stars = parseFloat(this.stars.toFixed(2));
            this.reservedStars = parseFloat(this.reservedStars.toFixed(2));
            return true;
        }
    } else if (currencyType === 'shards') {
        if (this.shards >= amount) {
            this.shards -= amount;
            this.reservedShards = (this.reservedShards || 0) + amount;
            return true;
        }
    }
    return false;
};

userProfileSchema.methods.releaseReservedCurrency = function(amount, currencyType) {
    if (amount <= 0) return false;
    if (currencyType === 'stars') {
        if (this.reservedStars >= amount) {
            this.reservedStars -= amount;
            this.stars += amount;
            this.stars = parseFloat(this.stars.toFixed(2));
            this.reservedStars = parseFloat(this.reservedStars.toFixed(2));
            return true;
        }
    } else if (currencyType === 'shards') {
        if (this.reservedShards >= amount) {
            this.reservedShards -= amount;
            this.shards += amount;
            return true;
        }
    }
    return false;
};

userProfileSchema.methods.consumeReservedCurrency = function(amount, currencyType) {
    if (amount <= 0) return false;
    if (currencyType === 'stars') {
        if (this.reservedStars >= amount) {
            this.reservedStars -= amount;
            this.reservedStars = parseFloat(this.reservedStars.toFixed(2));
            return true;
        }
    } else if (currencyType === 'shards') {
        if (this.reservedShards >= amount) {
            this.reservedShards -= amount;
            return true;
        }
    }
    return false;
};

userProfileSchema.methods.updateQuestProgress = async function(type, value = 1, client = null) {
    const newlyCompletedQuestIds = [];
    if (!this.activeQuests || this.activeQuests.length === 0) {
        return { newlyCompletedQuestIds, wasModified: false };
    }

    let wasModified = false;

    for (const quest of this.activeQuests) {
        if (quest.isCompleted || quest.isClaimed) continue;

        const questDef = getQuestDefinition(quest.questId);
        if (!questDef || questDef.type !== type) continue;

        let progressIncrement = 0;

        switch (type) {
            case QuestType.MESSAGES_SENT:
            case QuestType.USE_DAILY_COMMAND:
            case QuestType.PRAISE_USER:
            case QuestType.GIVE_REACTION:
            case QuestType.GET_REACTION:
            case QuestType.BUY_STOCK:
                if (typeof value === 'number') progressIncrement = value;
                else progressIncrement = 1;
                break;
            case QuestType.VOICE_TIME:
            case QuestType.SPEND_STARS:
                if (typeof value === 'number') progressIncrement = value;
                break;
            case QuestType.CRAFT_ITEM:
                if (questDef.criteria && questDef.criteria.itemId) {
                    if (value === questDef.criteria.itemId) progressIncrement = 1;
                } else {
                    progressIncrement = 1;
                }
                break;
            case QuestType.OPEN_LOOTBOX:
                if (questDef.criteria && questDef.criteria.lootboxId) {
                    if (value === questDef.criteria.lootboxId) progressIncrement = 1;
                } else {
                    progressIncrement = 1;
                }
                break;
            default:
                break;
        }

        if (progressIncrement > 0) {
            quest.progress += progressIncrement;
            wasModified = true;
            if (quest.progress >= quest.target) {
                quest.progress = quest.target;
                quest.isCompleted = true;
                newlyCompletedQuestIds.push(quest.questId);
                console.log(`[Quests] Пользователь ${this.username} выполнил квест: ${questDef.name}`);
            }
        }
    }

    if (wasModified) {
        this.markModified('activeQuests');
    }

    return { newlyCompletedQuestIds, wasModified };
};

const UserProfile = mongoose.model('UserProfile', userProfileSchema);
export default UserProfile;
