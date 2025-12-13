export const checkAuth = (req, res, next) => {
    // 1. Проверка авторизации
    if (req.isAuthenticated()) {
        
        // 2. [NEW] Проверка на БАН
        // В req.user теперь лежит документ из БД (благодаря шагу 3)
        if (req.user.isBanned) {
            
            // Если это API запрос - возвращаем JSON ошибку
            if (req.originalUrl.startsWith('/api/')) {
                return res.status(403).json({ error: 'Ваш аккаунт заблокирован.' });
            }
            
            // Если обычная страница - редирект на страницу бана
            return res.redirect('/banned');
        }

        return next();
    }

    // Если не авторизован
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ error: 'Необходима авторизация' });
    }
    
    res.redirect('/auth/discord');
};