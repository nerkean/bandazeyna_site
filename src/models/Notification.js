import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    userId: { type: String, required: true, index: true }, // Кому уведомление
    type: { type: String, enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR'], default: 'INFO' },
    message: { type: String, required: true },
    link: { type: String }, // Ссылка, куда перекинет при клике (например /profile/123)
    read: { type: Boolean, default: false }, // Прочитано или нет
    createdAt: { type: Date, default: Date.now, expires: 604800 } // Удалять через 7 дней (автоочистка)
});

export default mongoose.model('Notification', schema);