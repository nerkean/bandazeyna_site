import mongoose from 'mongoose';
import { getQuestDefinition, QuestType } from '../utils/definitions/questDefinitions.js';

import { 
    inventoryItemSchema, 
    activeStarBoostSchema, 
    activeLuckCloverSchema, 
    attachInventoryMethods 
} from './parts/InventoryPart.js';

import { 
    portfolioItemSchema, 
    dailyStockTradeVolumeSchema 
} from './parts/StockPart.js';

import {
    dailyChannelStatsSchema,
    dailyActivityRecordSchema,
    userAchievementSchema,
    topCategoryStatsSchema,
    attachStatsMethods
} from './parts/StatsPart.js';

import {
    profileCommentSchema,
    attachSocialMethods
} from './parts/SocialPart.js';


const activeQuestSchema = new mongoose.Schema({
  questId: { type: String, required: true },
  progress: { type: Number, default: 0 },
  target: { type: Number, required: true },
  isCompleted: { type: Boolean, default: false },
  isClaimed: { type: Boolean, default: false },
  assignedAt: { type: Date, default: Date.now },
  frequency: { type: String, required: true },
}, { _id: false });

const userProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  username: { type: String, required: true, default: 'Unknown' },
  avatar: { type: String, default: null },
  joinedAt: { type: Date },
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
  dailyChannelActivity: {
    type: Map,
    of: dailyChannelStatsSchema,
    default: () => new Map()
  },
  
  topStats: {
    type: Map,
    of: topCategoryStatsSchema,
    default: () => new Map(),
  },
  profileBannerURL: { type: String, default: null },
  activeAvatarFrameId: { type: String, default: null },
  activeCardBorderId: { type: String, default: null },
  activeCardBgId: { type: String, default: null },
  activeTitle: { type: String, default: null, maxlength: 50 },
  usedAvatarFrames: [{ type: String, default: [] }],
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
  mutesIssued: { type: Number, default: 0 },
  warningsIssued: { type: Number, default: 0 },
  warningsReceived: { type: Number, default: 0 },
  blockedUsers: [{ type: String, default: [] }],
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: null },
  inventory: [inventoryItemSchema],
  activeStarBoost: { type: activeStarBoostSchema, default: null },
  activeLuckClover: { type: activeLuckCloverSchema, default: null },
  lastMessageStarTimestamp: { type: Date, default: null },
  portfolio: [portfolioItemSchema],
  dailyStockTradeVolume: {
      type: Map,
      of: dailyStockTradeVolumeSchema,
      default: () => new Map()
  },
  activeQuests: [activeQuestSchema],
  lastDailyQuestsUpdate: { type: Date, default: null },
  lastWeeklyQuestsUpdate: { type: Date, default: null },
  notificationSettings: {
      type: Map,
      of: Boolean,
      default: () => new Map([
          ['questCompletion', true],
          ['achievementUnlock', true],
          ['taxNotification', true]
      ])
  },
  event_candies: { type: Number, default: 0 },
  event_messagesForCandy: { type: Number, default: 0 }, 
  event_candiesFromMessagesToday: { type: Number, default: 0 }, 
  event_ghostsCaught: { type: Number, default: 0 },
  lastPixelTime: { type: Date, default: 0 }, 
  totalStarsPaidInTax: { type: Number, default: 0 },
  taxDue: { type: Number, default: 0, min: 0 },
  taxPaymentDeadline: { type: Date, default: null },
  isTaxDelinquent: { type: Boolean, default: false, index: true },
  maxReactionsOnMessage: { type: Number, default: 0 },
  isWikiEditor: { type: Boolean, default: false },
}, { timestamps: true });

userProfileSchema.index({ userId: 1, guildId: 1 }, { unique: true });
userProfileSchema.index({ guildId: 1, stars: -1 });
userProfileSchema.index({ guildId: 1, totalMessages: -1 });
userProfileSchema.index({ guildId: 1, messagesToday: -1 });
userProfileSchema.index({ guildId: 1, voiceTimeToday: -1 });
userProfileSchema.index({ guildId: 1, 'activeQuests.questId': 1 });

attachInventoryMethods(userProfileSchema);
attachStatsMethods(userProfileSchema);
attachSocialMethods(userProfileSchema);

userProfileSchema.methods.reserveCurrency = function(amount, currencyType) {
    if (amount <= 0) return false;
    if (currencyType === 'stars') {
        if (this.stars >= amount) {
            this.stars -= amount;
            this.reservedStars = (this.reservedStars || 0) + amount;
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
        if ([QuestType.MESSAGES_SENT, QuestType.USE_DAILY_COMMAND, QuestType.BUY_STOCK].includes(type)) {
             progressIncrement = typeof value === 'number' ? value : 1;
        } else if ([QuestType.VOICE_TIME, QuestType.SPEND_STARS].includes(type)) {
             progressIncrement = typeof value === 'number' ? value : 0;
        } else if (type === QuestType.CRAFT_ITEM && questDef.criteria?.itemId && value === questDef.criteria.itemId) {
             progressIncrement = 1;
        } else if (type === QuestType.OPEN_LOOTBOX && (!questDef.criteria?.lootboxId || value === questDef.criteria.lootboxId)) {
             progressIncrement = 1;
        }

        if (progressIncrement > 0) {
            quest.progress += progressIncrement;
            wasModified = true;
            if (quest.progress >= quest.target) {
                quest.progress = quest.target;
                quest.isCompleted = true;
                newlyCompletedQuestIds.push(quest.questId);
            }
        }
    }

    if (wasModified) this.markModified('activeQuests');
    return { newlyCompletedQuestIds, wasModified };
};

userProfileSchema.statics.fetchProfile = async function(userId, guildId, username, guildMember = null) {
  let userProfile = await this.findOne({ userId, guildId });
  const now = new Date();
  const avatar = guildMember ? guildMember.user.avatar : null;

  if (!userProfile) {
    userProfile = new this({
      userId,
      guildId,
      username,
      avatar,
      joinedAt: guildMember ? guildMember.joinedAt : now,
      inventory: [],
      achievements: [],
      dailyActivityHistory: [],
      dailyChannelActivity: new Map(),
      dailyStockTradeVolume: new Map(),
      topStats: new Map(),
      notificationSettings: new Map([['questCompletion', true], ['achievementUnlock', true], ['taxNotification', true]])
    });
    await userProfile.save();
    console.log(`✨ [ProfileDB] Создан профиль: ${username}`);
  } else {
    let updated = false;
    if (userProfile.username !== username) { userProfile.username = username; updated = true; }
    if (avatar && userProfile.avatar !== avatar) { userProfile.avatar = avatar; updated = true; }
    if (!userProfile.dailyStockTradeVolume) { userProfile.dailyStockTradeVolume = new Map(); updated = true; }
    if (!userProfile.notificationSettings) { userProfile.notificationSettings = new Map(); updated = true; }
    if (typeof userProfile.taxDue === 'undefined') { userProfile.taxDue = 0; updated = true; }

    if (updated) await userProfile.save();
  }
  return userProfile;
};

const UserProfile = mongoose.model('UserProfile', userProfileSchema);
export default UserProfile;