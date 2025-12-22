import express from 'express';
import passport from 'passport';
import UserProfile from '../src/models/UserProfile.js'; 

const router = express.Router();

router.get('/discord', passport.authenticate('discord'));

router.get('/discord/callback', (req, res, next) => {
    console.log('🔄 [AUTH] Коллбэк от Discord получен...');
    passport.authenticate('discord', (err, user, info) => {
        if (err) {
            console.error('🔴 [AUTH] Ошибка Passport:', err);
            return res.redirect('/?error=auth_error');
        }
        if (!user) {
            console.error('🔴 [AUTH] Пользователь не найден:', info);
            return res.redirect('/?error=no_user');
        }

        req.logIn(user, (loginErr) => {
            if (loginErr) {
                console.error('🔴 [AUTH] Ошибка req.logIn:', loginErr);
                return next(loginErr);
            }

            console.log('✅ [AUTH] Пользователь успешно вошел:', user.username);
            
            req.session.save((saveErr) => {
                if (saveErr) {
                    console.error('🔴 [AUTH] Ошибка сохранения сессии:', saveErr);
                }
                console.log('💾 [AUTH] Сессия сохранена в БД, редирект...');
                res.redirect(`/profile/${user.id}`);
            });
        });
    })(req, res, next);
});

router.get('/logout', (req, res, next) => {
    req.logout(err => {
        if (err) return next(err);
        res.redirect('/');
    });
});

router.get('/finalize', async (req, res) => {
    const { tgId } = req.query;
    if (!tgId) return res.redirect('/');

    try {
        const user = await UserProfile.findOne({ telegramId: tgId }); 
        if (!user) return res.redirect('/?error=user_not_found');

        req.login({
            id: user.userId,
            username: user.username,
            avatar: user.avatar
        }, (err) => {
            if (err) {
                console.error('Finalize Login Error:', err);
                return res.redirect('/');
            }
            req.session.save(() => res.redirect('/'));
        });
    } catch (e) {
        console.error('Finalize Error:', e);
        res.redirect('/');
    }
});

export default router;