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
import compression from 'compression';

// Импорт роутеров
import pagesRouter from './routes/pages.js';
import apiRouter from './routes/api.js';
import authRouter from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. БАЗОВЫЕ НАСТРОЙКИ (Сжатие и Статика)
// Сначала сжимаем всё
app.use(compression());

// Настраиваем view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// !!! ВАЖНО: Статика ДОЛЖНА быть здесь, одна и с кэшем.
// Это самое быстрое действие, не нужно ждать сессий и БД для отдачи CSS.
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '7d', // Кэшировать на 7 дней
    etag: false   // Отключаем ETag для экономии ресурсов (опционально)
}));

// Парсинг тела запросов
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. БАЗА ДАННЫХ
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('🌍 Сайт подключен к MongoDB'))
    .catch(err => console.error('Ошибка БД:', err));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: process.env.MONGODB_URI 
    }),
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24 * 7, 
        httpOnly: true,
        // secure: true 
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

app.use((req, res) => {
    res.status(404).render('404', { 
        user: req.user, // Чтобы навбар работал
        profile: null // Чтобы не было ошибок в навбаре, если там есть проверки
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Сайт запущен: http://localhost:${PORT}`));