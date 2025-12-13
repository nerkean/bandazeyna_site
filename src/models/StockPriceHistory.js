import { Schema, model } from 'mongoose';

const stockPriceHistorySchema = new Schema({
    ticker: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    price: { type: Number, required: true },
});

export default model('StockPriceHistory', stockPriceHistorySchema);