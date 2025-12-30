import mongoose from 'mongoose';

const nominationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String, default: 'Common' },
    origin: { 
        type: String, 
        enum: ['staff', 'member'], 
        default: 'staff',
        required: true 
    },
    candidates: [{
        userId: String,
        username: String,
        avatar: String,
        description: String
    }],
    votes: [{
        voterId: String,
        candidateId: String
    }],
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    endDate: { type: Date }
});

export default mongoose.model('Nomination', nominationSchema);