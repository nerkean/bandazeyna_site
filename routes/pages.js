import express from 'express';
import UserProfile from '../models/UserProfile.js';
import Stock from '../models/Stock.js';
import StockPriceHistory from '../models/StockPriceHistory.js';
import StockTransaction from '../models/StockTransaction.js';
import Deposit from '../models/Deposit.js';
import Article from '../models/Article.js';
import UserDailyStreak from '../models/UserDailyStreak.js';
import { checkAuth } from '../middleware/checkAuth.js';
import { getShopItems, getItemDefinition } from '../utils/itemDefinitions.js';
import { getQuestDefinition } from '../utils/questDefinitions.js';
import { getAchievementDefinition } from '../utils/achievementDefinitions.js';
import { dailyRewards } from '../utils/dailyRewardDefinitions.js';
import cache from '../utils/cache.js';

const router = express.Router();

router.get('/sitemap.xml', async (req, res) => {
    try {
        const cacheKey = 'sitemap_xml';
        const cachedSitemap = cache.get(cacheKey);
        
        if (cachedSitemap) {
            res.header('Content-Type', 'application/xml');
            return res.send(cachedSitemap);
        }

        const baseUrl = 'https://bandazeyna.com';
        const urls = [
            { url: '/', changefreq: 'daily', priority: 1.0 },
            { url: '/market', changefreq: 'hourly', priority: 0.9 },
            { url: '/shop', changefreq: 'weekly', priority: 0.8 },
            { url: '/leaderboard', changefreq: 'daily', priority: 0.8 },
            { url: '/wiki', changefreq: 'weekly', priority: 0.8 },
            { url: '/giveaways', changefreq: 'daily', priority: 0.7 },
            { url: '/bot', changefreq: 'monthly', priority: 0.6 },
            { url: '/terms', changefreq: 'yearly', priority: 0.3 },
            { url: '/privacy', changefreq: 'yearly', priority: 0.3 },
        ];

        const articles = await Article.find({ isPublished: true }).select('slug updatedAt').lean();
        articles.forEach(art => {
            urls.push({
                url: `/wiki/${art.slug}`,
                changefreq: 'monthly',
                priority: 0.7,
                lastmod: new Date(art.updatedAt).toISOString()
            });
        });

        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            ${urls.map(u => `
                <url>
                    <loc>${baseUrl}${u.url}</loc>
                    <changefreq>${u.changefreq}</changefreq>
                    <priority>${u.priority}</priority>
                    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
                </url>
            `).join('')}
        </urlset>`;

        cache.set(cacheKey, sitemap, 3600);
        res.header('Content-Type', 'application/xml');
        res.send(sitemap);
    } catch (e) {
        console.error(e);
        res.status(500).end();
    }
});

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
                    "url": "https://bandazeyna.com",
                    "logo": "https://bandazeyna.com/assets/img/logo.png",
                    "sameAs": ["https://discord.gg/bandazeyna", "https://www.youtube.com/@ZeynBss"]
                },
                {
                    "@type": "WebSite",
                    "url": "https://bandazeyna.com",
                    "potentialAction": {
                        "@type": "SearchAction",
                        "target": "https://bandazeyna.com/leaderboard?q={search_term_string}",
                        "query-input": "required name=search_term_string"
                    }
                }
            ]
        };

        res.render('index', { 
            user: req.user, stats, title: 'Главная | Дача Зейна',
            heroStock: topStock || { ticker: 'INDEX', lastChange: 0, currentPrice: 100 },
            myProfile, currentPath: '/', jsonLD 
        });
    } catch (e) { res.render('index', { user: req.user, stats: { users: 0, stars: 0 }, heroStock: {}, myProfile: null }); }
});

router.get('/wrapped', async (req, res) => {
    try {
        const globalAgg = await UserProfile.aggregate([
            {
                $group: {
                    _id: null,
                    totalMsgs: { $sum: "$totalMessages" },
                    totalVoice: { $sum: "$totalVoiceTime" },
                    totalMoney: { $sum: "$stars" },
                    totalShards: { $sum: "$shards" },
                    totalTaxPaid: { $sum: "$totalStarsPaidInTax" },
                    totalGhosts: { $sum: "$event_ghostsCaught" },
                    totalCandies: { $sum: "$event_candies" },
                    totalWarnsIssued: { $sum: "$warningsIssued" },
                    totalItems: { $sum: { $size: "$inventory" } },
                    totalAchievements: { $sum: { $size: "$achievements" } }
                }
            }
        ]);

        const marketAgg = await StockTransaction.aggregate([
            { $group: { _id: null, volume: { $sum: "$totalValue" }, trades: { $sum: 1 } } }
        ]);

        const depositsAgg = await Deposit.aggregate([
            { $group: { _id: null, totalValue: { $sum: "$amount" }, count: { $sum: 1 } } }
        ]);

        const [
            richest,
            richestShards,
            chatty,    
            voice,        
            taxPayer,    
            reputation,   
            ghostHunter,  
            candyBaron,  
            oldest,   
            streakerData,
            mostExpensiveStock,
            cheapestStock,
            totalUsers,
            premiumCount,
            investorCount,
            debtorCount,
            activeChatUsers,  
            activeVoiceUsers  
        ] = await Promise.all([
            UserProfile.findOne({ stars: { $gt: 0 } }).sort({ stars: -1 }).select('username stars avatar userId'),
            UserProfile.findOne({ shards: { $gt: 0 } }).sort({ shards: -1 }).select('username shards avatar userId'),
            UserProfile.findOne({ totalMessages: { $gt: 0 } }).sort({ totalMessages: -1 }).select('username totalMessages avatar userId'),
            UserProfile.findOne({ totalVoiceTime: { $gt: 0 } }).sort({ totalVoiceTime: -1 }).select('username totalVoiceTime avatar userId'),
            UserProfile.findOne({ totalStarsPaidInTax: { $gt: 0 } }).sort({ totalStarsPaidInTax: -1 }).select('username totalStarsPaidInTax avatar userId'),
            UserProfile.findOne({ reputation: { $gt: 0 } }).sort({ reputation: -1 }).select('username reputation avatar userId'),
            UserProfile.findOne({ event_ghostsCaught: { $gt: 0 } }).sort({ event_ghostsCaught: -1 }).select('username event_ghostsCaught avatar userId'),
            UserProfile.findOne({ event_candies: { $gt: 0 } }).sort({ event_candies: -1 }).select('username event_candies avatar userId'),
            UserProfile.findOne().sort({ joinedAt: 1 }).select('username joinedAt avatar userId'),
            UserDailyStreak.findOne({ currentStreak: { $gt: 0 } }).sort({ currentStreak: -1 }),

            Stock.findOne().sort({ currentPrice: -1 }),
            Stock.findOne().sort({ currentPrice: 1 }),

            UserProfile.countDocuments(),
            UserProfile.countDocuments({ premiumType: { $ne: null } }),
            UserProfile.countDocuments({ "portfolio.0": { $exists: true } }),
            UserProfile.countDocuments({ isTaxDelinquent: true }),
            UserProfile.countDocuments({ totalMessages: { $gt: 10 } }), 
            UserProfile.countDocuments({ totalVoiceTime: { $gt: 600 } }) 
        ]);

        const getLeader = async (collection, groupField, sortField) => {
            const res = await collection.aggregate([
                { $group: { _id: "$userId", val: { $sum: groupField } } },
                { $sort: { val: -1 } },
                { $limit: 1 }
            ]);

            if (res.length === 0) return null;

            const u = await UserProfile.findOne({ userId: res[0]._id }).select('username avatar userId');
            return u ? { ...u.toObject(), value: res[0].val } : null;
        };

        const topTraderAgg = await StockTransaction.aggregate([
            { $group: { _id: "$userId", volume: { $sum: "$totalValue" }, count: { $sum: 1 } } },
            { $sort: { volume: -1 } }, { $limit: 1 }
        ]);

        let topTrader = null;

        if (topTraderAgg.length) {
            const u = await UserProfile.findOne({ userId: topTraderAgg[0]._id });
            if (u) topTrader = { ...u.toObject(), volume: topTraderAgg[0].volume, trades: topTraderAgg[0].count };
        }

        const topDepositorAgg = await Deposit.aggregate([
            { $group: { _id: "$userId", total: { $sum: "$amount" } } },
            { $sort: { total: -1 } }, { $limit: 1 }
        ]);

        let topDepositor = null;

        if (topDepositorAgg.length) {
            const u = await UserProfile.findOne({ userId: topDepositorAgg[0]._id });
            if (u) topDepositor = { ...u.toObject(), total: topDepositorAgg[0].total };
        }

        const shopaholicAgg = await UserProfile.aggregate([
            { $project: { username: 1, avatar: 1, userId: 1, count: { $size: "$inventory" } } },
            { $sort: { count: -1 } }, { $limit: 1 }
        ]);

        const topShopaholic = shopaholicAgg[0];

        const achieverAgg = await UserProfile.aggregate([
            { $project: { username: 1, avatar: 1, userId: 1, count: { $size: "$achievements" } } },
            { $sort: { count: -1 } }, { $limit: 1 }
        ]);

        const topAchiever = achieverAgg[0];

        const sheriffAgg = await UserProfile.aggregate([
            { $project: { username: 1, avatar: 1, userId: 1, score: { $add: ["$mutesIssued", "$warningsIssued"] } } },
            { $sort: { score: -1 } }, { $limit: 1 }
        ]);

        const topSheriff = sheriffAgg[0] && sheriffAgg[0].score > 0 ? sheriffAgg[0] : null;

        const popularStockAgg = await StockTransaction.aggregate([
            { $group: { _id: "$ticker", count: { $sum: 1 } } },
            { $sort: { count: -1 } }, { $limit: 1 }
        ]);

        const popularStock = popularStockAgg[0] ? popularStockAgg[0]._id : 'TXT';

        let topStreaker = null;

        if (streakerData) {
            const u = await UserProfile.findOne({ userId: streakerData.userId });
            if (u) topStreaker = { ...u.toObject(), streak: streakerData.currentStreak };
        }

        const global = globalAgg[0] || {};
        const market = marketAgg[0] || { volume: 0, trades: 0 };
        const deposits = depositsAgg[0] || { totalValue: 0, count: 0 };

const statsData = {
            richest, richestShards, chatty, voice, taxPayer, reputation,
            ghostHunter, candyBaron, oldest, topStreaker,
            topTrader, topDepositor, topShopaholic, topAchiever, topSheriff,
            
            mostExpensiveStock, cheapestStock, popularStock,
            
            totalUsers, premiumCount, investorCount, debtorCount, activeChatUsers, activeVoiceUsers,
            
            global, market, deposits
        };

        res.render('wrapped', {
            user: req.user,
            stats: statsData,
            title: 'Итоги 2025 | Дача Зейна',
            currentPath: '/wrapped',
            jsonLD: null 
        });

    } catch (e) {
        console.error("Wrapped Error:", e);
        res.status(500).render('404', { 
            user: req.user, 
            title: 'Ошибка', 
            currentPath: '/error' 
        });
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
                "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Главная", "item": "https://bandazeyna.com" }, { "@type": "ListItem", "position": 2, "name": "Вики", "item": "https://bandazeyna.com/wiki" }]
            }]
        };

        res.render('wiki', { user: req.user, title: 'База Знаний | Дача Зейна', categories, searchQuery, currentPath: '/wiki', jsonLD });
    } catch (e) { res.status(500).render('404', { user: req.user }); }
});

router.get('/wiki/:slug', async (req, res) => {
    try {
        const article = await Article.findOne({ slug: req.params.slug, isPublished: true }).lean();
        if (!article) return res.status(404).render('404', { user: req.user });

        if (article.updatedAt) {
            res.setHeader('Last-Modified', new Date(article.updatedAt).toUTCString());
        }

        Article.updateOne({ _id: article._id }, { $inc: { views: 1 } }).exec();

        const related = await Article.find({ category: article.category, slug: { $ne: article.slug }, isPublished: true }).limit(3).select('title slug icon').lean();

        const jsonLD = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "BreadcrumbList",
                    "itemListElement": [
                        { "@type": "ListItem", "position": 1, "name": "Главная", "item": "https://bandazeyna.com" },
                        { "@type": "ListItem", "position": 2, "name": "Вики", "item": "https://bandazeyna.com/wiki" },
                        { "@type": "ListItem", "position": 3, "name": article.title, "item": `https://bandazeyna.com/wiki/${article.slug}` }
                    ]
                },
                {
                    "@type": "Article",
                    "headline": article.title,
                    "image": article.image || "https://bandazeyna.com/img/wiki_default.png",
                    "author": { "@type": "Person", "name": article.author },
                    "publisher": { "@type": "Organization", "name": "Дача Зейна" },
                    "datePublished": article.createdAt,
                    "dateModified": article.updatedAt,
                    "description": article.description
                }
            ]
        };

        res.render('wiki-article', { user: req.user, article, related, title: `${article.title} | Wiki`, currentPath: `/wiki/${article.slug}`, jsonLD });
    } catch (e) { res.status(500).render('404', { user: req.user }); }
});

router.get('/profile', checkAuth, async (req, res) => res.redirect(`/profile/${req.user.id}`));

router.get('/profile/:userId', async (req, res) => {
    try {
        const targetId = req.params.userId;
        const profile = await UserProfile.findOne({ userId: targetId, guildId: process.env.GUILD_ID }).lean();
        if (!profile) return res.status(404).render('404', { user: req.user });

        if (profile.inventory) {
            profile.inventory = profile.inventory.map(slot => ({ ...slot, details: getItemDefinition(slot.itemId) || { name: slot.itemId, emoji: '📦' } }));
        }

        const viewer = req.user; 
        const isOwner = viewer && viewer.id === targetId;
        const targetUser = { id: profile.userId, username: profile.username || 'Неизвестный', avatar: profile.avatar };
        if (isOwner) targetUser.avatar = viewer.avatar;
        
        const stocks = await Stock.find({}).lean();
        const stockMap = new Map(stocks.map(s => [s.ticker, s.currentPrice]));
        let portfolioValue = 0;
        let portfolioDetails = [];
        if (profile.portfolio) {
            portfolioDetails = profile.portfolio.map(p => {
                const val = p.quantity * (stockMap.get(p.ticker) || 0);
                portfolioValue += val;
                return { ...p, currentPrice: stockMap.get(p.ticker) || 0, value: val };
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

        const noIndex = true; 

        res.render('profile', {
            user: viewer, targetUser, profile, isOwner, portfolioValue, netWorth, portfolioDetails,
            quests, achievements, partnerName,
            title: `Профиль ${targetUser.username}`,
            currentPath: `/profile/${targetId}`,
            noIndex 
        });
    } catch (e) { console.error(e); res.status(500).render('404', { user: req.user }); }
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
        res.render('market', { user: req.user, stocks, portfolio: userPortfolio, profile, title: 'Биржа Акций', currentPath: '/market' });
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
        res.render('leaderboard', { user: req.user, ...renderData });
    } catch (e) { res.status(500).render('404', { user: req.user }); }
});

router.get('/shop', checkAuth, async (req, res) => {
    try {
        const profile = await UserProfile.findOne({ userId: req.user.id, guildId: process.env.GUILD_ID }).lean();
        const items = getShopItems();
        res.render('shop', { user: req.user, profile: profile || { stars: 0 }, items, title: 'Магазин', currentPath: '/shop' });
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
    res.render('bot', { user: req.user, title: 'О Боте', stats: { users: totalUsers }, currentPath: '/bot' });
});

router.get('/terms', (req, res) => res.render('terms', { user: req.user, title: 'Условия использования' }));
router.get('/privacy', (req, res) => res.render('privacy', { user: req.user, title: 'Политика конфиденциальности' }));

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

export default router;