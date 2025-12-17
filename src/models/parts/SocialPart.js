import mongoose from 'mongoose';

// === СХЕМЫ СОЦИАЛКИ ===

const profileCommentSchema = new mongoose.Schema({
    authorId: { type: String, required: true },
    authorUsername: { type: String, required: true },
    authorAvatar: String,
    comment: { type: String, required: true, maxlength: 250 },
    timestamp: { type: Date, default: Date.now },
}, { _id: false });

// === МЕТОДЫ (Пока пустые, но можно добавить методы брака сюда в будущем) ===
export const attachSocialMethods = (userProfileSchema) => {
    // Например: user.marry(targetId)
};

export {
    profileCommentSchema
};