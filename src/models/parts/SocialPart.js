import mongoose from 'mongoose';

const profileCommentSchema = new mongoose.Schema({
    authorId: { type: String, required: true },
    authorUsername: { type: String, required: true },
    authorAvatar: String,
    comment: { type: String, required: true, maxlength: 250 },
    timestamp: { type: Date, default: Date.now },
}, { _id: false });

export const attachSocialMethods = (userProfileSchema) => {
};

export {
    profileCommentSchema
};