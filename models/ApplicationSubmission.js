import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
    discordUsername: { type: String, required: true }, // Ник в дискорде
    uid: { type: String, required: true }, // ID пользователя (для проверки)
    reason: { type: String, required: true }, // Почему хочет в бету
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('ApplicationSubmission', applicationSchema);