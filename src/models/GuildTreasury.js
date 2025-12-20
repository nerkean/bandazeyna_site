import mongoose from 'mongoose';

const guildTreasurySchema = new mongoose.Schema({
    _id: { type: String, required: true },
    totalStars: { type: Number, default: 0 },
    marketTrend: { 
        type: String, 
        enum: ['BULL', 'BEAR', 'FLAT', 'CHAOS'], 
        default: 'FLAT' 
    },
    trendExpiresAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('GuildTreasury', guildTreasurySchema);