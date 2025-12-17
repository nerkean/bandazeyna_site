import UserProfile from '../src/models/UserProfile.js';

export const checkWikiAccess = async (req, res, next) => {
    if (!req.user) return res.redirect('/');

    // Твой ID (Главный босс) - у него всегда есть доступ
    const OWNER_ID = '438744415734071297'; 

    if (req.user.id === OWNER_ID) {
        return next();
    }

    try {
        // Проверяем в базе, есть ли галочка isWikiEditor
        const profile = await UserProfile.findOne({ userId: req.user.id });
        
        if (profile && profile.isWikiEditor) {
            return next();
        } else {
            return res.status(403).render('404', { user: req.user }); // Или страница "Нет доступа"
        }
    } catch (e) {
        console.error(e);
        res.status(500).send('Server Error');
    }
};