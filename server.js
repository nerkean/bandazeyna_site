import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import passport from 'passport';
import UserProfile from './models/UserProfile.js';
import BetaUser from './models/BetaUser.js';
import ApplicationSubmission from './models/ApplicationSubmission.js';
import MongoStore from 'connect-mongo';
import { Strategy as DiscordStrategy } from 'passport-discord';

// Импорт роутеров
import pagesRouter from './routes/pages.js';
import apiRouter from './routes/api.js';
import authRouter from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. База данных
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('🌍 Сайт подключен к MongoDB'))
    .catch(err => console.error('Ошибка БД:', err));

// 2. Настройки Express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: process.env.MONGODB_URI // Сессии будут храниться в Базе Данных
    }),
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 дней (чтобы не логиниться каждый день)
        httpOnly: true,
        // secure: true // РАСКОММЕНТИРОВАТЬ, когда подключите HTTPS (SSL сертификат)
    }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.urlencoded({ extended: true }));

app.get('/beta-login', (req, res) => {
    if (req.session.hasBetaAccess) return res.redirect('/');
    res.render('beta-login');
});

app.post('/beta-login', async (req, res) => {
    const { username, password } = req.body;
    
    // Ищем пользователя в базе
    const user = await BetaUser.findOne({ username, password });
    
    if (user) {
        req.session.hasBetaAccess = true; // Ставим "галочку" в сессии
        req.session.save(() => {
            res.redirect('/');
        });
    } else {
        res.render('beta-login', { error: 'Неверный логин или пароль' });
    }
});

app.get('/beta-apply', (req, res) => {
    res.render('beta-application');
});

app.post('/beta-apply', async (req, res) => {
    try {
        const { discordUsername, uid, reason } = req.body;
        
        // Создаем заявку
        await ApplicationSubmission.create({
            discordUsername,
            uid,
            reason
        });
        
        // Рендерим страницу с успехом
        res.render('beta-application', { success: true });
    } catch (e) {
        console.error(e);
        res.render('beta-application', { error: 'Ошибка при отправке. Попробуйте позже.' });
    }
});

// 3. Middleware защиты
app.use((req, res, next) => {
    const whiteList = [
        '/beta-login', 
        '/beta-apply', // <--- ВАЖНО: Добавили в белый список
        '/css/', '/js/', '/img/', '/assets/', '/fonts/', 
        '/auth/discord'
    ];

    if (whiteList.some(path => req.path.startsWith(path))) return next();
    if (req.session.hasBetaAccess) return next();

    res.redirect('/beta-login');
});

// --- Конфигурация Passport ---
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // При каждом входе обновляем данные пользователя в базе
        await UserProfile.findOneAndUpdate(
            { userId: profile.id, guildId: process.env.GUILD_ID },
            {
                // Обновляем актуальные данные из Discord
                username: profile.username,
                avatar: profile.avatar, 
                // Если профиля не было, эти поля создадутся
                $setOnInsert: { 
                    stars: 100, // Стартовый бонус (опционально)
                    joinedAt: new Date() 
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Возвращаем профиль в сессию
        return done(null, profile);
    } catch (err) {
        console.error("Ошибка при сохранении профиля:", err);
        return done(err, null);
    }
}));

passport.serializeUser((user, done) => done(null, {
    id: user.id, username: user.username, avatar: user.avatar, discriminator: user.discriminator
}));

passport.deserializeUser((obj, done) => done(null, obj));

// 4. Глобальные переменные (Ping, Status)
app.use(async (req, res, next) => {
    const start = Date.now();
    try {
        if (mongoose.connection.readyState === 1) await mongoose.connection.db.admin().ping();
        res.locals.systemStatus = { online: true, ping: Date.now() - start };
    } catch (e) {
        res.locals.systemStatus = { online: false, ping: 999 };
    }
    next();
});

// 5. Подключение Маршрутов
app.use('/auth', authRouter); // Все пути в auth.js будут начинаться с /auth
app.use('/api', apiRouter);   // Все пути в api.js будут начинаться с /api
app.use('/', pagesRouter);    // Остальные страницы

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Сайт запущен: http://localhost:${PORT}`));