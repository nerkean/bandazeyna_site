import express from 'express';
import TeammateRequest from '../src/models/TeammateRequest.js';
import { checkAuth } from '../middleware/checkAuth.js'; 

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const requests = await TeammateRequest.find().sort({ createdAt: -1 });

        let myRequest = null;
        if (req.user) {
            myRequest = await TeammateRequest.findOne({ userId: req.user.id });
        }

        res.render('teammates', {
            user: req.user,
            title: 'Поиск Тиммейтов | Дача Зейна',
            currentPath: '/teammates',
            requests,
            myRequest
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Ошибка сервера');
    }
});

router.post('/create', checkAuth, async (req, res) => {
    try {
        await TeammateRequest.findOneAndDelete({ userId: req.user.id });

        let avatarUrl = '/assets/img/avatars/default_avatar.png';
        if (req.user.avatar) {
            if (req.user.id.startsWith('tg_')) {
                avatarUrl = req.user.avatar; 
            } else {
                avatarUrl = `https://cdn.discordapp.com/avatars/${req.user.id}/${req.user.avatar}.png`;
            }
        }

        await TeammateRequest.create({
            userId: req.user.id,
            username: req.user.username,
            avatar: avatarUrl,
            activityType: req.body.activityType,
            hiveColor: req.body.hiveColor,
            description: req.body.description
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка при создании заявки LFG:', err);
        res.json({ success: false, error: err.message });
    }
});

router.post('/delete', checkAuth, async (req, res) => {
    try {
        await TeammateRequest.findOneAndDelete({ userId: req.user.id });
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false });
    }
});

export default router;