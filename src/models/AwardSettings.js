import mongoose from 'mongoose';

const awardSettingsSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    isPublicVote: { type: Boolean, default: false }
});

export default mongoose.model('AwardSettings', awardSettingsSchema);