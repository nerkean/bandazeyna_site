// routes/auth.js
import express from 'express';
import passport from 'passport';

const router = express.Router();

router.get('/discord', passport.authenticate('discord'));

router.get('/discord/callback', 
    passport.authenticate('discord', { failureRedirect: '/' }), 
    (req, res) => res.redirect('/profile')
);

router.get('/logout', (req, res, next) => {
    req.logout(err => {
        if (err) return next(err);
        res.redirect('/');
    });
});

export default router; // Важно: здесь не /auth/..., префиксы зададим в server.js