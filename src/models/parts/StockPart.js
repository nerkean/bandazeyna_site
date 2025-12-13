import mongoose from 'mongoose';

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

export { portfolioItemSchema, dailyStockTradeVolumeSchema };