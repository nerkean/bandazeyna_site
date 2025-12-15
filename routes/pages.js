import express from 'express';
import UserProfile from '../src/models/UserProfile.js';
import Stock from '../src/models/Stock.js';
import StockPriceHistory from '../src/models/StockPriceHistory.js';
import StockTransaction from '../src/models/StockTransaction.js';
import Deposit from '../src/models/Deposit.js';
import Article from '../src/models/Article.js';
import UserDailyStreak from '../src/models/UserDailyStreak.js';
import BanAppeal from '../src/models/BanAppeal.js';
import Idea from '../src/models/Idea.js';
import { checkAuth } from '../middleware/checkAuth.js';
import { getShopItems, getItemDefinition } from '../src/utils/definitions/itemDefinitions.js';
import { getQuestDefinition } from '../src/utils/definitions/questDefinitions.js';
import { getAchievementDefinition } from '../src/utils/definitions/achievementDefinitions.js';
import { dailyRewards } from '../src/utils/definitions/dailyRewardDefinitions.js';
import Giveaway from '../src/models/Giveaway.js'
import cache from '../src/utils/cache.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const statsCacheKey = 'home_stats';
        let stats = cache.get(statsCacheKey);

        if (!stats) {
            const totalUsers = await UserProfile.countDocuments({ guildId: process.env.GUILD_ID });
            const economyStats = await UserProfile.aggregate([
                { $match: { guildId: process.env.GUILD_ID } },
                { $group: { _id: null, totalStars: { $sum: "$stars" } } }
            ]);
            stats = { users: totalUsers, stars: economyStats[0]?.totalStars || 0 };
            cache.set(statsCacheKey, stats, 300);
        }

        const topStock = await Stock.findOne({}).sort({ lastChange: -1 }).lean();
        let myProfile = null;
        if (req.user) {
            myProfile = await UserProfile.findOne({ userId: req.user.id, guildId: process.env.GUILD_ID }).lean();
        }

        const jsonLD = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "Organization",
                    "name": "Дача Зейна",
                    "url": "https://dachazeyna.com",
                    "logo": "https://dachazeyna.com/assets/img/logo.png",
                    "sameAs": ["https://discord.gg/bandazeyna", "https://www.youtube.com/@ZeynBss"]
                },
                {
                    "@type": "WebSite",
                    "url": "https://dachazeyna.com",
                    "potentialAction": {
                        "@type": "SearchAction",
                        "target": "https://dachazeyna.com/leaderboard?q={search_term_string}",
                        "query-input": "required name=search_term_string"
                    }
                }
            ]
        };

        res.render('index', { 
            user: req.user, stats, title: 'Главная | Дача Зейна', 
            description: 'Добро пожаловать на Дачу Зейна! Крупнейшее сообщество по Bee Swarm Simulator с уникальной экономикой, биржей, ивентами и гайдами.',
            heroStock: topStock || { ticker: 'INDEX', lastChange: 0, currentPrice: 100 },
            myProfile, currentPath: '/', jsonLD 
        });
    } catch (e) { res.render('index', { user: req.user, stats: { users: 0, stars: 0 }, heroStock: {}, myProfile: null }); }
});

router.get('/wrapped', async (req, res) => {
    try {
        const cacheKey = 'wrapped_data_v5'; // Версия 5
        let wrappedData = cache.get(cacheKey);

        if (!wrappedData) {
            // 1. Глобальная статистика
            const globalAgg = await UserProfile.aggregate([{
                $group: {
                    _id: null,
                    totalMsgs: { $sum: "$totalMessages" },
                    totalVoice: { $sum: "$totalVoiceTime" },
                    totalMoney: { $sum: "$stars" },
                    totalShards: { $sum: "$shards" },
                    totalItems: { $sum: { $size: { $ifNull: ["$inventory", []] } } },
                    totalGhosts: { $sum: "$event_ghostsCaught" }
                }
            }]);

            const marketAgg = await StockTransaction.aggregate([{ $group: { _id: null, volume: { $sum: "$totalValue" }, trades: { $sum: 1 } } }]);

            // --- ЛОГИКА ДЛЯ ИМПЕРАТОРА (Net Worth) ---
            const allStocks = await Stock.find({}).lean();
            const priceMap = {};
            allStocks.forEach(s => priceMap[s.ticker] = s.currentPrice);

            const candidates = await UserProfile.find({
                $or: [{ stars: { $gt: 1000 } }, { 'portfolio.0': { $exists: true } }]
            }).select('username avatar userId stars portfolio').lean();

            let richestNet = { netWorth: 0, username: 'Никто', userId: null, avatar: null };

            candidates.forEach(user => {
                let stockValue = 0;
                if (user.portfolio && user.portfolio.length > 0) {
                    user.portfolio.forEach(p => {
                        const price = priceMap[p.ticker] || 0;
                        stockValue += p.quantity * price;
                    });
                }
                const totalNet = user.stars + stockValue;
                if (totalNet > richestNet.netWorth) {
                    richestNet = { ...user, netWorth: totalNet };
                }
            });

            // 2. Сбор Легенд
            const [
                richest,        // Богач (кэш)
                richestShards,  // Магнат Осколков
                chatty,         // Болтун
                voice,          // Голос
                taxPayer,       // Налогоплательщик
                reputation,     // Авторитет
                ghostHunter,    // Охотник
                streakerData,   // Данные стриккера (из отдельной коллекции)
                
                // Новые номинации:
                topCollectorAgg, // Коллекционер
                mostPopularAgg,  // Любимчик (по комментам)
                
                totalUsers
            ] = await Promise.all([
                UserProfile.findOne({ stars: { $gt: 0 } }).sort({ stars: -1 }).select('username avatar userId stars').lean(),
                UserProfile.findOne({ shards: { $gt: 0 } }).sort({ shards: -1 }).select('username avatar userId shards').lean(),
                UserProfile.findOne({ totalMessages: { $gt: 0 } }).sort({ totalMessages: -1 }).select('username avatar userId totalMessages').lean(),
                UserProfile.findOne({ totalVoiceTime: { $gt: 0 } }).sort({ totalVoiceTime: -1 }).select('username avatar userId totalVoiceTime').lean(),
                UserProfile.findOne({ totalStarsPaidInTax: { $gt: 0 } }).sort({ totalStarsPaidInTax: -1 }).select('username avatar userId totalStarsPaidInTax').lean(),
                UserProfile.findOne({ reputation: { $gt: 0 } }).sort({ reputation: -1 }).select('username avatar userId reputation').lean(),
                UserProfile.findOne({ event_ghostsCaught: { $gt: 0 } }).sort({ event_ghostsCaught: -1 }).select('username avatar userId event_ghostsCaught').lean(),
                UserDailyStreak.findOne({ currentStreak: { $gt: 0 } }).sort({ currentStreak: -1 }).lean(),
                
                // Коллекционер (длина инвентаря)
                UserProfile.aggregate([
                    { $project: { username: 1, avatar: 1, userId: 1, itemCount: { $size: { $ifNull: ["$inventory", []] } } } },
                    { $sort: { itemCount: -1 } },
                    { $limit: 1 }
                ]),

                // Любимчик (длина массива комментов)
                UserProfile.aggregate([
                    { $project: { username: 1, avatar: 1, userId: 1, commCount: { $size: { $ifNull: ["$profileComments", []] } } } },
                    { $sort: { commCount: -1 } },
                    { $limit: 1 }
                ]),

                UserProfile.countDocuments()
            ]);

            const topCollector = topCollectorAgg[0] || null;
            const topPopular = mostPopularAgg[0] || null;

            // Обработка Марафонца (Стриккера)
            let topStreaker = null;
            if (streakerData) {
                const u = await UserProfile.findOne({ userId: streakerData.userId }).select('username avatar userId').lean();
                if (u) topStreaker = { ...u, streak: streakerData.currentStreak };
            }

            // 3. Агрегация Трофи Хантера
            const topAchieverAgg = await UserProfile.aggregate([
                { $project: { username: 1, avatar: 1, userId: 1, achCount: { $size: "$achievements" } } },
                { $sort: { achCount: -1 } },
                { $limit: 1 }
            ]);
            const topAchiever = topAchieverAgg[0] || null;

            // 4. Трейдер Года
            const topTraderAgg = await StockTransaction.aggregate([
                { $group: { _id: "$userId", volume: { $sum: "$totalValue" } } },
                { $sort: { volume: -1 } }, { $limit: 1 }
            ]);
            let topTrader = null;
            if (topTraderAgg.length) {
                const u = await UserProfile.findOne({ userId: topTraderAgg[0]._id }).select('username avatar userId').lean();
                if (u) topTrader = { ...u, volume: topTraderAgg[0].volume };
            }

            // 5. Акция года
            const popularStockAgg = await StockTransaction.aggregate([
                { $group: { _id: "$ticker", count: { $sum: 1 } } }, 
                { $sort: { count: -1 } }, { $limit: 1 }
            ]);
            const popularStock = popularStockAgg[0] ? popularStockAgg[0]._id : 'N/A';

            wrappedData = {
                totalUsers,
                global: globalAgg[0] || { totalMsgs: 0, totalMoney: 0, totalVoice: 0, totalItems: 0, totalGhosts: 0 },
                market: { 
                    volume: marketAgg[0]?.volume || 0, 
                    trades: marketAgg[0]?.trades || 0,
                    popularStock 
                },
                richest, richestShards, chatty, voice, 
                taxPayer, reputation, ghostHunter, 
                topAchiever, topTrader, topStreaker,
                
                // Новые поля:
                richestNet,
                topCollector,
                topPopular // Вместо ветерана
            };

            cache.set(cacheKey, wrappedData, 600);
        }

        res.render('wrapped', { 
            user: req.user, 
            stats: wrappedData, 
            title: 'Итоги 2025 | Дача Зейна',
            description: `Итоги года сервера. Всего сообщений: ${(wrappedData.global.totalMsgs / 1000000).toFixed(1)}M.`,
            currentPath: '/wrapped',
            jsonLD: null 
        });

    } catch (e) {
        console.error("Wrapped Error:", e);
        res.status(500).render('500', { user: req.user, error: e });
    }
});

router.get('/wiki', async (req, res) => {
    try {
        const searchQuery = req.query.q;
        let query = { isPublished: true };
        if (searchQuery) {
            query.$or = [{ title: { $regex: searchQuery, $options: 'i' } }, { tags: { $regex: searchQuery, $options: 'i' } }];
        }
        const articles = await Article.find(query).sort({ views: -1 }).limit(50).lean();
        const categories = { 'guides': [], 'bees': [], 'items': [], 'mechanics': [], 'server': [] };
        articles.forEach(art => { if (categories[art.category]) categories[art.category].push(art); });

        const jsonLD = {
            "@context": "https://schema.org",
            "@graph": [{
                "@type": "BreadcrumbList",
                "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Главная", "item": "https://dachazeyna.com" }, { "@type": "ListItem", "position": 2, "name": "Вики", "item": "https://dachazeyna.com/wiki" }]
            }]
        };

        res.render('wiki', { user: req.user, title: 'База Знаний | Дача Зейна', description: 'Полная база знаний по Bee Swarm Simulator: гайды по пчелам, крафты предметов, механики игры и секреты сервера.', categories, searchQuery, currentPath: '/wiki', jsonLD });
    } catch (e) { res.status(500).render('404', { user: req.user }); }
});

router.get('/wiki/:slug', async (req, res) => {
    try {
        const article = await Article.findOne({ slug: req.params.slug });

        if (!article) {
            // Если статья не найдена — 404
            return res.status(404).render('404', { 
                user: req.user, 
                title: 'Страница не найдена' 
            });
        }

        // --- 🧠 УМНАЯ СИСТЕМА ПРОСМОТРОВ ---
        
        let shouldCount = true;
        const userAgent = req.get('User-Agent') || '';

        // 1. Отсеиваем ботов (Google, Yandex, Discordbot и т.д.)
        const isBot = /bot|googlebot|crawler|spider|robot|crawling/i.test(userAgent);
        if (isBot) {
            shouldCount = false;
        }

        // 2. Инициализируем массив просмотренных статей в сессии, если его нет
        if (!req.session.viewedArticles) {
            req.session.viewedArticles = [];
        }

        // 3. Проверяем, есть ли ID этой статьи в сессии пользователя
        const articleIdStr = article._id.toString();
        if (req.session.viewedArticles.includes(articleIdStr)) {
            shouldCount = false; // Уже смотрел в этой сессии
        }

        // 4. (Опционально) Автор статьи не накручивает просмотры сам себе
        if (req.user && req.user.username === article.author) {
            shouldCount = false; 
        }

        // Если все проверки пройдены — засчитываем просмотр
        if (shouldCount) {
            // Атомарно увеличиваем счетчик в базе (лучше, чем article.views++)
            await Article.findByIdAndUpdate(article._id, { $inc: { views: 1 } });
            
            // Добавляем ID в сессию, чтобы больше не считать этот просмотр
            req.session.viewedArticles.push(articleIdStr);
            
            // Визуально обновляем объект article для текущего рендера, 
            // чтобы пользователь сразу увидел +1
            article.views += 1;
        }

        // --- КОНЕЦ ЛОГИКИ ПРОСМОТРОВ ---

        // Поиск похожих статей (как у тебя было)
        const related = await Article.find({ 
            category: article.category, 
            _id: { $ne: article._id },
            isPublished: true 
        }).limit(3);

        res.render('wiki-article', { 
            user: req.user, 
            article, 
            related, 
            title: article.title 
        });

    } catch (e) {
        console.error(e);
        res.status(500).render('500', { user: req.user, error: e });
    }
});

router.get('/profile', checkAuth, async (req, res) => res.redirect(`/profile/${req.user.id}`));

router.get('/profile/:userId', async (req, res) => {
    try {
        const targetId = req.params.userId;
        const profile = await UserProfile.findOne({ userId: targetId, guildId: process.env.GUILD_ID }).lean();
        
        if (!profile) return res.status(404).render('404', { user: req.user });

        if (profile.inventory) {
            profile.inventory = profile.inventory.map(slot => ({ 
                ...slot, 
                details: getItemDefinition(slot.itemId) || { name: slot.itemId, emoji: '📦' } 
            }));
        }

        const viewer = req.user; 
        const isOwner = viewer && viewer.id === targetId;
        const targetUser = { 
            id: profile.userId, 
            username: profile.username || 'Неизвестный', 
            avatar: profile.avatar 
        };
        
        if (isOwner && viewer.avatar) targetUser.avatar = viewer.avatar;
        
        const stocks = await Stock.find({}).lean();
        const stockMap = new Map(stocks.map(s => [s.ticker, s.currentPrice]));
        let portfolioValue = 0;
        let portfolioDetails = [];
        
        if (profile.portfolio) {
            portfolioDetails = profile.portfolio.map(p => {
                const currentPrice = stockMap.get(p.ticker) || 0;
                const val = p.quantity * currentPrice;
                portfolioValue += val;
                return { ...p, currentPrice, value: val };
            });
        }
        
        const netWorth = profile.stars + portfolioValue;
        const quests = (profile.activeQuests || []).map(q => ({ ...q, details: getQuestDefinition(q.questId) || { name: q.questId } }));
        const achievements = (profile.achievements || []).map(ach => ({ ...ach, details: getAchievementDefinition(ach.achievementId) || { medalEmoji: '🏅' } }));
        
        let partnerName = "Нет";
        if (profile.marriedTo) {
            const partner = await UserProfile.findOne({ userId: profile.marriedTo }).lean();
            partnerName = partner ? partner.username : "Неизвестно";
        }

        const desc = `Профиль игрока ${targetUser.username}. Капитал: ${Math.floor(netWorth).toLocaleString()} ⭐. Сообщений: ${profile.totalMessages}.`;

        const noIndex = true; 

        res.render('profile', {
            user: viewer, targetUser, profile, isOwner, portfolioValue, netWorth, portfolioDetails,
            quests, achievements, partnerName,
            title: `Профиль ${targetUser.username}`,
            description: desc, 
            currentPath: `/profile/${targetId}`,
            noIndex 
        });

    } catch (e) { 
        console.error(e); 
        res.status(500).render('404', { user: req.user }); 
    }
});

router.get('/market', checkAuth, async (req, res) => {
    try {
        let stocks = cache.get('stocks_data');
        if (!stocks) {
            stocks = await Stock.find({}).sort({ currentPrice: -1 }).lean();
            await Promise.all(stocks.map(async (stock) => {
                const fullHistory = await StockPriceHistory.find({ ticker: stock.ticker }).select('date price -_id').sort({ date: 1 }).lean();
                if (fullHistory.length > 0) stock.priceHistory = fullHistory;
            }));
            cache.set('stocks_data', stocks, 60);
        }
        let userPortfolio = [], profile = null;
        if (req.user) {
            profile = await UserProfile.findOne({ userId: req.user.id, guildId: process.env.GUILD_ID }).lean();
            if (profile) userPortfolio = profile.portfolio || [];
        }
        res.render('market', { user: req.user, stocks, portfolio: userPortfolio, profile, title: 'Биржа Акций', description: 'Торгуйте виртуальными акциями игроков и компаний. Анализируйте графики и зарабатывайте Звезды.', currentPath: '/market' });
    } catch (e) { res.status(500).render('404', { user: req.user }); }
});

router.get('/leaderboard', async (req, res) => {
    try {
        const sortType = req.query.sort || 'stars';
        const period = req.query.period || 'all'; 
        const searchQuery = req.query.q;
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        const cacheKey = `lb_${sortType}_${period}_${searchQuery || ''}_${page}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.render('leaderboard', { ...cachedData, user: req.user, isCached: true });

        let dbField = 'stars', title = 'Топ богачей', valueSuffix = '⭐';
        const map = { 'stars': ['stars', 'Топ богачей', '⭐'], 'rep': ['reputation', 'Самые уважаемые', '👍'], 'messages': ['totalMessages', 'Топ писателей', 'сообщ.'], 'voice': ['totalVoiceTime', 'Топ говорунов', 'мин.'] };
        
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
        } else if (map[sortType]) [dbField, title, valueSuffix] = map[sortType];

        const filter = { guildId: process.env.GUILD_ID, [dbField]: { $gt: 0 } };
        if (searchQuery) filter.username = { $regex: searchQuery, $options: 'i' };

        const totalPlayers = await UserProfile.countDocuments(filter);
        const leaders = await UserProfile.find(filter).sort({ [dbField]: -1 }).skip(skip).limit(limit).lean();

        let myRank = null, myValue = null;
        if (req.user) {
            const myProfile = await UserProfile.findOne({ userId: req.user.id, guildId: process.env.GUILD_ID }).lean();
            if (myProfile) {
                const myScore = myProfile[dbField] || 0;
                myValue = (sortType === 'voice') ? Math.round(myScore / 60) : myScore.toLocaleString();
                if (!searchQuery) myRank = (await UserProfile.countDocuments({ guildId: process.env.GUILD_ID, [dbField]: { $gt: myScore } })) + 1;
            }
        }

        const renderData = { leaders, sortType, period, title, dbField, valueSuffix, formatVoice: (sec) => Math.round(sec / 60), currentPage: page, totalPages: Math.ceil(totalPlayers / limit), startRank: skip + 1, myRank, myValue, searchQuery, currentPath: '/leaderboard' };
        cache.set(cacheKey, renderData, 300);
        res.render('leaderboard', { user: req.user, ...renderData, description: `Топ игроков сервера Дача Зейна по категории: ${renderData.title || 'Богатство'}. Посмотри, кто занимает первое место!`, currentPath: '/leaderboard' });
    } catch (e) { res.status(500).render('404', { user: req.user }); }
});

router.get('/shop', checkAuth, async (req, res) => {
    try {
        const profile = await UserProfile.findOne({ userId: req.user.id, guildId: process.env.GUILD_ID }).lean();
        const items = getShopItems();
        res.render('shop', { user: req.user, profile: profile || { stars: 0 }, items, title: 'Магазин', description: 'Покупайте лутбоксы, бустеры, украшения для профиля и Премиум статус за внутриигровую валюту.', currentPath: '/shop' });
    } catch (e) { res.status(500).send("Ошибка"); }
});

router.get('/inventory', checkAuth, async (req, res) => {
    try {
        const userProfile = await UserProfile.findOne({ userId: req.user.id, guildId: process.env.GUILD_ID }).lean();
        if (!userProfile) return res.redirect('/');
        const enrichedInventory = userProfile.inventory.map(slot => ({ ...slot, details: getItemDefinition(slot.itemId) || { name: '?', emoji: '❓' } }));
        res.render('inventory', { user: req.user, profile: userProfile, inventory: enrichedInventory, title: 'Мой Инвентарь', currentPath: '/inventory', noIndex: true });
    } catch (e) { res.status(500).send("Error"); }
});

router.get('/deposit', checkAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await UserProfile.findOne({ userId, guildId: process.env.GUILD_ID }).lean();
        const activeDeposits = await Deposit.find({ userId, status: 'active' }).sort({ maturityDate: 1 }).lean();
        const historyDeposits = await Deposit.find({ userId, status: { $in: ['completed', 'collected', 'closed'] } }).sort({ createdAt: -1 }).limit(5).lean();
        const enrichedActive = activeDeposits.map(d => ({ ...d, timeLeft: new Date(d.maturityDate) - new Date(), canWithdrawEarly: d.planType === 'FLEXIBLE', expectedProfit: Math.floor(d.amount * d.interestRate) }));
        const plans = [{ id: 'SAVINGS', name: 'Сберегательный', duration: 30, percent: 7, min: 1000 }, { id: 'FLEXIBLE', name: 'Гибкий', duration: 30, percent: 5, min: 1000 }];
        res.render('deposit', { user: req.user, profile, activeDeposits: enrichedActive, historyDeposits, plans, title: 'Банк', currentPath: '/deposit', noIndex: true });
    } catch (e) { res.status(500).render('404', { user: req.user }); }
});

router.get('/daily', checkAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        let streakData = await UserDailyStreak.findOne({ userId }).lean();
        if (!streakData) streakData = { currentStreak: 0, lastClaimTimestamp: null };
        const now = new Date();
        const lastClaim = streakData.lastClaimTimestamp ? new Date(streakData.lastClaimTimestamp) : null;
        let canClaim = false; let nextClaimTime = null;
        if (lastClaim && (now - lastClaim) < 22 * 60 * 60 * 1000) nextClaimTime = new Date(lastClaim.getTime() + 22 * 60 * 60 * 1000);
        else canClaim = true;
        const currentDayCycle = (streakData.currentStreak % 7) + (canClaim ? 1 : 0);
        const visualDay = currentDayCycle > 7 ? 1 : (currentDayCycle === 0 ? 1 : currentDayCycle);
        res.render('daily', { user: req.user, title: 'Ежедневные награды', streak: streakData.currentStreak, canClaim, nextClaimTime: nextClaimTime ? nextClaimTime.getTime() : null, rewards: dailyRewards, currentDay: visualDay, currentPath: '/daily', noIndex: true });
    } catch (e) { res.status(500).render('404', { user: req.user }); }
});

router.get('/messages', checkAuth, (req, res) => res.render('messages', { user: req.user, activeChatId: null, title: 'Сообщения', currentPath: '/messages', noIndex: true }));
router.get('/messages/:userId', checkAuth, (req, res) => res.render('messages', { user: req.user, activeChatId: req.params.userId, title: 'Сообщения', currentPath: '/messages', noIndex: true }));

router.get('/bot', async (req, res) => {
    const totalUsers = await UserProfile.countDocuments({ guildId: process.env.GUILD_ID });
    res.render('bot', { user: req.user, title: 'О Боте', description: 'Официальный бот сервера Дача Зейна. Уникальная экономика, биржа акций, кланы, браки и ежедневные награды.', stats: { users: totalUsers }, currentPath: '/bot' });
});

router.get('/terms', (req, res) => res.render('terms', { 
    user: req.user, title: 'Условия использования',
    description: 'Правила использования сервисов проекта Дача Зейна.',
    currentPath: '/terms'
}));
router.get('/privacy', (req, res) => res.render('privacy', { 
    user: req.user, title: 'Политика конфиденциальности',
    description: 'Информация о том, какие данные мы собираем и как их используем.',
    currentPath: '/privacy'
}));

router.get('/admin/wiki', checkAuth, async (req, res) => {
    const ADMIN_IDS = ['438744415734071297'];
    if (!ADMIN_IDS.includes(req.user.id)) return res.redirect('/');
    const articles = await Article.find().sort({ createdAt: -1 }).lean();
    res.render('admin-wiki-list', { user: req.user, articles, noIndex: true });
});
router.get('/admin/wiki/new', checkAuth, async (req, res) => {
    const ADMIN_IDS = ['438744415734071297'];
    if (!ADMIN_IDS.includes(req.user.id)) return res.redirect('/');
    res.render('admin-wiki-edit', { user: req.user, article: null, noIndex: true });
});
router.get('/admin/wiki/edit/:id', checkAuth, async (req, res) => {
    const ADMIN_IDS = ['438744415734071297'];
    if (!ADMIN_IDS.includes(req.user.id)) return res.redirect('/');
    const article = await Article.findById(req.params.id).lean();
    if (!article) return res.redirect('/admin/wiki');
    res.render('admin-wiki-edit', { user: req.user, article, noIndex: true });
});


router.get('/img/proxy/avatar/:userId/:hash', async (req, res) => {
    try {
        const { userId, hash } = req.params;
        const discordUrl = `https://cdn.discordapp.com/avatars/${userId}/${hash}.webp?size=128`;

        const response = await fetch(discordUrl);

        if (!response.ok) {
            return res.redirect('/assets/img/avatars/default_avatar.png');
        }

        res.setHeader('Cache-Control', 'public, max-age=604800'); 
        res.setHeader('Content-Type', 'image/webp'); 

        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));

    } catch (e) {
        res.redirect('/assets/img/avatars/default_avatar.png');
    }
});

router.get('/giveaways', checkAuth, async (req, res) => {
    try {
        const now = new Date();

        const activeGiveaways = await Giveaway.find({ 
            status: 'ACTIVE', 
            endsAt: { $gt: now } 
        }).sort({ endsAt: 1 }).lean();

        const endedGiveaways = await Giveaway.find({ 
            status: 'ENDED' 
        }).sort({ endsAt: -1 }).limit(12).lean();

        const allWinnerIds = endedGiveaways.flatMap(g => g.winners || []);
        
        if (allWinnerIds.length > 0) {
            const winnerProfiles = await UserProfile.find({ userId: { $in: allWinnerIds } })
                .select('userId username')
                .lean();
            
            const winnerMap = {};
            winnerProfiles.forEach(p => { winnerMap[p.userId] = p.username; });

            endedGiveaways.forEach(g => {
                g.winnerNames = (g.winners || []).map(id => winnerMap[id] || 'Неизвестный');
            });
        }

        const enrichedActive = activeGiveaways.map(g => ({
            ...g,
            isJoined: g.participants.includes(req.user.id),
            timeLeft: Math.max(0, new Date(g.endsAt) - now)
        }));

        const eventSchema = activeGiveaways.map(g => ({
            "@type": "Event",
            "name": g.title,
            "startDate": new Date().toISOString(),
            "endDate": new Date(g.endsAt).toISOString(),
            "eventStatus": "https://schema.org/EventScheduled",
            "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
            "location": {
                "@type": "VirtualLocation",
                "url": "https://dachazeyna.com/giveaways"
            },
            "description": g.description,
            "offers": {
                "@type": "Offer",
                "price": g.entryCost || 0,
                "priceCurrency": "Stars",
                "availability": "https://schema.org/InStock"
            },
            "organizer": {
                "@type": "Organization",
                "name": "Дача Зейна",
                "url": "https://dachazeyna.com"
            }
        }));

        const jsonLD = {
            "@context": "https://schema.org",
            "@graph": eventSchema
        };

        res.render('giveaways', { 
            user: req.user, 
            active: enrichedActive, 
            ended: endedGiveaways,
            title: 'Розыгрыши | Халява',
            description: 'Участвуй в регулярных розыгрышах ценных призов, валюты и эксклюзивных ролей на сервере Дача Зейна.',
            currentPath: '/giveaways',
            jsonLD: jsonLD 
        });

    } catch (e) {
        console.error('[Page Giveaways] Error:', e);
        res.status(500).render('404', { user: req.user });
    }
});

// routes/pages.js (внизу)
router.get('/banned', async (req, res) => {
    if (!req.user || !req.user.isBanned) return res.redirect('/');
    
    // Проверяем, есть ли активная заявка
    const existingAppeal = await BanAppeal.findOne({ userId: req.user.id, status: 'PENDING' });

    res.render('banned', { 
        user: req.user, 
        title: 'Доступ ограничен',
        reason: req.user.banReason || 'Нарушение правил',
        hasPendingAppeal: !!existingAppeal // true/false
    });
});

router.get('/admin/appeals', checkAuth, async (req, res) => {
    const ADMIN_IDS = ['438744415734071297'];
    if (!ADMIN_IDS.includes(req.user.id)) return res.redirect('/');

    // Берем только ожидающие заявки
    const appeals = await BanAppeal.find({ status: 'PENDING' }).sort({ createdAt: 1 }).lean();

    res.render('admin-appeals', { 
        user: req.user, 
        appeals, 
        title: 'Апелляции (Admin)',
        noIndex: true
    });
});

router.get('/ideas', checkAuth, async (req, res) => {
    // Показываем пользователю его собственные идеи
    const myIdeas = await Idea.find({ userId: req.user.id }).sort({ createdAt: -1 });
    
    res.render('ideas', {
        user: req.user,
        title: 'Предложить идею',
        myIdeas
    });
});

// Админка идей
router.get('/admin/ideas', checkAuth, async (req, res) => {
    const ADMIN_IDS = ['438744415734071297'];
    if (!ADMIN_IDS.includes(req.user.id)) return res.redirect('/');

    const ideas = await Idea.find({ status: 'PENDING' }).sort({ createdAt: 1 });

    res.render('admin-ideas', {
        user: req.user,
        title: 'Управление идеями',
        ideas
    });
});

export default router;