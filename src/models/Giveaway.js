import { Schema, model } from 'mongoose';

const giveawaySchema = new Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true, unique: true },
    giveawayId: { type: String, required: true, unique: true }, 

    title: { type: String, required: true },
    description: { type: String, required: true },
    rewardsText: { type: String, required: true },
    winnerCount: { type: Number, required: true, min: 1 },
    
    entryCost: { type: Number, default: 0 },
    currency: { type: String, enum: ['stars', 'shards', null], default: null },

    endsAt: { type: Date, required: true },
    status: { type: String, enum: ['ACTIVE', 'ENDED'], default: 'ACTIVE', index: true },
    
    participants: { type: [String], default: [] },
    winners: { type: [String], default: [] }, 
    predefinedWinners: { type: [String], default: [] }, 

    hostedBy: { type: String, required: true }, 

    giveawayType: { 
        type: String, 
        enum: ['general', 'low_stars_giveaway', 'high_stars_giveaway'], 
        default: 'general' 
    },
    requirements: { 
        type: Schema.Types.Mixed, 
        default: {} 
    },
    rewardAmount: { type: Number, default: 0 },
    rewardCurrency: { type: String, enum: ['stars', 'shards', null], default: null },
    rewardSource: { type: String, enum: ['organizer', 'treasury', null], default: null },
}, { timestamps: true });

giveawaySchema.index({ status: 1, endsAt: 1 });

const Giveaway = model('Giveaway', giveawaySchema);

export default Giveaway;