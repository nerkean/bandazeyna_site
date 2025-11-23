export const checkAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    // Раньше было: res.redirect('/auth/discord');
    // Теперь:
    res.status(403).render('login-required', { 
        user: null, // Важно передать null, чтобы навбар не сломался
        title: 'Вход | Дача Зейна'
    });
};