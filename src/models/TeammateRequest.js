import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    userId: { type: String, required: true },
    username: { type: String, required: true },
    avatar: { type: String },
    activityType: { 
        type: String, 
        enum: ['MACRO', 'FARM', 'STICKERS', 'PUFFSHROOMS', 'ROBO', 'OTHER'], 
        required: true 
    },
    hiveColor: { type: String, enum: ['BLUE', 'RED', 'WHITE', 'MIXED'], default: 'MIXED' },
    description: { type: String, maxlength: 100 },
    createdAt: { type: Date, default: Date.now, expires: 1800 } 
});

schema.index({ userId: 1 }, { unique: true }); 

export default mongoose.model('TeammateRequest', schema);