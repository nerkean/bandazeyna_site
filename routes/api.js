import express from 'express';
import UserProfile from '../models/UserProfile.js';
import { checkAuth } from '../middleware/checkAuth.js';
import Message from '../models/Message.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { body, validationResult } from 'express-validator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

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

const uploadDir = path.join(__dirname, '../public/uploads/chat');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Можно загружать только изображения!'), false);
        }
    }
});

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
    
    const payload = {
        ticker: ticker,
        quantity: parseInt(amount)
    };

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

router.post('/messages/send', checkAuth, (req, res) => {
    upload.single('image')(req, res, async (err) => {
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
    if (!text || text.length > 250) return res.status(400).json({ error: 'Некорректный текст' });

    try {
        const targetProfile = await UserProfile.findOne({ userId: targetUserId, guildId: process.env.GUILD_ID });
        const authorProfile = await UserProfile.findOne({ userId: req.user.id, guildId: process.env.GUILD_ID });
        
        targetProfile.profileComments.push({
            authorId: req.user.id,
            authorUsername: req.user.username,
            authorAvatar: authorProfile ? authorProfile.avatar : req.user.avatar,
            comment: text.trim(),
            timestamp: new Date()
        });
        if (targetProfile.profileComments.length > 50) targetProfile.profileComments = targetProfile.profileComments.slice(-50);
        await targetProfile.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Ошибка' }); }
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