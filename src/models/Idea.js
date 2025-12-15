import mongoose from 'mongoose';

const ideaSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    username: { type: String, required: true },
    avatar: { type: String }, // Чтобы красиво отображать в админке
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, required: true, maxlength: 2000 },
    status: { 
        type: String, 
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'IMPLEMENTED'], 
        default: 'PENDING' 
    },
    adminComment: { type: String, default: null }
}, { timestamps: true });

export default mongoose.model('Idea', ideaSchema);