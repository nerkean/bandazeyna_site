import mongoose from 'mongoose';
import 'dotenv/config'; // Подгрузит MONGODB_URI из .env
import Nomination from '../src/models/Nomination.js';

// --- УКАЖИ ID ПОЛЬЗОВАТЕЛЯ ЗДЕСЬ ИЛИ ПЕРЕДАЙ В ТЕРМИНАЛЕ ---
const targetVoterId = process.argv[2] || 'АЙДИ_ПОЛЬЗОВАТЕЛЯ';

async function checkUserVotes() {
    try {
        console.log(`\x1b[36m%s\x1b[0m`, `🔎 Проверка голосов пользователя: ${targetVoterId}`);
        
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Ищем все номинации, где есть голос от этого ID
        const nominations = await Nomination.find({
            "votes.voterId": targetVoterId
        }).lean();

        if (nominations.length === 0) {
            console.log('\x1b[31m%s\x1b[0m', '❌ Этот пользователь еще не голосовал ни в одной категории.');
            return;
        }

        console.log(`✅ Найдено голосов: ${nominations.length}\n`);

        nominations.forEach((nom, index) => {
            // Находим конкретный голос в массиве
            const vote = nom.votes.find(v => v.voterId === targetVoterId);
            // Находим кандидата, за которого был отдан голос
            const candidate = nom.candidates.find(c => c.userId === vote.candidateId);

            console.log(`${index + 1}. [${nom.title}]`);
            if (candidate) {
                console.log(`   └─ Выбор: \x1b[32m${candidate.username}\x1b[0m (${candidate.userId})`);
            } else {
                console.log(`   └─ Выбор: \x1b[33mКандидат не найден в списке (возможно удален)\x1b[0m ID: ${vote.candidateId}`);
            }
            console.log('-----------------------------------');
        });

    } catch (err) {
        console.error('Ошибка:', err);
    } finally {
        await mongoose.disconnect();
    }
}

if (targetVoterId === 'АЙДИ_ПОЛЬЗОВАТЕЛЯ' && !process.argv[2]) {
    console.log('Использование: node scripts/check-user.js <ID_ПОЛЬЗОВАТЕЛЯ>');
} else {
    checkUserVotes();
}