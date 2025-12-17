import mongoose from 'mongoose';

const AdminLogSchema = new mongoose.Schema({
    adminId: { type: String, required: true },
    adminName: { type: String, required: true }, // Чтобы не искать ник по ID каждый раз
    action: { type: String, required: true },    // 'CREATE', 'UPDATE', 'DELETE'
    entity: { type: String, default: 'Wiki' },   // Что меняли (Wiki, User, Item)
    targetTitle: { type: String },               // Название статьи
    details: { type: String },                   // Доп. инфо (например "Скрыл статью")
    timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('AdminLog', AdminLogSchema);