import mongoose from 'mongoose';

const nominationSchema = new mongoose.Schema({
    title: { type: String, required: true }, // Название: "Лучший трейдер", "Душа компании"
    description: { type: String },           // Описание номинации
    category: { type: String, default: 'Common' }, // Для стилизации (например, 'Gold', 'Special')
    candidates: [{
        userId: String,     // Discord ID
        username: String,
        avatar: String,
        description: String // Почему именно он? (опционально)
    }],
    votes: [{
        voterId: String,    // Кто проголосовал
        candidateId: String // За кого (userId)
    }],
    isActive: { type: Boolean, default: true },
    endDate: { type: Date } // Когда закончится голосование
});

export default mongoose.model('Nomination', nominationSchema);