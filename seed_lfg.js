import mongoose from 'mongoose';
import 'dotenv/config'; 

// ==========================================
// 1. НАСТРОЙКИ
// ==========================================
const COUNT = 30; // Количество заявок

// Схема точь-в-точь как в твоем файле TeammateRequest.js
const schema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    avatar: { type: String },
    activityType: { 
        type: String, 
        enum: ['MACRO', 'FARM', 'STICKERS', 'PUFFSHROOMS', 'ROBO', 'OTHER'], 
        required: true 
    },
    hiveColor: { type: String, enum: ['BLUE', 'RED', 'WHITE', 'MIXED'], default: 'MIXED' },
    description: { type: String, maxlength: 100 },
    createdAt: { type: Date, default: Date.now, expires: 1800 } 
});

// Подключаем модель
const TeammateRequest = mongoose.models.TeammateRequest || mongoose.model('TeammateRequest', schema);

// ==========================================
// 2. ДАННЫЕ (Фейковые игроки)
// ==========================================
const nicknames = [
    "BeeMaster_99", "HoneyChad", "StickBugLover", "ViciousBeeFan", 
    "RobloxKing_RU", "ZeynFan_1", "GummySoldier", "WindyBeeMaster", 
    "CoconutCrabKiller", "PolarBearHelper", "OnettFanboy", "BlueHivePro",
    "RedHiveBaron", "MixedHiveGod", "MacroBot_X", "StickerTrader_RU",
    "PuffHunter_2025", "RoboChallengeChamp", "NoobSlayer_XX", "BeeSwarmGuide"
];

// Реальные ссылки на аватарки Roblox (чтобы красиво смотрелось)
const avatars = [
    "https://tr.rbxcdn.com/30cda0492b952f741d248b9487570220/150/150/AvatarHeadshot/Png",
    "https://tr.rbxcdn.com/56722217d05741e17ba9052733979434/150/150/AvatarHeadshot/Png",
    "https://tr.rbxcdn.com/1520199f64c029df39db902b3707e472/150/150/AvatarHeadshot/Png",
    "https://tr.rbxcdn.com/04889c45050302302450596395270272/150/150/AvatarHeadshot/Png",
    "https://tr.rbxcdn.com/537d7c67222567207606367375276326/150/150/AvatarHeadshot/Png",
    "/assets/img/avatars/default_avatar.png"
];

const descriptions = {
    MACRO: [
        "Ищу +1 на Pine Tree, нужен линк токен",
        "Макро на клубнике, нужен синий улей для бафов",
        "Стою афк на кактусе, залетайте ради богатства",
        "Фармлю мед 24/7, нужен напарник с Fuzzy Bee",
        "Pine Tree макро, нужен Tadpole альт"
    ],
    FARM: [
        "Нужна помощь с Snowbear 20 уровня, срочно!",
        "Фармим муравьев, ищу фулл пати для рекорда",
        "Кто поможет убить улику? У меня мало дамага",
        "Собираем пати на метеоритный дождь, нужен мифик",
        "Фарм Mondo Chick, спавн через 5 минут"
    ],
    STICKERS: [
        "Трейжу Simple Sun на Star Sign, пишите в дс",
        "Ищу стикеры с утками, дам дорого (ваучеры)",
        "Нужен Cluster, обмен в лс, есть много редких",
        "Раздаю ненужные стикеры новичкам на спавне",
        "Ищу Hidden Sticker в хабе, нужна помощь"
    ],
    PUFFSHROOMS: [
        "Ищу пати на пуфы, нужен 15+ лвл улья",
        "Dapper Bear квест, нужны редкие пуфы на Pine",
        "Сбор на пуфы через 10 минут, есть Planter of Plenty",
        "Помогите добить легендарный пуф, осталось 1к хп!",
        "Фарм пуфов в Rose Field, заходите"
    ],
    ROBO: [
        "Robo Challenge, ищу напарника для бафов",
        "Нужна помощь с прохождением раунда 10",
        "Фарм шестеренок (Cogs), нужен красный улей",
        "Тестируем стратегии на Robo Bear",
        "Помогите пройти 5 раунд, я нуб"
    ],
    OTHER: [
        "Просто ищу друзей для общения в дискорде",
        "Кто в войс? Скучно одному играть",
        "Оцениваю ульи, пишите в лс скриншоты",
        "Есть вопрос по механике SSA, хелп",
        "Ищу клан, активный игрок, 18 лвл улья"
    ]
};

const hiveColors = ['BLUE', 'RED', 'WHITE', 'MIXED'];
const types = ['MACRO', 'FARM', 'STICKERS', 'PUFFSHROOMS', 'ROBO', 'OTHER'];

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ==========================================
// 3. ЗАПУСК
// ==========================================
async function seed() {
    try {
        console.log('🔌 Подключение к MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Успешно!');

        // Очистка старых (раскомментируй, если хочешь удалить все старые заявки)
        // await TeammateRequest.deleteMany({});
        // console.log('🗑️ Старые заявки удалены');

        const newRequests = [];

        for (let i = 0; i < COUNT; i++) {
            const type = getRandom(types);
            // Берем описание подходящее под тип активности
            const descList = descriptions[type] || descriptions['OTHER'];
            
            // Генерируем время в прошлом (от 0 до 29 минут назад)
            // Чтобы таймер "X мин. назад" был реалистичным
            const timeOffset = Math.floor(Math.random() * 29 * 60 * 1000);
            const fakeTime = new Date(Date.now() - timeOffset);

            newRequests.push({
                userId: `fake_${Date.now()}_${i}`, // Уникальный ID
                username: getRandom(nicknames),
                avatar: getRandom(avatars),
                hiveColor: getRandom(hiveColors),
                activityType: type,
                description: getRandom(descList),
                createdAt: fakeTime
            });
        }

        await TeammateRequest.insertMany(newRequests);
        console.log(`🎉 Создано ${COUNT} заявок! Проверь страницу.`);

    } catch (e) {
        console.error('❌ Ошибка:', e);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Отключено');
        process.exit();
    }
}

seed();