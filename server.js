import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import passport from 'passport';
import { createServer } from 'http';
import { Server } from 'socket.io';
import UserProfile from './src/models/UserProfile.js';
import MongoStore from 'connect-mongo';
import { Strategy as DiscordStrategy } from 'passport-discord';
import compression from 'compression';
import helmet from 'helmet'; 
import crypto from 'crypto';

import pagesRouter from './routes/pages.js';
import apiRouter from './routes/api.js';
import authRouter from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// app.set('trust proxy', 1); 
app.use(compression());

app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    
    // ДОБАВЛЯЕМ ЭТУ СТРОКУ:
    res.locals.gaId = process.env.GOOGLE_ANALYTICS_ID; 
    
    next();
});

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'", "'unsafe-inline'", 
                "https://cdn.jsdelivr.net", "https://unpkg.com", "https://cdnjs.cloudflare.com",
                "https://dachazeyna.com",
                "https://www.googletagmanager.com" // <--- ДОБАВЛЕНО (для загрузки скрипта)
            ],
            scriptSrcAttr: ["'unsafe-inline'"], 
            styleSrc: [
                "'self'", "'unsafe-inline'", 
                "https://fonts.googleapis.com", "https://unpkg.com", "https://cdnjs.cloudflare.com"
            ],
            imgSrc: [
                "'self'", 
                "data:", 
                "blob:", 
                "https://cdn.discordapp.com", 
                "https://media.discordapp.net", 
                "https://dachazeyna.com", 
                "https://i.ibb.co",
                "https://ik.imagekit.io",
                "https://www.google-analytics.com", // <--- ДОБАВЛЕНО (для пикселей отслеживания)
                "https://www.googletagmanager.com"  // <--- ДОБАВЛЕНО
            ],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            connectSrc: [
                "'self'", "https://dachazeyna.com", "https://cdn.jsdelivr.net",
                "ws:", "wss:", "https://discord.com",
                "https://www.google-analytics.com", // <--- ДОБАВЛЕНО (куда отправлять данные)
                "https://region1.google-analytics.com" // <--- ДОБАВЛЕНО (иногда нужно для регионов)
            ],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false, 
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '30d', 
    etag: false   
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    req.io = io;
    next();
});

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('🌍 Сайт подключен к MongoDB'))
    .catch(err => console.error('Ошибка БД:', err));

// В server.js (Сайт)
const connection = mongoose.connection;

connection.once('open', () => {
    console.log('👀 Сайт следит за балансом пользователей...');
    
    // Следим за изменениями в таблице userprofiles
    const changeStream = UserProfile.watch([], { fullDocument: 'updateLookup' });

    changeStream.on('change', (change) => {
        // Если что-то обновилось
        if (change.operationType === 'update') {
            const doc = change.fullDocument;
            const updatedFields = change.updateDescription.updatedFields;

            // Если изменились звезды или осколки
            if (updatedFields.stars !== undefined || updatedFields.shards !== undefined) {
                // Шлем ивент в навбар
                io.to(doc.userId).emit('user_update', { 
                    stars: doc.stars, 
                    shards: doc.shards 
                });
            }
        }
    });
});

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 
}),
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24 * 30, 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'lax'
    }
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

const onlineUsers = new Set();

io.on('connection', (socket) => {
    const user = socket.request.user;
    if (user && user.id) {
        const userId = user.id;
        socket.join(userId);
        onlineUsers.add(userId);
        socket.broadcast.emit('user_status', { userId, status: 'online' });
        
        socket.on('disconnect', () => {
            const socketsInRoom = io.sockets.adapter.rooms.get(userId);
            if (!socketsInRoom || socketsInRoom.size === 0) {
                onlineUsers.delete(userId);
                socket.broadcast.emit('user_status', { userId, status: 'offline', lastSeen: new Date() });
            }
        });
    }
});

app.get('/api/users/status/:userId', (req, res) => {
    const isOnline = onlineUsers.has(req.params.userId);
    res.json({ isOnline });
});

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        await UserProfile.findOneAndUpdate(
            { userId: profile.id, guildId: process.env.GUILD_ID },
            {
                username: profile.username,
                avatar: profile.avatar, 
                $setOnInsert: { stars: 100, joinedAt: new Date() }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return done(null, profile);
    } catch (err) { return done(err, null); }
}));

passport.serializeUser((user, done) => done(null, { id: user.id, username: user.username, avatar: user.avatar }));
passport.deserializeUser(async (obj, done) => {
    try {
        // [FIX] Используем .lean(), чтобы получить обычный объект, а не Mongoose-документ
        const user = await UserProfile.findOne({ userId: obj.id }).lean();
        
        if (user) {
            // Теперь можно безопасно перезаписывать поля
            user.avatar = obj.avatar; 
            user.discordUsername = obj.username;
            
            // [КРИТИЧНО] Принудительно делаем user.id равным Discord ID
            // Чтобы проверки типа (user.id === targetId) работали правильно
            user.id = user.userId; 
            
            done(null, user);
        } else {
            done(null, obj);
        }
    } catch (err) {
        done(err, null);
    }
});

app.use(async (req, res, next) => {
    const start = Date.now();
    try {
        if (mongoose.connection.readyState === 1) await mongoose.connection.db.admin().ping();
        res.locals.systemStatus = { online: true, ping: Date.now() - start };
    } catch (e) { res.locals.systemStatus = { online: false, ping: 999 }; }
    next();
});

app.use((req, res, next) => {
    // Проверяем только если юзер авторизован И забанен
    if (req.user && req.user.isBanned) {
        
        const allowedPaths = [
            '/banned',       
            '/auth/logout',  
            '/bot',          
            '/terms',        
            '/privacy',      
            '/wiki',         
            '/css/',         
            '/js/',          
            '/assets/',      
            '/img/',
            '/api/appeal' // <--- ДОБАВИТЬ ЭТУ СТРОКУ (Разрешаем отправку формы)
        ];

        // Разрешаем Главную страницу (точное совпадение)
        if (req.path === '/') return next();

        // Проверяем, начинается ли путь с разрешенного
        const isAllowed = allowedPaths.some(prefix => req.path.startsWith(prefix));

        if (!isAllowed) {
            // Если это API запрос (например, попытка купить акцию через консоль)
            if (req.path.startsWith('/api/')) {
                return res.status(403).json({ error: 'Ваш аккаунт заблокирован.' });
            }
            
            // Если пытается зайти в профиль, инвентарь, магазин и т.д. -> на страницу бана
            return res.redirect('/banned');
        }
    }
    next();
});

// === ПОДКЛЮЧЕНИЕ МАРШРУТОВ ===
app.use('/auth', authRouter); 
app.use('/api', apiRouter);   
app.use('/', pagesRouter);

app.use((req, res) => { res.status(404).render('404', { user: req.user, profile: null }); });
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render('500', { user: req.user, error: err });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`🚀 Сайт запущен: http://localhost:${PORT}`));