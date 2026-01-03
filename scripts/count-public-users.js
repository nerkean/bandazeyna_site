import 'dotenv/config';
import mongoose from 'mongoose';
import AwardSettings from '../src/models/AwardSettings.js';
import Nomination from '../src/models/Nomination.js';

async function getStats() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Подключение к БД установлено");

        // 1. Считаем тех, кто включил публичность
        const publicCount = await AwardSettings.countDocuments({ isPublicVote: true });
        
        // 2. Считаем тех, кто заходил в настройки и оставил их анонимными
        const settingsCount = await AwardSettings.countDocuments();
        const explicitAnonymous = settingsCount - publicCount;

        // 3. Считаем всех реально проголосовавших пользователей
        // Собираем все voterId из всех номинаций
        const nominations = await Nomination.find({}, 'votes.voterId');
        const allVoterIds = nominations.flatMap(n => n.votes.map(v => v.voterId));
        
        // Используем Set, чтобы оставить только уникальные ID
        const uniqueVotersCount = new Set(allVoterIds).size;

        console.log("\n====================================");
        console.log("   📊 СТАТИСТИКА DACHA AWARDS 2025");
        console.log("====================================");
        console.log(`👥 Всего проголосовало:      ${uniqueVotersCount} чел.`);
        console.log("------------------------------------");
        console.log(`🔊 Публичных профилей:      ${publicCount}`);
        console.log(`🔒 Анонимных профилей:      ${uniqueVotersCount - publicCount}`);
        console.log("------------------------------------");
        console.log(`⚙️ Настраивали приватность:  ${settingsCount}`);
        console.log("====================================\n");

    } catch (err) {
        console.error("❌ Ошибка при сборе статистики:", err);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

getStats();