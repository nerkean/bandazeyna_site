export const checkAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(403).render('login-required', { 
        user: null, 
        title: 'Вход | Дача Зейна'
    });
};