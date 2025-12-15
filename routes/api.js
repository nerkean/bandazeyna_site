import express from 'express';
import UserProfile from '../src/models/UserProfile.js';
import { checkAuth } from '../middleware/checkAuth.js';
import Message from '../src/models/Message.js';
import Article from '../src/models/Article.js'
import BanAppeal from '../src/models/BanAppeal.js';
import Idea from '../src/models/Idea.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import ImageKit from 'imagekit';
import { fileURLToPath } from 'url';
import { body, validationResult } from 'express-validator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// ==========================================
// 1. НАСТРОЙКА IMAGEKIT (ОБЛАКО)
// ==========================================
const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

// Настройка Multer для ОБЛАКА (храним в памяти, чтобы отправить в ImageKit)
const memoryStorage = multer.memoryStorage();
const uploadCloud = multer({ 
    storage: memoryStorage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Вспомогательная функция загрузки
async function uploadToCloud(fileBuffer, fileName, folder = '/wiki') {
    return new Promise((resolve, reject) => {
        imagekit.upload({
            file: fileBuffer,
            fileName: fileName,
            folder: folder,
            useUniqueFileName: true
        }, (err, response) => {
            if (err) return reject(err);
            resolve(response);
        });
    });
}

// ==========================================
// 2. НАСТРОЙКА ЛОКАЛЬНОЙ ЗАГРУЗКИ (ДЛЯ ЧАТА)
// ==========================================
// Внимание: На Render файлы чата будут пропадать при перезагрузке.
// Если нужно хранить вечно — переведи чат тоже на uploadToCloud.
const chatUploadDir = path.join(__dirname, '../public/uploads/chat');
if (!fs.existsSync(chatUploadDir)) {
    fs.mkdirSync(chatUploadDir, { recursive: true });
}

const chatDiskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, chatUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadChat = multer({ 
    storage: chatDiskStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Можно загружать только изображения!'), false);
        }
    }
});

// ==========================================
// PROXY ФУНКЦИЯ ДЛЯ БОТА
// ==========================================
const BOT_API_URL = process.env.BOT_API_URL || 'http://154.43.62.60:9818/api/v1'; 
const JWT_SECRET = process.env.JWT_SECRET || 'secret'; 

async function proxyToBot(endpoint, method, body, userId) {
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1m' });
    const url = `${BOT_API_URL}${endpoint}`;

    console.log(`[Proxy] Sending ${method} to ${url}`);

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: body ? JSON.stringify(body) : undefined
        });

        const text = await response.text(); 
        
        try {
            const data = JSON.parse(text); 
            if (!response.ok) {
                return { success: false, error: data.error || `Ошибка бота: ${response.status}` };
            }
            return data;
        } catch (e) {
            console.error(`[Proxy Error] Ответ не JSON! URL: ${url}`);
            console.error(`[Proxy Response]:`, text);
            return { success: false, error: `Ошибка сервера (Invalid JSON). Проверь консоль.` };
        }

    } catch (err) {
        console.error(`[Proxy Network Error]:`, err);
        return { success: false, error: 'Нет связи с сервером бота' };
    }
}

// ==========================================
// РОУТЫ (ТОРГОВЛЯ, МАГАЗИН И Т.Д.)
// ==========================================

router.post('/trade', checkAuth, [
    body('ticker').isString().isLength({ min: 2, max: 5 }).trim().escape(),
    body('amount').isInt({ min: 1 }).withMessage('Количество должно быть числом > 0'),
    body('action').isIn(['BUY', 'SELL']),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }
    const { ticker, amount, action } = req.body;
    
    const payload = { ticker, quantity: parseInt(amount) };
    const endpoint = action === 'BUY' ? '/stocks/buy' : '/stocks/sell';
    const result = await proxyToBot(endpoint, 'POST', payload, req.user.id);
    res.json(result);
});

router.post('/shop/buy', checkAuth, async (req, res) => {
    const { itemId, quantity } = req.body;
    const result = await proxyToBot('/shop/buy', 'POST', { itemId, quantity }, req.user.id);
    res.json(result);
});

router.post('/inventory/use', checkAuth, async (req, res) => {
    const { itemId, quantity } = req.body;
    const result = await proxyToBot('/items/use', 'POST', { itemId, quantity }, req.user.id);
    res.json(result);
});

router.post('/daily/claim', checkAuth, async (req, res) => {
    const result = await proxyToBot('/rewards/daily', 'POST', {}, req.user.id);
    res.json(result);
});

router.post('/deposit/create', checkAuth, async (req, res) => {
    const { planId, amount } = req.body;
    const result = await proxyToBot('/deposit/create', 'POST', { planId, amount }, req.user.id);
    res.json(result);
});

router.post('/deposit/action', checkAuth, async (req, res) => {
    const { depositId, action } = req.body;
    const result = await proxyToBot('/deposit/action', 'POST', { depositId, action }, req.user.id);
    res.json(result);
});

// ==========================================
// СООБЩЕНИЯ (ЧАТ)
// ==========================================

router.get('/messages/conversations', checkAuth, async (req, res) => {
    const myId = req.user.id;
    try {
        const conversations = await Message.aggregate([
            { $match: { $or: [{ senderId: myId }, { receiverId: myId }] } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: { $cond: [{ $eq: ["$senderId", myId] }, "$receiverId", "$senderId"] },
                    lastMessage: { $first: "$content" },
                    timestamp: { $first: "$createdAt" },
                    unreadCount: { $sum: { $cond: [{ $and: [{ $eq: ["$receiverId", myId] }, { $eq: ["$isRead", false] }] }, 1, 0] } }
                }
            },
            { $sort: { timestamp: -1 } }
        ]);

        const partnerIds = conversations.map(c => c._id);
        const profiles = await UserProfile.find({ userId: { $in: partnerIds } }).select('userId username avatar');
        const profileMap = new Map(profiles.map(p => [p.userId, p]));

        const result = conversations.map(c => {
            const profile = profileMap.get(c._id) || { username: 'Неизвестный', avatar: null };
            return {
                partnerId: c._id,
                username: profile.username,
                avatar: profile.avatar,
                lastMessage: c.lastMessage,
                timestamp: c.timestamp,
                unread: c.unreadCount
            };
        });

        res.json({ success: true, conversations: result });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка' });
    }
});

router.get('/messages/chat/:partnerId', checkAuth, async (req, res) => {
    const myId = req.user.id;
    const partnerId = req.params.partnerId;
    
    try {
        const [myProfile, partnerProfile] = await Promise.all([
            UserProfile.findOne({ userId: myId }),
            UserProfile.findOne({ userId: partnerId })
        ]);

        if (!partnerProfile) return res.status(404).json({ error: 'Пользователь не найден' });

        const iBlockedHim = myProfile.blockedUsers?.includes(partnerId) || false;
        const heBlockedMe = partnerProfile.blockedUsers?.includes(myId) || false;

        if (!heBlockedMe) {
            const updateResult = await Message.updateMany(
                { senderId: partnerId, receiverId: myId, isRead: false },
                { isRead: true }
            );
            if (updateResult.modifiedCount > 0) {
                req.io.to(partnerId).emit('messages_read', { readerId: myId });
            }
        }

        const messages = await Message.find({
            $or: [{ senderId: myId, receiverId: partnerId }, { senderId: partnerId, receiverId: myId }]
        }).sort({ createdAt: 1 }).limit(100);

        res.json({ 
            success: true, 
            messages,
            partner: { username: partnerProfile.username, avatar: partnerProfile.avatar },
            blockStatus: { iBlockedHim, heBlockedMe }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка чата' });
    }
});

router.post('/messages/mark_read', checkAuth, async (req, res) => {
    const { partnerId } = req.body;
    try {
        const updateResult = await Message.updateMany(
            { senderId: partnerId, receiverId: req.user.id, isRead: false },
            { isRead: true }
        );
        if (updateResult.modifiedCount > 0) {
            req.io.to(partnerId).emit('messages_read', { readerId: req.user.id });
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Err' }); }
});

// ИСПОЛЬЗУЕМ uploadChat (локальная загрузка)
router.post('/messages/send', checkAuth, (req, res) => {
    uploadChat.single('image')(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.message });

        const { receiverId, content } = req.body;
        const file = req.file;
        
        if ((!content || !content.trim()) && !file) return res.status(400).json({ error: 'Пустое сообщение' });

        try {
            const myId = req.user.id;
            const [myProfile, partnerProfile] = await Promise.all([
                UserProfile.findOne({ userId: myId }),
                UserProfile.findOne({ userId: receiverId })
            ]);

            if (!partnerProfile) return res.status(404).json({ error: 'Пользователь не найден' });
            if (myProfile.blockedUsers?.includes(receiverId)) return res.status(403).json({ error: 'Вы заблокировали его' });
            if (partnerProfile.blockedUsers?.includes(myId)) return res.status(403).json({ error: 'Вы в ЧС' });

            const msgData = {
                senderId: myId,
                receiverId,
                content: content ? content.trim() : '',
                createdAt: new Date(),
                isRead: false,
                imageUrl: file ? `/uploads/chat/${file.filename}` : undefined
            };

            const msg = await Message.create(msgData);
            
            const eventData = {
                message: msg.toObject(),
                senderUsername: req.user.username,
                senderAvatar: req.user.avatar
            };

            req.io.to(receiverId).emit('new_message', eventData);
            req.io.to(myId).emit('message_sent', eventData);
            
            res.json({ success: true, message: msg });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Ошибка БД' });
        }
    });
});

router.post('/user/block', checkAuth, async (req, res) => {
    const { targetId, action } = req.body;
    try {
        const myProfile = await UserProfile.findOne({ userId: req.user.id });
        if (!myProfile.blockedUsers) myProfile.blockedUsers = [];

        if (action === 'block') {
            if (!myProfile.blockedUsers.includes(targetId)) myProfile.blockedUsers.push(targetId);
        } else {
            myProfile.blockedUsers = myProfile.blockedUsers.filter(id => id !== targetId);
        }
        await myProfile.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Ошибка' }); }
});

router.post('/profile/comment', checkAuth, async (req, res) => {
    const { targetUserId, text } = req.body;
    const authorId = req.user.userId; 

    if (!text || text.length > 250) return res.status(400).json({ error: 'Некорректный текст' });

    try {
        const targetProfile = await UserProfile.findOne({ userId: targetUserId, guildId: process.env.GUILD_ID });
        const authorProfile = await UserProfile.findOne({ userId: authorId, guildId: process.env.GUILD_ID });
        
        const avatarHash = authorProfile ? authorProfile.avatar : req.user.avatar;

        targetProfile.profileComments.push({
            authorId: authorId,
            authorUsername: req.user.username,
            authorAvatar: avatarHash,
            comment: text.trim(),
            timestamp: new Date()
        });

        if (targetProfile.profileComments.length > 50) targetProfile.profileComments = targetProfile.profileComments.slice(-50);
        
        await targetProfile.save();
        res.json({ success: true });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: 'Ошибка сервера' }); 
    }
});

router.get('/profile/comments/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const profile = await UserProfile.findOne({ userId }).select('profileComments');
        
        if (!profile) return res.status(404).json({ error: 'Профиль не найден' });

        const allComments = profile.profileComments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const paginatedComments = allComments.slice((page - 1) * limit, page * limit);

        res.json({ 
            success: true, 
            comments: paginatedComments, 
            pagination: { 
                current: page, 
                total: Math.ceil(allComments.length / limit),
                count: allComments.length 
            } 
        });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: 'Ошибка сервера' }); 
    }
});

// ==========================================
// WIKI РОУТЫ (ОБЛАЧНАЯ ЗАГРУЗКА)
// ==========================================

router.post('/admin/wiki/delete', checkAuth, async (req, res) => {
    const ADMIN_IDS = ['438744415734071297']; 
    if (!ADMIN_IDS.includes(req.user.id)) return res.status(403).json({ error: 'Нет доступа' });

    try {
        await Article.findByIdAndDelete(req.body.id);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка удаления' });
    }
});

// ИСПОЛЬЗУЕМ uploadCloud (MemoryStorage для ImageKit)
router.post('/admin/wiki', checkAuth, uploadCloud.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'gallery', maxCount: 10 },
    { name: 'files', maxCount: 5 }
]), async (req, res) => {
    const ADMIN_IDS = ['438744415734071297'];
    if (!ADMIN_IDS.includes(req.user.id)) return res.status(403).json({ error: 'Нет доступа' });

    try {
        const { id, title, slug, description, content, category, icon, tags, isPublished, currentImage } = req.body;

        const finalSlug = slug || title.toLowerCase()
            .replace(/ /g, '-')
            .replace(/[^\w-]+/g, '');

        // 1. ГЛАВНАЯ КАРТИНКА
        let mainImagePath = currentImage || null;

        if (req.files['mainImage'] && req.files['mainImage'][0]) {
            const file = req.files['mainImage'][0];
            const result = await uploadToCloud(file.buffer, file.originalname, '/wiki/covers');
            mainImagePath = result.url;
        }

        const articleData = {
            title,
            slug: finalSlug,
            description,
            content,
            category,
            icon: icon || 'fas fa-book',
            image: mainImagePath,
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            isPublished: isPublished === 'true' || isPublished === 'on',
            author: req.user.username
        };

        // 2. ГАЛЕРЕЯ
        const newGalleryUrls = [];
        if (req.files['gallery']) {
            for (const file of req.files['gallery']) {
                const result = await uploadToCloud(file.buffer, file.originalname, '/wiki/gallery');
                newGalleryUrls.push(result.url);
            }
        }

        // 3. ФАЙЛЫ
        const newAttachments = [];
        if (req.files['files']) {
            for (const file of req.files['files']) {
                const result = await uploadToCloud(file.buffer, file.originalname, '/wiki/files');
                newAttachments.push({
                    name: Buffer.from(file.originalname, 'latin1').toString('utf8'),
                    path: result.url
                });
            }
        }

        if (id) {
            // ОБНОВЛЕНИЕ
            const updateQuery = { ...articleData };
            const mongoUpdate = { $set: updateQuery };
            
            if (newGalleryUrls.length > 0 || newAttachments.length > 0) {
                mongoUpdate.$push = {};
                if (newGalleryUrls.length > 0) mongoUpdate.$push.gallery = { $each: newGalleryUrls };
                if (newAttachments.length > 0) mongoUpdate.$push.attachments = { $each: newAttachments };
            }
            await Article.findByIdAndUpdate(id, mongoUpdate);
        } else {
            // СОЗДАНИЕ
            if (newGalleryUrls.length > 0) articleData.gallery = newGalleryUrls;
            if (newAttachments.length > 0) articleData.attachments = newAttachments;
            
            const existing = await Article.findOne({ slug: finalSlug });
            if (existing) return res.status(400).json({ error: 'Такая ссылка (slug) уже существует!' });
            
            await Article.create(articleData);
        }

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка сохранения: ' + e.message });
    }
});

// Маршрут для Бота: Обновление биржи
router.post('/market/webhook', async (req, res) => {
    try {
        // 1. Проверка безопасности
        const token = req.headers['x-internal-token'];
        if (token !== process.env.INTERNAL_API_TOKEN) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        // 2. Получаем данные от бота
        const { updates, marketTrend } = req.body;

        // 3. Отправляем всем игрокам через Socket.io
        // req.io мы добавили в server.js, он тут доступен
        if (req.io) {
            req.io.emit('market_update', { updates, marketTrend });
            console.log(`📡 [Socket] Разослано обновление биржи (${updates.length} акций)`);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка вебхука биржи:', error);
        res.status(500).json({ error: 'Internal Error' });
    }
});

// Вебхук для обновления данных пользователя (Баланс, Инвентарь)
router.post('/webhook/user', async (req, res) => {
    try {
        // 1. Проверка пароля (тот же токен, что мы ставили ранее)
        const token = req.headers['x-internal-token'];
        if (token !== process.env.INTERNAL_API_TOKEN) {
            return res.status(403).json({ error: 'Access Denied' });
        }

        const { userId, updates } = req.body;

        // 2. Отправляем в сокет конкретному пользователю
        // Пользователь подписан на комнату с именем своего userId (см. server.js)
        if (req.io) {
            req.io.to(userId).emit('user_update', updates);
            // console.log(`📡 [Socket] Обновлен юзер ${userId}`);
        }

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server Error' });
    }
});

router.post('/appeal', checkAuth, async (req, res) => {
    try {
        const { text } = req.body;
        if (!req.user.isBanned) return res.status(400).json({ error: 'Вы не забанены!' });
        if (!text || text.length < 10) return res.status(400).json({ error: 'Опишите ситуацию подробнее.' });

        // Проверяем, нет ли уже активной заявки
        const existing = await BanAppeal.findOne({ userId: req.user.id, status: 'PENDING' });
        if (existing) return res.status(400).json({ error: 'Ваша заявка уже на рассмотрении.' });

        await BanAppeal.create({
            userId: req.user.id,
            username: req.user.username,
            banReason: req.user.banReason || 'Неизвестно',
            appealText: text.trim()
        });

        res.json({ success: true, message: 'Апелляция отправлена!' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 2. Решение по апелляции (Только Админ)
router.post('/admin/appeal/decide', checkAuth, async (req, res) => {
    const ADMIN_IDS = ['438744415734071297']; // Твой ID
    if (!ADMIN_IDS.includes(req.user.id)) return res.status(403).json({ error: 'Нет доступа' });

    try {
        const { appealId, action } = req.body; // action: 'approve' | 'reject'
        
        const appeal = await BanAppeal.findById(appealId);
        if (!appeal) return res.status(404).json({ error: 'Заявка не найдена' });
        if (appeal.status !== 'PENDING') return res.status(400).json({ error: 'Заявка уже закрыта' });

        appeal.handledBy = req.user.username;
        appeal.handledAt = new Date();

        if (action === 'approve') {
            appeal.status = 'APPROVED';
            // Снимаем бан с профиля
            await UserProfile.updateOne({ userId: appeal.userId }, { 
                isBanned: false, 
                banReason: null 
            });
            // ! Тут можно добавить запрос к боту, чтобы снять роль бана в Discord, если нужно
        } else {
            appeal.status = 'REJECTED';
        }

        await appeal.save();
        res.json({ success: true, status: appeal.status });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка обработки' });
    }
});

router.post('/ideas', checkAuth, async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title || !description) return res.status(400).json({ error: 'Заполните все поля' });

        // Лимит: не больше 3 идей в статусе PENDING от одного юзера (защита от спама)
        const pendingCount = await Idea.countDocuments({ userId: req.user.id, status: 'PENDING' });
        if (pendingCount >= 3) return res.status(400).json({ error: 'Подождите проверки ваших прошлых идей.' });

        await Idea.create({
            userId: req.user.id,
            username: req.user.username,
            avatar: req.user.avatar,
            title: title.trim(),
            description: description.trim()
        });

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Админка: Решение по идее
router.post('/admin/ideas/decide', checkAuth, async (req, res) => {
    const ADMIN_IDS = ['438744415734071297']; // Твой ID
    if (!ADMIN_IDS.includes(req.user.id)) return res.status(403).json({ error: 'Нет доступа' });

    try {
        const { ideaId, status, comment } = req.body;
        await Idea.findByIdAndUpdate(ideaId, { status, adminComment: comment });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Ошибка' });
    }
});

router.post('/giveaways/join', checkAuth, async (req, res) => {
    const { giveawayId } = req.body;
    const result = await proxyToBot('/giveaways/join', 'POST', { giveawayId }, req.user.id);
    res.json(result);
});

router.get('/giveaways/:id/participants', checkAuth, async (req, res) => {
    const result = await proxyToBot(`/giveaways/${req.params.id}/participants`, 'GET', null, req.user.id);
    if (!result.success && !result.participants) {
        return res.status(500).json({ error: 'Ошибка связи с ботом' });
    }
    res.json(result);
});

router.post('/user/update', checkAuth, async (req, res) => {
    const { activeTitle } = req.body;
    const result = await proxyToBot('/user/update', 'POST', { activeTitle }, req.user.id);
    res.json(result);
});

export default router;