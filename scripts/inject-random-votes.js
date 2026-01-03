import 'dotenv/config';
import mongoose from 'mongoose';
import UserProfile from '../src/models/UserProfile.js';
import Nomination from '../src/models/Nomination.js';

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Подключено к базе данных");

        const testUsersCount = 9;
        const testUserIds = [];

        // 1. Создаем или находим 5 тестовых пользователей
        for (let i = 1; i <= testUsersCount; i++) {
            const username = `test${i}`;
            const fakeId = `77700000000000000${i}`; // Фейковый ID
            
            await UserProfile.findOneAndUpdate(
                { userId: fakeId },
                { 
                    username, 
                    guildId: process.env.GUILD_ID,
                    stars: 500,
                    joinedAt: new Date('2025-11-01')
                },
                { upsert: true }
            );
            testUserIds.push(fakeId);
        }
        console.log(`👤 Тестовые пользователи (test1-test5) готовы.`);

        /**
         * Функция вставки голосов в случайные места
         * @param {string} nomTitle - Название номинации (например, 'МОНАРХ ГОДА')
         * @param {string} targetCandidateId - ID за кого голосуем
         */
        async function injectVotes(nomTitle, targetCandidateId) {
            const nomination = await Nomination.findOne({ title: nomTitle });
            if (!nomination) return console.log(`❌ Номинация "${nomTitle}" не найдена`);

            console.log(`🗳️ Текущих голосов в "${nomTitle}": ${nomination.votes.length}`);

            for (const voterId of testUserIds) {
                // Проверяем, не голосовал ли уже этот бот
                if (nomination.votes.some(v => v.voterId === voterId)) continue;

                const newVote = {
                    voterId: voterId,
                    candidateId: targetCandidateId
                };

                // Генерируем случайный индекс в текущем массиве голосов
                const randomIndex = Math.floor(Math.random() * (nomination.votes.length + 1));
                
                // Вставляем голос в "рандомное место"
                nomination.votes.splice(randomIndex, 0, newVote);
            }

            await nomination.save();
            console.log(`✨ 5 голосов успешно внедрены в случайные позиции списка!`);
        }

        // --- ПРИМЕР ЗАПУСКА ---
        // Замени 'ID_КАНДИДАТА' на реальный Discord ID человека
        await injectVotes('ЛУЧШИЙ СТАФФ', '438744415734071297'); 
        // ----------------------

    } catch (err) {
        console.error("❌ Ошибка:", err);
    } finally {
        // Раскомментируй для авто-выхода
        // mongoose.connection.close();
    }
}

run();