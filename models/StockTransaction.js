// src/models/StockTransaction.js
import { Schema, model } from 'mongoose';

const stockTransactionSchema = new Schema({
    ticker: { type: String, required: true, index: true }, 
    userId: { type: String, required: true, index: true }, 
    type: { type: String, enum: ['BUY', 'SELL'], required: true },
    quantity: { type: Number, required: true },
    pricePerShare: { type: Number, required: true },
    totalValue: { type: Number, required: true }, 
}, { timestamps: true }); 

export default model('StockTransaction', stockTransactionSchema);