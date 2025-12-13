// src/models/StockTransaction.js
import { Schema, model } from 'mongoose';

const stockTransactionSchema = new Schema({
    ticker: { type: String, required: true, index: true }, 
    userId: { type: String, required: true, index: true }, 
    // Тип транзакции: покупка или продажа
    type: { type: String, enum: ['BUY', 'SELL'], required: true },
    quantity: { type: Number, required: true },
    pricePerShare: { type: Number, required: true },
    // Общая сумма, уплаченная/полученная (без учета налога)
    totalValue: { type: Number, required: true }, 
}, { timestamps: true }); // `createdAt` будет нашей датой транзакции

export default model('StockTransaction', stockTransactionSchema);