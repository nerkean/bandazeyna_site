export const checkAuth = (req, res, next) => {
    // 1. Проверка авторизации
    if (req.isAuthenticated()) {
        
        // 2. Проверка на БАН
        if (req.user.isBanned) {
            
            // ИСКЛЮЧЕНИЕ: Разрешаем отправку апелляции
            if (req.originalUrl === '/api/appeal') {
                return next();
            }

            // Если это любой другой API запрос - возвращаем JSON ошибку
            if (req.originalUrl.startsWith('/api/')) {
                return res.status(403).json({ error: 'Ваш аккаунт заблокирован.' });
            }
            
            // Если обычная страница - редирект на страницу бана
            // (но если мы уже на /banned, редирект не нужен, иначе будет петля)
            if (req.originalUrl !== '/banned') {
                return res.redirect('/banned');
            }
        }

        return next();
    }

    // Если не авторизован
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ error: 'Необходима авторизация' });
    }
    
    res.redirect('/auth/discord');
};