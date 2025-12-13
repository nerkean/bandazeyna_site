import mongoose from 'mongoose';

const userDailyStreakSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  currentStreak: { type: Number, default: 0, min: 0 },
  lastClaimTimestamp: { type: Date, default: null },
}, { timestamps: true });

userDailyStreakSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// === [НОВОЕ] СТАТИЧЕСКИЙ МЕТОД ПОЛУЧЕНИЯ ДАННЫХ ===
// Этот метод вызывается как UserDailyStreak.fetchStreakData(...)
userDailyStreakSchema.statics.fetchStreakData = async function(userId, guildId) {
    let streak = await this.findOne({ userId, guildId });
    
    // Если данных нет, возвращаем объект-заглушку, чтобы код не падал
    if (!streak) {
        return { 
            currentStreak: 0, 
            lastClaimTimestamp: null,
            userId,
            guildId
        };
    }
    return streak;
};

/**
 * Проверяет, может ли пользователь забрать ежедневную награду.
 */
userDailyStreakSchema.methods.canClaim = async function() {
    const now = new Date();
    if (!this.lastClaimTimestamp) {
        return { status: true, nextClaimIn: 'Сейчас' };
    }

    const lastClaimDate = new Date(this.lastClaimTimestamp);
    const nextClaimDate = new Date(lastClaimDate);
    nextClaimDate.setDate(lastClaimDate.getDate() + 1);
    nextClaimDate.setHours(0, 0, 0, 0);

    if (now >= nextClaimDate) {
        return { status: true, nextClaimIn: 'Сейчас' };
    } else {
        const timeDiffMs = nextClaimDate.getTime() - now.getTime();
        const { formatDuration } = await import('../utils/helpers.js');
        const nextClaimInFormatted = formatDuration(timeDiffMs / 1000);
        return { status: false, nextClaimIn: `через ${nextClaimInFormatted}` };
    }
};

/**
 * Засчитывает получение награды и обновляет стрик.
 */
userDailyStreakSchema.methods.claim = async function() {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    if (this.lastClaimTimestamp) {
        const lastClaimDate = new Date(this.lastClaimTimestamp);
        lastClaimDate.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        if (lastClaimDate.getTime() === yesterday.getTime()) {
            this.currentStreak += 1;
        } else if (lastClaimDate.getTime() < yesterday.getTime()) {
            this.currentStreak = 1;
        }
    } else {
        this.currentStreak = 1;
    }

    this.lastClaimTimestamp = now;
    return this.currentStreak;
};

const UserDailyStreak = mongoose.model('UserDailyStreak', userDailyStreakSchema);
export default UserDailyStreak;