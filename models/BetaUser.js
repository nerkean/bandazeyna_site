import mongoose from 'mongoose';

const betaUserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // В реальном продакшене пароли хешируют, но для беты сойдет и так
    assignedToDiscordId: { type: String, default: null }, // Кому выдали (для админов)
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('BetaUser', betaUserSchema);