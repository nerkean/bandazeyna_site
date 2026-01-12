import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String }, 
    minecraftNick: { type: String, required: true }, 
    createdAt: { type: Date, default: Date.now }
});

const MinecraftParticipant = mongoose.model('MinecraftParticipant', schema);

export default MinecraftParticipant;