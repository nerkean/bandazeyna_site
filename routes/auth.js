import express from 'express';
import passport from 'passport';
import UserProfile from '../src/models/UserProfile.js'; 

const router = express.Router();

router.get('/discord', passport.authenticate('discord'));

router.get('/discord/callback', (req, res, next) => {
    passport.authenticate('discord', (err, user, info) => {
        if (err) {
            console.error('🔴 [AUTH ERROR]:', err);

            if (err.oauthError && (err.oauthError.statusCode === 429 || err.oauthError.data?.includes('1015'))) {
                console.warn('⚠️ [AUTH] Обнаружен бан IP от Discord/Cloudflare на Render.');
                return res.redirect('/?error=discord_limit');
            }

            return res.redirect('/?error=auth_failed');
        }

        if (!user) return res.redirect('/?error=no_user');

        req.logIn(user, (loginErr) => {
            if (loginErr) return next(loginErr);
            req.session.save(() => {
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