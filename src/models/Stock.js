import { Schema, model } from 'mongoose';

const mentionHistorySchema = new Schema({
    date: { type: Date, required: true },
    count: { type: Number, required: true, default: 0 }
}, { _id: false });

const priceHistorySchema = new Schema({
    date: { type: Date, required: true },
    price: { type: Number, required: true }
}, { _id: false });

const stockSchema = new Schema({
    ticker: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    ownerId: { type: String, default: null, index: true },
    stockType: { type: String, enum: ['system', 'player'], default: 'system' },
    mentionedByUserIds: { type: [String], default: [] },
    basePrice: { type: Number, required: true, default: 10 },
    currentPrice: { type: Number, required: true, default: 10 },
    lastChange: { type: Number, default: 0 },
    mentionHistory: { type: [mentionHistorySchema], default: [] },
priceHistory: { type: [priceHistorySchema], default: [] },
    description: {
        type: String,
        required: false, 
        maxLength: 250 
    },
}, { timestamps: true });

export default model('Stock', stockSchema);