// routes/pages.js
import express from 'express';
import UserProfile from '../models/UserProfile.js';
import Stock from '../models/Stock.js';
import StockPriceHistory from '../models/StockPriceHistory.js';
import { checkAuth } from '../middleware/checkAuth.js';
import { getShopItems, getItemDefinition } from '../utils/itemDefinitions.js';
import { getQuestDefinition } from '../utils/questDefinitions.js';
import { getAchievementDefinition } from '../utils/achievementDefinitions.js';
import ApplicationSubmission from '../models/ApplicationSubmission.js';

const router = express.Router();

// Главная
router.get('/', async (req, res) => {
    try {
        const totalUsers = await UserProfile.countDocuments({ guildId: process.env.GUILD_ID });
        const economyStats = await UserProfile.aggregate([
            { $match: { guildId: process.env.GUILD_ID } },
            { $group: { _id: null, totalStars: { $sum: "$stars" } } }
        ]);

        const stats = { users: totalUsers, stars: economyStats[0]?.totalStars || 0 };
        const topStock = await Stock.findOne({}).sort({ lastChange: -1 }).lean();
        
        let myProfile = null;
        if (req.user) {
            myProfile = await UserProfile.findOne({ userId: req.user.id, guildId: process.env.GUILD_ID }).lean();
        }

        res.render('index', { 
            user: req.user, stats, title: 'Главная | MyServerBot',
            heroStock: topStock || { ticker: 'INDEX', lastChange: 0, currentPrice: 100 },
            myProfile
        });
    } catch (e) {
        console.error(e);
        res.render('index', { user: req.user, stats: { users: 0, stars: 0 }, heroStock: {}, myProfile: null });
    }
});

router.get('/profile', checkAuth, async (req, res) => {
    try {
        // --- ИСПРАВЛЕНИЕ: Добавлено .lean() ---
        const userProfile = await UserProfile.findOne({ userId: req.user.id, guildId: process.env.GUILD_ID }).lean();
        
        if (!userProfile) return res.render('error', { message: "Профиль не найден." });

        const stocks = await Stock.find({}).lean();
        const stockMap = new Map(stocks.map(s => [s.ticker, s.currentPrice]));
        
        let portfolioValue = 0;
        let portfolioDetails = [];
        if (userProfile.portfolio) {
            portfolioDetails = userProfile.portfolio.map(p => {
                const currentPrice = stockMap.get(p.ticker) || 0;
                const value = p.quantity * currentPrice;
                portfolioValue += value;
                // Теперь ...p сработает корректно, так как объект "чистый" (JSON)
                return { ...p, currentPrice, value };
            });
        }

        // Логика квестов
        const enrichedQuests = (userProfile.activeQuests || []).map(q => ({
            ...q, 
            details: getQuestDefinition(q.questId) || { name: q.questId }
        }));
        
        // Логика достижений
        const enrichedAchievements = (userProfile.achievements || []).map(ach => ({
            ...ach, 
            details: getAchievementDefinition(ach.achievementId) || { medalEmoji: '🏅' }
        }));

        let frameUrl = null;
        if (userProfile.activeAvatarFrameId) {
            const frameDef = getItemDefinition(userProfile.activeAvatarFrameId);
            if (frameDef?.imageUrl_web) frameUrl = frameDef.imageUrl_web;
        }

        let partnerName = "Нет";
        if (userProfile.marriedTo) {
            const partner = await UserProfile.findOne({ userId: userProfile.marriedTo }).lean();
            partnerName = partner ? partner.username : "Неизвестно";
        }

        // Создаем targetUser для совместимости с шаблоном
        const targetUser = {
            id: req.user.id,
            username: req.user.username,
            avatar: req.user.avatar
        };

        res.render('profile', { 
            user: req.user,          
            targetUser: targetUser,  
            profile: userProfile, 
            isOwner: true,           
            partnerName,
            netWorth: userProfile.stars + portfolioValue,
            portfolioValue, portfolioDetails, activeFrameUrl: frameUrl,
            quests: enrichedQuests, achievements: enrichedAchievements
        });
    } catch (e) {
        console.error(e);
        res.status(500).send("Ошибка загрузки профиля");
    }
});

// 2. Публичный профиль (исправленный)
router.get('/profile/:userId', async (req, res) => {
    try {
        const targetId = req.params.userId;
        
const profile = await UserProfile.findOne({ userId: targetId, guildId: process.env.GUILD_ID }).lean();
        
        if (!profile) {
            return res.status(404).render('error', { 
                message: 'Профиль не найден', 
                user: req.user // Для навбара
            });
        }

        // 2. Определяем, кто смотрит
        const viewer = req.user; // Тот, кто залогинен в браузере
        const isOwner = viewer && viewer.id === targetId;

        // 3. Собираем данные TARGET USER (Чей профиль)
        // ХАК: Если мы смотрим свой же профиль, берем аватар из сессии (он свежий). 
        // Если чужой - берем из базы (надеемся, что бот его сохранил).
        const targetUser = {
            id: profile.userId,
            username: (isOwner ? viewer.username : profile.username) || 'Неизвестный',
            avatar: (isOwner ? viewer.avatar : profile.avatar) || null
        };

        // 4. РАСЧЕТ ЭКОНОМИКИ (То, чего не хватало)
        const stocks = await Stock.find({}).lean();
        const stockMap = new Map(stocks.map(s => [s.ticker, s.currentPrice]));
        
        let portfolioValue = 0;
        let portfolioDetails = [];
        if (profile.portfolio) {
            portfolioDetails = profile.portfolio.map(p => {
                const currentPrice = stockMap.get(p.ticker) || 0;
                const value = p.quantity * currentPrice;
                portfolioValue += value;
                return { ...p, currentPrice, value };
            });
        }
        const netWorth = profile.stars + portfolioValue;

        // 5. КВЕСТЫ И ДОСТИЖЕНИЯ (То, что пропало)
        const quests = (profile.activeQuests || []).map(q => ({
            ...q.toObject ? q.toObject() : q, 
            details: getQuestDefinition(q.questId) || { name: q.questId, description: '...' }
        }));

        const achievements = (profile.achievements || []).map(ach => ({
            ...ach.toObject ? ach.toObject() : ach, 
            details: getAchievementDefinition(ach.achievementId) || { medalEmoji: '🏅', name: ach.achievementId, description: '...' }
        }));

        // 6. СЕМЬЯ
        let partnerName = "Нет";
        if (profile.marriedTo) {
            const partner = await UserProfile.findOne({ userId: profile.marriedTo });
            partnerName = partner ? partner.username : "Неизвестно";
        }

        // 7. РЕНДЕР
        res.render('profile', {
            user: viewer,       // Кто смотрит (для Навбара)
            targetUser: targetUser, // Чей профиль (для Шапки)
            profile: profile,   // Данные БД
            isOwner: isOwner,   // Владелец ли это?
            
            // Восстановленные данные:
            portfolioValue,
            netWorth,
            portfolioDetails,
            quests,
            achievements,
            partnerName
        });

    } catch (e) {
        console.error(e);
        res.status(500).send('Ошибка сервера при загрузке профиля');
    }
});

router.get('/market', checkAuth, async (req, res) => {
    try {
        // 1. Получаем список акций
        const stocks = await Stock.find({}).sort({ currentPrice: -1 }).lean();

        // 2. (НОВОЕ) Подгружаем полную историю цен для каждой акции
        // Мы используем Promise.all, чтобы запросы шли параллельно (быстро)
        await Promise.all(stocks.map(async (stock) => {
            // Ищем все записи в истории для этого тикера
            const fullHistory = await StockPriceHistory.find({ ticker: stock.ticker })
                                                       .select('date price -_id') // берем только дату и цену
                                                       .sort({ date: 1 })         // сортируем от старых к новым
                                                       .lean();
            
            // Если история нашлась, подменяем ей текущий короткий массив
            if (fullHistory.length > 0) {
                stock.priceHistory = fullHistory;
            }
        }));

        // 3. Получаем портфель пользователя
        let userPortfolio = [];
        if (req.user) {
            const p = await UserProfile.findOne({ userId: req.user.id, guildId: process.env.GUILD_ID });
            if (p) userPortfolio = p.portfolio || [];
        }

        res.render('market', { user: req.user, stocks, portfolio: userPortfolio });
    } catch (e) {
        console.error("Ошибка загрузки рынка:", e);
        res.status(500).send("Ошибка рынка");
    }
});

// Лидерборд (с подсчетом моего ранга)
router.get('/leaderboard', async (req, res) => {
    try {
        const sortType = req.query.sort || 'stars';
        const period = req.query.period || 'all'; // Для messages/voice
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        let dbField = 'stars';
        let title = 'Топ богачей';
        let valueSuffix = '⭐';

        const map = {
            'stars': ['stars', 'Топ богачей', '⭐'],
            'rep': ['reputation', 'Самые уважаемые', '👍'],
            'messages': ['totalMessages', 'Топ писателей', 'сообщ.'], // Или messagesLast7Days и т.д. в зависимости от period
            'voice': ['totalVoiceTime', 'Топ говорунов', 'мин.']
        };
        
        // Логика выбора поля в зависимости от периода (если нужно)
        if (sortType === 'messages') {
            if (period === '1d') dbField = 'messagesToday';
            else if (period === '7d') dbField = 'messagesLast7Days';
            else if (period === '30d') dbField = 'messagesLast30Days';
            else dbField = 'totalMessages';
            title = 'Топ писателей'; valueSuffix = 'сообщ.';
        } else if (sortType === 'voice') {
            if (period === '1d') dbField = 'voiceTimeToday';
            else if (period === '7d') dbField = 'voiceLast7Days';
            else if (period === '30d') dbField = 'voiceLast30Days';
            else dbField = 'totalVoiceTime';
            title = 'Топ говорунов'; valueSuffix = 'мин.';
        } else if (map[sortType]) {
            [dbField, title, valueSuffix] = map[sortType];
        }

        const filter = { guildId: process.env.GUILD_ID, [dbField]: { $gt: 0 } };
        const totalPlayers = await UserProfile.countDocuments(filter);
        
        // Топ игроков
        const leaders = await UserProfile.find(filter)
            .sort({ [dbField]: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // --- ЛОГИКА ПОИСКА МОЕГО РАНГА ---
        let myRank = null;
        let myValue = null;

        if (req.user) {
            // 1. Получаем мой профиль
            const myProfile = await UserProfile.findOne({ userId: req.user.id, guildId: process.env.GUILD_ID }).lean();
            
            if (myProfile) {
                const myScore = myProfile[dbField] || 0;
                myValue = (sortType === 'voice') ? Math.round(myScore / 60) : myScore.toLocaleString(); // Форматируем

                // 2. Считаем сколько людей имеют больше очков, чем я
                const countBetter = await UserProfile.countDocuments({ 
                    guildId: process.env.GUILD_ID, 
                    [dbField]: { $gt: myScore } 
                });
                myRank = countBetter + 1;
            }
        }

        res.render('leaderboard', {
            user: req.user, leaders, sortType, period,
            title, dbField, valueSuffix, 
            formatVoice: (sec) => Math.round(sec / 60),
            currentPage: page, totalPages: Math.ceil(totalPlayers / limit), startRank: skip + 1,
            
            // Передаем данные о моем ранге
            myRank, myValue
        });

    } catch (e) {
        console.error("LB Error:", e);
        res.status(500).send("Ошибка топа");
    }
});

router.get('/admin/applications', checkAuth, async (req, res) => {
    // ПРОВЕРКА: Разрешаем только конкретным ID (замени на свой ID)
    const ADMIN_IDS = ['438744415734071297']; 
    if (!ADMIN_IDS.includes(req.user.id)) return res.redirect('/');

    try {
        // Берем все заявки, новые сверху
        const apps = await ApplicationSubmission.find().sort({ createdAt: -1 }).lean();
        
        res.render('admin-applications', { applications: apps });
    } catch (e) {
        console.error(e);
        res.send("Ошибка");
    }
});

// Магазин
router.get('/shop', checkAuth, async (req, res) => {
    try {
        const profile = await UserProfile.findOne({ userId: req.user.id, guildId: process.env.GUILD_ID });
        res.render('shop', {
            user: req.user, profile: profile || { stars: 0 }, items: getShopItems()
        });
    } catch (e) {
        console.error(e);
        res.status(500).send("Ошибка магазина");
    }
});

// Инвентарь
router.get('/inventory', checkAuth, async (req, res) => {
    try {
        const userProfile = await UserProfile.findOne({ userId: req.user.id, guildId: process.env.GUILD_ID });
        if (!userProfile) return res.redirect('/');

        const enrichedInventory = userProfile.inventory.map(slot => ({
            ...slot.toObject(),
            details: getItemDefinition(slot.itemId) || { name: '?', emoji: '❓' }
        }));

        res.render('inventory', { user: req.user, profile: userProfile, inventory: enrichedInventory });
    } catch (e) {
        console.error(e);
        res.status(500).send("Ошибка инвентаря");
    }
});

// О боте
router.get('/bot', async (req, res) => {
    const totalUsers = await UserProfile.countDocuments({ guildId: process.env.GUILD_ID });
    res.render('bot', { user: req.user, title: 'О Боте', stats: { users: totalUsers } });
});

export default router;