// routes/api.js
import express from 'express';
import UserProfile from '../models/UserProfile.js';
import Stock from '../models/Stock.js';
import StockTransaction from '../models/StockTransaction.js'; 
import { getShopItems, getItemDefinition } from '../utils/itemDefinitions.js';
import { checkAuth } from '../middleware/checkAuth.js';
import ApplicationSubmission from '../models/ApplicationSubmission.js';
import crypto from 'crypto';
import BetaUser from '../models/BetaUser.js';

const router = express.Router();

router.post('/admin/application', checkAuth, async (req, res) => {
    // Проверка ID админа
    const ADMIN_IDS = ['438744415734071297']; 
    if (!ADMIN_IDS.includes(req.user.id)) return res.status(403).json({ error: 'No access' });

    const { appId, action } = req.body;

    try {
        const app = await ApplicationSubmission.findById(appId);
        if (!app) return res.status(404).json({ error: 'Not found' });

        let generatedPassword = null;

        if (action === 'approve') {
            app.status = 'approved';
            
            // ГЕНЕРАЦИЯ СЛУЧАЙНОГО ПАРОЛЯ (8 символов, hex)
            generatedPassword = crypto.randomBytes(4).toString('hex');

            // Создаем пользователя для входа
            await BetaUser.create({
                username: app.discordUsername, // Логин = Ник
                password: generatedPassword,   // Пароль = Случайный код
                assignedToDiscordId: app.uid
            });

        } else {
            app.status = 'rejected';
        }

        await app.save();
        
        // Возвращаем пароль на фронтенд, чтобы админ мог его скопировать
        res.json({ success: true, generatedPassword });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});
// Торговля акциями
router.post('/trade', checkAuth, async (req, res) => {
    const { ticker, amount, action } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) return res.json({ success: false, error: "Неверное количество" });

    // Начало сессии транзакции (для надежности, если MongoDB поддерживает Replica Set)
    // Но для простоты сделаем без transaction session пока
    try {
        const user = await UserProfile.findOne({ userId: userId, guildId: process.env.GUILD_ID });
        const stock = await Stock.findOne({ ticker: ticker });

        if (!user) return res.json({ success: false, error: "Профиль не найден" });
        if (!stock) return res.json({ success: false, error: "Акция не найдена" });

        const totalPrice = stock.currentPrice * amount;

        // --- ПОКУПКА ---
        if (action === 'BUY') {
            if (user.stars < totalPrice) {
                return res.json({ success: false, error: `Недостаточно средств! Нужно ${totalPrice.toFixed(2)}, а у вас ${user.stars.toFixed(2)}` });
            }

            user.stars -= totalPrice;

            const portfolioItem = user.portfolio.find(p => p.ticker === ticker);
            if (portfolioItem) {
                const oldTotal = portfolioItem.quantity * portfolioItem.avgBuyPrice;
                portfolioItem.quantity += amount;
                portfolioItem.totalInvested += totalPrice;
                portfolioItem.avgBuyPrice = (oldTotal + totalPrice) / portfolioItem.quantity;
            } else {
                user.portfolio.push({
                    ticker: ticker,
                    quantity: amount,
                    avgBuyPrice: stock.currentPrice,
                    totalInvested: totalPrice
                });
            }

            await user.save();

            // !!! ВАЖНО: Сохраняем транзакцию для рынка !!!
            await StockTransaction.create({
                ticker: ticker,
                userId: userId,
                type: 'BUY',
                quantity: amount,
                pricePerShare: stock.currentPrice,
                totalValue: totalPrice
            });

            return res.json({ success: true, message: `Куплено ${amount} акций ${ticker}` });
        }

        // --- ПРОДАЖА ---
        else if (action === 'SELL') {
            const portfolioItem = user.portfolio.find(p => p.ticker === ticker);
            
            if (!portfolioItem || portfolioItem.quantity < amount) {
                return res.json({ success: false, error: "У вас нет столько акций!" });
            }

            user.stars += totalPrice;
            portfolioItem.quantity -= amount;
            
            if (portfolioItem.quantity <= 0) {
                user.portfolio = user.portfolio.filter(p => p.ticker !== ticker);
            } else {
                const ratio = amount / (portfolioItem.quantity + amount);
                portfolioItem.totalInvested -= portfolioItem.totalInvested * ratio;
            }

            await user.save();

            // !!! ВАЖНО: Сохраняем транзакцию для рынка !!!
            await StockTransaction.create({
                ticker: ticker,
                userId: userId,
                type: 'SELL',
                quantity: amount,
                pricePerShare: stock.currentPrice,
                totalValue: totalPrice
            });

            return res.json({ success: true, message: `Продано ${amount} акций ${ticker}` });
        }

    } catch (e) {
        console.error(e);
        res.json({ success: false, error: "Ошибка сервера" });
    }
});

router.post('/shop/buy', checkAuth, async (req, res) => {
    const { itemId, quantity } = req.body;
    const qty = parseInt(quantity) || 1;

    if (qty < 1) return res.json({ success: false, error: "Неверное количество" });

    try {
        const userId = req.user.id;
        const userProfile = await UserProfile.findOne({ userId: userId, guildId: process.env.GUILD_ID });

        if (!userProfile) return res.json({ success: false, error: "Профиль не найден" });

        // --- ЛОГИКА ПОКУПКИ ПРЕМИУМА ---
        const premiumPlans = {
            'premium_14d': { name: 'Премиум (14 дней)', cost: 6, days: 14, currency: 'shards' },
            'premium_30d': { name: 'Премиум (30 дней)', cost: 10, days: 30, currency: 'shards' },
            'premium_perm': { name: 'Премиум (Навсегда)', cost: 70, days: 99999, currency: 'shards' }
        };

        if (premiumPlans[itemId]) {
            const plan = premiumPlans[itemId];
            
            // Проверка средств (Осколки)
            if (userProfile.shards < plan.cost) {
                return res.json({ success: false, error: `Не хватает Осколков! Нужно ${plan.cost}, у вас ${userProfile.shards}` });
            }

            // Списание
            userProfile.shards -= plan.cost;

            // Выдача статуса
            const now = new Date();
            if (plan.days === 99999) {
                userProfile.premiumType = 'permanent';
                userProfile.premiumRoleExpiresAt = null; // Навсегда
            } else {
                // Если уже есть временный премиум, продлеваем его
                let currentExpiry = userProfile.premiumRoleExpiresAt && userProfile.premiumRoleExpiresAt > now 
                    ? new Date(userProfile.premiumRoleExpiresAt) 
                    : now;
                
                // Добавляем дни
                currentExpiry.setDate(currentExpiry.getDate() + plan.days);
                
                userProfile.premiumType = 'temporary';
                userProfile.premiumRoleExpiresAt = currentExpiry;
            }

            await userProfile.save();
            return res.json({ success: true, message: `Успешно куплен: ${plan.name}!` });
        }

        // --- ЛОГИКА ОБЫЧНЫХ ПРЕДМЕТОВ ---
        const items = getShopItems();
        const item = items.find(i => i.itemId === itemId);

        if (!item) return res.json({ success: false, error: "Товар не найден" });

        const costStars = (item.price.stars || 0) * qty;
        const costShards = (item.price.shards || 0) * qty;

        if (userProfile.stars < costStars) return res.json({ success: false, error: `Не хватает Звезд! Нужно ${costStars}, у вас ${userProfile.stars}` });
        if (userProfile.shards < costShards) return res.json({ success: false, error: `Не хватает Осколков! Нужно ${costShards}, у вас ${userProfile.shards}` });

        userProfile.stars -= costStars;
        userProfile.shards -= costShards;

        const existingItem = userProfile.inventory.find(i => i.itemId === itemId);
        if (existingItem) {
            existingItem.quantity += qty;
        } else {
            userProfile.inventory.push({ itemId: itemId, quantity: qty, reservedQuantity: 0 });
        }

        await userProfile.save();

        return res.json({ 
            success: true, 
            message: `Куплено: ${item.name} (x${qty})`,
            newBalance: { stars: userProfile.stars, shards: userProfile.shards }
        });

    } catch (e) {
        console.error(e);
        res.json({ success: false, error: "Ошибка сервера при покупке" });
    }
});

// Использование предмета
router.post('/inventory/use', checkAuth, async (req, res) => {
    const { itemId, quantity } = req.body;
    const qty = parseInt(quantity) || 1;
    const userId = req.user.id;

    try {
        const userProfile = await UserProfile.findOne({ userId, guildId: process.env.GUILD_ID });
        if (!userProfile) return res.json({ success: false, error: "Профиль не найден" });

        // Проверяем наличие (для обычных предметов нужно списание, для многоразовых украшений - просто наличие)
        if (!userProfile.hasItem(itemId, 1)) {
            return res.json({ success: false, error: "У вас нет этого предмета!" });
        }

        const itemDef = getItemDefinition(itemId);
        if (!itemDef) return res.json({ success: false, error: "Предмет не существует" });

        // 1. ЛУТБОКСЫ И НАБОРЫ
        if (itemDef.category === 'Лутбокс' || itemDef.category === 'Набор ресурсов') {
            if (typeof itemDef.open !== 'function') {
                return res.json({ success: false, error: "Этот предмет нельзя открыть здесь." });
            }

            await userProfile.removeItemFromInventory(itemId, qty);
            
            const result = await itemDef.open(userProfile, null, null, userProfile.activeLuckClover);
            
            if (!result.success) {
                await userProfile.addItemToInventory(itemId, qty); // Вернуть если ошибка
                return res.json(result);
            }

            await userProfile.save();
            return res.json({ 
                success: true, 
                type: 'lootbox',
                message: result.message,
                rewards: result.rewards 
            });
        }

        // 2. УКРАШЕНИЯ (ЭКИПИРОВКА) - НОВЫЙ БЛОК
        else if (itemDef.category === 'Украшение профиля') {
            // Определяем тип украшения
            if (itemDef.decorationType === 'avatar_frame') {
                // Если эта рамка уже надета - снимаем её
                if (userProfile.activeAvatarFrameId === itemId) {
                    userProfile.activeAvatarFrameId = null;
                    await userProfile.save();
                    return res.json({ success: true, message: '🖼️ Рамка снята' });
                } else {
                    // Надеваем новую
                    userProfile.activeAvatarFrameId = itemId;
                    await userProfile.save();
                    return res.json({ success: true, message: '🖼️ Рамка успешно установлена!' });
                }
            } 
            else if (itemDef.decorationType === 'card_background') {
                // Если фон уже стоит - снимаем
                if (userProfile.activeCardBgId === itemId) {
                    userProfile.activeCardBgId = null;
                    await userProfile.save();
                    return res.json({ success: true, message: '🌄 Фон сброшен на стандартный' });
                } else {
                    // Устанавливаем новый
                    userProfile.activeCardBgId = itemId;
                    await userProfile.save();
                    return res.json({ success: true, message: '🌄 Фон профиля успешно установлен!' });
                }
            }
            else {
                 return res.json({ success: false, error: "Неизвестный тип украшения" });
            }
        }

        // 3. БУСТЕРЫ И РАСХОДНИКИ
        else if (itemDef.category === 'Расходник' || itemDef.isUsable) {
            if (typeof itemDef.use !== 'function') {
                return res.json({ success: false, error: "Этот предмет нельзя использовать." });
            }

            const result = await itemDef.use(userProfile, null, qty);

            if (result.success) {
                await userProfile.removeItemFromInventory(itemId, qty);
                await userProfile.save();
            }
            
            return res.json(result);
        }

        else {
            return res.json({ success: false, error: "Этот предмет нельзя использовать вручную." });
        }

    } catch (e) {
        console.error('Inventory Use Error:', e);
        res.json({ success: false, error: "Внутренняя ошибка сервера" });
    }
});

export default router;