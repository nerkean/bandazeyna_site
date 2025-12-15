import mongoose from 'mongoose';

const pixelBoardSchema = new mongoose.Schema({
    // Массив строк (hex-коды цветов), длина 10000
    pixels: { type: [String], default: [] }, 
    lastUpdated: { type: Date, default: Date.now }
});

export default mongoose.model('PixelBoard', pixelBoardSchema);