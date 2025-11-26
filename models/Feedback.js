import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    username: { type: String, required: true },
    
    // Новые поля для детальной оценки
    ratings: {
        design: { type: Number, required: true, min: 1, max: 5 },
        tech:   { type: Number, required: true, min: 1, max: 5 },
        idea:   { type: Number, required: true, min: 1, max: 5 }
    },
    
    comment: { type: String, required: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Feedback', feedbackSchema);