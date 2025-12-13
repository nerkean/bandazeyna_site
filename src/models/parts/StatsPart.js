import mongoose from 'mongoose';

// === СХЕМЫ СТАТИСТИКИ ===

const dailyChannelStatsSchema = new mongoose.Schema({
  messageCount: { type: Number, default: 0 },
  voiceSeconds: { type: Number, default: 0 },
}, { _id: false });

const dailyActivityRecordSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    messages: { type: Number, default: 0 },
    voiceSeconds: { type: Number, default: 0 },
}, { _id: false });

const userAchievementSchema = new mongoose.Schema({
  achievementId: { type: String, required: true },
  dateCompleted: { type: Date, default: Date.now },
}, { _id: false });

const topAppearanceSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    rank: { type: Number, required: true, min: 1, max: 3 },
}, { _id: false });

const topCategoryStatsSchema = new mongoose.Schema({
    count: { type: Number, default: 0 },
    lastAppearance: topAppearanceSchema,
}, { _id: false });

// === МЕТОДЫ СТАТИСТИКИ ===
export const attachStatsMethods = (userProfileSchema) => {

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
};

export {
    dailyChannelStatsSchema,
    dailyActivityRecordSchema,
    userAchievementSchema,
    topCategoryStatsSchema
};