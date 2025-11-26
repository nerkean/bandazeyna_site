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
import Feedback from '../models/Feedback.js';

const router = express.Router();

// Главная
router.get('/', async (req, res) => {
    try {
        const totalUsers = await UserProfile.estimatedDocumentCount({ guildId: process.env.GUILD_ID });
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
        const userProfile = await UserProfile.findOne({ userId: req.user.id, guildId: process.env.GUILD_ID }).lean();
        if (!userProfile) return res.render('error', { message: "Профиль не найден." });

        // --- ОБОГАЩЕНИЕ ИНВЕНТАРЯ (НОВОЕ) ---
        if (userProfile.inventory) {
            userProfile.inventory = userProfile.inventory.map(slot => {
                const def = getItemDefinition(slot.itemId);
                return { 
                    ...slot, 
                    details: def || { name: slot.itemId, emoji: '📦', description: 'Неизвестный предмет' } 
                };
            });
        }

        const stocks = await Stock.find({}).lean();
        const stockMap = new Map(stocks.map(s => [s.ticker, s.currentPrice]));
        
        let portfolioValue = 0;
        let portfolioDetails = [];
        if (userProfile.portfolio) {
            portfolioDetails = userProfile.portfolio.map(p => {
                const currentPrice = stockMap.get(p.ticker) || 0;
                const value = p.quantity * currentPrice;
                portfolioValue += value;
                return { ...p, currentPrice, value };
            });
        }

        // Квесты и Достижения
        const enrichedQuests = (userProfile.activeQuests || []).map(q => ({
            ...q, details: getQuestDefinition(q.questId) || { name: q.questId }
        }));
        const enrichedAchievements = (userProfile.achievements || []).map(ach => ({
            ...ach, details: getAchievementDefinition(ach.achievementId) || { medalEmoji: '🏅' }
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

        const targetUser = {
            id: req.user.id,
            username: req.user.username,
            avatar: req.user.avatar
        };

        res.render('profile', { 
            user: req.user, targetUser, profile: userProfile, isOwner: true, partnerName,
            netWorth: userProfile.stars + portfolioValue,
            portfolioValue, portfolioDetails, activeFrameUrl: frameUrl,
            quests: enrichedQuests, achievements: enrichedAchievements
        });
    } catch (e) {
        console.error(e);
        res.status(500).send("Ошибка загрузки профиля");
    }
});

router.get('/profile/:userId', async (req, res) => {
    try {
        const targetId = req.params.userId;
        const profile = await UserProfile.findOne({ userId: targetId, guildId: process.env.GUILD_ID }).lean();
        
        if (!profile) {
            return res.status(404).render('error', { message: 'Профиль не найден', user: req.user });
        }

        // --- ОБОГАЩЕНИЕ ИНВЕНТАРЯ (НОВОЕ) ---
        if (profile.inventory) {
            profile.inventory = profile.inventory.map(slot => {
                const def = getItemDefinition(slot.itemId);
                return { 
                    ...slot, 
                    details: def || { name: slot.itemId, emoji: '📦', description: 'Неизвестный предмет' } 
                };
            });
        }

        const viewer = req.user; 
        const isOwner = viewer && viewer.id === targetId;

        const targetUser = {
            id: profile.userId,
            username: (isOwner ? viewer.username : profile.username) || 'Неизвестный',
            avatar: (isOwner ? viewer.avatar : profile.avatar) || null
        };

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

        const quests = (profile.activeQuests || []).map(q => ({
            ...q, details: getQuestDefinition(q.questId) || { name: q.questId, description: '...' }
        }));

        const achievements = (profile.achievements || []).map(ach => ({
            ...ach, details: getAchievementDefinition(ach.achievementId) || { medalEmoji: '🏅', name: ach.achievementId }
        }));

        let partnerName = "Нет";
        if (profile.marriedTo) {
            const partner = await UserProfile.findOne({ userId: profile.marriedTo }).lean();
            partnerName = partner ? partner.username : "Неизвестно";
        }

        res.render('profile', {
            user: viewer, targetUser, profile, isOwner,   
            portfolioValue, netWorth, portfolioDetails,
            quests, achievements, partnerName
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

// --- УМНЫЙ КЭШ (HTML + DATA) ---
const lbCache = {
    html: null,       // Готовая HTML страница для гостей
    lastHtmlUpdate: 0,// Время последнего обновления HTML
    data: new Map(),  // Данные для авторизованных юзеров
    ttl: 60 * 1000    // 1 минута жизни
};

router.get('/leaderboard', async (req, res) => {
    try {
        const sortType = req.query.sort || 'stars';
        const period = req.query.period || 'all';
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const now = Date.now();

        // 🚀 ТУРБО-РЕЖИМ ДЛЯ ГОСТЕЙ (Lighthouse)
        // Если пользователь не вошел и параметры стандартные — отдаем готовый HTML
        // Это обходит EJS рендеринг полностью = 5-10ms TTFB
        if (!req.user && sortType === 'stars' && page === 1 && lbCache.html && (now - lbCache.lastHtmlUpdate < lbCache.ttl)) {
            // console.log('🚀 Serving cached HTML'); // Можно раскомментировать для проверки
            return res.send(lbCache.html);
        }

        // --- ПОДГОТОВКА ДАННЫХ (Как раньше, но теперь используем это для генерации кэша) ---
        
        // Ключ для кэша данных (для авторизованных или других страниц)
        const cacheKey = `${sortType}_${period}_${page}`;
        
        let viewData = null;

        // Проверяем кэш данных (Data Cache)
        if (lbCache.data.has(cacheKey)) {
            const cached = lbCache.data.get(cacheKey);
            if (now - cached.timestamp < lbCache.ttl) {
                viewData = cached.payload;
            }
        }

        // Если данных нет в памяти — идем в базу
        if (!viewData) {
            let dbField = 'stars';
            let valueSuffix = '⭐';

            if (sortType === 'messages') {
                dbField = period === 'all' ? 'totalMessages' : 
                          (period === '1d' ? 'messagesToday' : 
                          (period === '7d' ? 'messagesLast7Days' : 'messagesLast30Days'));
                valueSuffix = 'сообщ.';
            } else if (sortType === 'voice') {
                dbField = period === 'all' ? 'totalVoiceTime' : 
                          (period === '1d' ? 'voiceTimeToday' : 
                          (period === '7d' ? 'voiceLast7Days' : 'voiceLast30Days'));
                valueSuffix = '';
            } else if (sortType === 'rep') {
                dbField = 'reputation';
                valueSuffix = 'реп.';
            }

            // Запросы к БД
            const [leaders, totalPlayers] = await Promise.all([
                UserProfile.find({ [dbField]: { $gt: 0 } })
                    .sort({ [dbField]: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .select(`userId username avatar activeTitle ${dbField}`)
                    .lean(),
                UserProfile.estimatedDocumentCount() 
            ]);

            viewData = { leaders, totalPages: Math.ceil(totalPlayers / limit), dbField, valueSuffix };

            // Сохраняем данные
            lbCache.data.set(cacheKey, { timestamp: now, payload: viewData });
        }

        // Персональные данные
        let myRank = null;
        let myValue = 0;
        const formatVoice = (seconds) => {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            return `${h}ч ${m}м`;
        };

        if (req.user) {
            const myProfile = await UserProfile.findOne({ userId: req.user.id }).select(viewData.dbField).lean();
            if (myProfile) {
                myValue = myProfile[viewData.dbField];
                if (sortType === 'voice') myValue = formatVoice(myValue);
                else if (sortType === 'stars') myValue = Math.floor(myValue).toLocaleString();
                myRank = await UserProfile.countDocuments({ [viewData.dbField]: { $gt: myProfile[viewData.dbField] } }) + 1;
            }
        }

        // 🔥 РЕНДЕРИНГ И СОХРАНЕНИЕ HTML 🔥
        // Мы используем res.render с колбэком, чтобы получить HTML строку
        res.render('leaderboard', {
            user: req.user,
            profile: req.user ? await UserProfile.findOne({ userId: req.user.id }).select('stars shards').lean() : null,
            leaders: viewData.leaders,
            totalPages: viewData.totalPages,
            dbField: viewData.dbField,
            valueSuffix: viewData.valueSuffix,
            currentPage: page,
            sortType,
            period,
            startRank: (page - 1) * limit + 1,
            myRank,
            myValue,
            formatVoice
        }, (err, html) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error rendering');
            }

            // Если это стандартный запрос гостя — сохраняем HTML в кэш!
            if (!req.user && sortType === 'stars' && page === 1) {
                lbCache.html = html;
                lbCache.lastHtmlUpdate = now;
            }

            res.send(html);
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Ошибка сервера');
    }
});

router.get('/feedback', checkAuth, (req, res) => {
    res.render('feedback', { 
        user: req.user,
        profile: null // или подгрузи профиль, если нужно в навбаре
    });
});

router.get('/admin', checkAuth, async (req, res) => {
    const ADMIN_IDS = ['438744415734071297']; // Твой ID
    if (!ADMIN_IDS.includes(req.user.id)) return res.redirect('/');

    try {
        // Грузим и заявки, и отзывы параллельно
        const [applications, feedbacks] = await Promise.all([
            ApplicationSubmission.find().sort({ createdAt: -1 }),
            Feedback.find().sort({ createdAt: -1 })
        ]);

        res.render('admin-applications', { 
            user: req.user, 
            applications: applications,
            feedbacks: feedbacks // <--- Передаем отзывы в шаблон
        });
    } catch (e) {
        console.error(e);
        res.status(500).send('Server Error');
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