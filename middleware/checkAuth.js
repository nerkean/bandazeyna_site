export const checkAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        
        if (req.user.isBanned) {
            
            if (req.originalUrl === '/api/appeal') {
                return next();
            }

            if (req.originalUrl.startsWith('/api/')) {
                return res.status(403).json({ error: 'Ваш аккаунт заблокирован.' });
            }
            
            if (req.originalUrl !== '/banned') {
                return res.redirect('/banned');
            }
        }

        return next();
    }

    if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ error: 'Необходима авторизация' });
    }
    
    res.redirect('/auth/discord');
};