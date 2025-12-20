import mongoose from 'mongoose';

const pixelBoardSchema = new mongoose.Schema({
    pixels: { type: [String], default: [] }, 
    lastUpdated: { type: Date, default: Date.now }
});

export default mongoose.model('PixelBoard', pixelBoardSchema);