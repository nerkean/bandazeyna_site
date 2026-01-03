import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import passport from 'passport';
import { createServer } from 'http';
import { Server } from 'socket.io';
import compression from 'compression';
import helmet from 'helmet'; 
import crypto from 'crypto';
import MongoStore from 'connect-mongo';
import { Strategy as DiscordStrategy } from 'passport-discord';
import UserProfile from './src/models/UserProfile.js';
import Notification from './src/models/Notification.js';
import pagesRouter from './routes/pages.js';
import apiRouter from './routes/api.js';
import authRouter from './routes/auth.js';
import { initTelegramBot } from './zeyna_bot/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

app.set('trust proxy', 1);

const googleDomains = [
    "https://www.google.com",
    "https://www.google.com.ua",
    "https://www.google.pl",
    "https://www.google.ru",
    "https://www.google.de",
    "https://www.google.co.uk",
    "https://www.google.fr",
    "https://www.google.it",
    "https://www.google.es",
    "https://www.google.nl",
    "https://www.google.be",
    "https://www.google.kz",
    "https://www.google.by",
    "https://googleads.g.doubleclick.net",
    "https://www.googleadservices.com",
    "https://stats.g.doubleclick.net"
];

const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.set('io', io);
app.use(compression());

app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('hex'); 
    res.locals.gaId = process.env.GOOGLE_ANALYTICS_ID; 
    next();
});

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'", 
                "blob:",
                "https://cdn.jsdelivr.net",
                "https://unpkg.com",
                "https://cdnjs.cloudflare.com",
                "https://www.googletagmanager.com",
                "https://www.google-analytics.com",
                "https://www.googleadservices.com",
                "https://googleads.g.doubleclick.net",
                "https://www.clarity.ms",
                "https://c.bing.com",
                "https://*.clarity.ms",
                "https://telegram.org"
            ],
            workerSrc: ["'self'", "blob:"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
            imgSrc: [
    "'self'", 
    "data:", 
    "blob:", 
    "https://cdn.discordapp.com", 
    "https://media.discordapp.net", 
    "https://dachazeyna.com", 
    "https://i.ibb.co", 
    "https://ik.imagekit.io", 
    "https://www.google-analytics.com", 
    "https://www.googletagmanager.com", 
    "https://*.clarity.ms", 
    "https://c.bing.com",
    "https://www.transparenttextures.com", // <--- ДОБАВЬ ЭТУ СТРОКУ
    ...googleDomains
],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            connectSrc: ["'self'", "https://dachazeyna.com", "https://cdn.jsdelivr.net", "ws:", "wss:", "https://discord.com", "https://www.google-analytics.com", "https://region1.google-analytics.com", "https://www.googletagmanager.com", "https://www.clarity.ms", "https://c.bing.com", "https://*.clarity.ms", ...googleDomains],
            frameSrc: ["'self'", "https://www.googletagmanager.com", "https://td.doubleclick.net", "https://oauth.telegram.org"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public', {
    maxAge: '1y',
    immutable: true, 
    etag: true, 
    setHeaders: (res, path) => {
        if (path.endsWith('.woff2') || path.match(/\.(webp|png|jpg|jpeg|svg)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
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

const isProduction = process.env.NODE_ENV === 'production';

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
        secure: isProduction, 
        sameSite: isProduction ? 'none' : 'lax'
    }
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

app.use(async (req, res, next) => {
    res.locals.notifications = [];
    res.locals.unreadCount = 0;
    if (req.user) {
        try {
            const timeLimit = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const notifs = await Notification.find({
                userId: req.user.id,
                read: false,
                createdAt: { $gt: timeLimit }
            }).sort({ createdAt: -1 }).lean();
            res.locals.notifications = notifs;
            res.locals.unreadCount = notifs.length;
        } catch (e) { console.error(e); }
    }
    next();
});

app.use(async (req, res, next) => {
    const start = Date.now();
    try {
        if (mongoose.connection.readyState === 1) await mongoose.connection.db.admin().ping();
        res.locals.systemStatus = { online: true, ping: Date.now() - start };
    } catch (e) { res.locals.systemStatus = { online: false, ping: 999 }; }
    next();
});

app.get('/img/tg-proxy/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const botToken = process.env.BOT_TOKEN; 

        if (!botToken) {
            console.error('🔴 [PROXY] BOT_TOKEN не задан в окружении');
            return res.status(500).end();
        }

        const getFileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`;
        const fileData = await fetch(getFileUrl).then(r => r.json());

        if (!fileData.ok) {
            console.error('🔴 [PROXY] Ошибка получения пути файла:', fileData.description);
            return res.status(404).end();
        }

        const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
        const response = await fetch(fileUrl);
        
        res.setHeader('Content-Type', response.headers.get('content-type'));
        res.setHeader('Cache-Control', 'public, max-age=31536000'); 
        
        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
    } catch (e) {
        console.error('🔴 [PROXY ERROR]:', e.message);
        res.status(500).end();
    }
});

app.use('/auth', authRouter); 
app.use('/api', apiRouter);   
app.use('/', pagesRouter);

io.on('connection', (socket) => {
    socket.on('join_room', (roomId) => socket.join(String(roomId)));
    socket.on('admin_control', (data) => {
        io.emit('stream_update', data);
    });
    const user = socket.request.user;
    if (user) socket.join(String(user.id));
});

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify'], 
    state: true,
    proxy: true,
    authorizationURL: 'https://discord.com/api/oauth2/authorize',
    tokenURL: 'https://discord.com/api/oauth2/token',
    customHeaders: {
        'User-Agent': 'DachaZeyna/1.0 (https://dachazeyna.com, 1.0.0)',
        'Accept': 'application/json'
    }
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log(`📡 [AUTH] Обмен токена прошел успешно для: ${profile.username}`);

        const user = await UserProfile.findOneAndUpdate(
            { userId: profile.id, guildId: process.env.GUILD_ID },
            {
                username: profile.username,
                avatar: profile.avatar, 
                $setOnInsert: { stars: 100, joinedAt: new Date() }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return done(null, profile);
    } catch (err) { 
        console.error('🔴 [AUTH DB ERROR]:', err);
        return done(err, null); 
    }
}));

passport.serializeUser((user, done) => done(null, { id: user.id, username: user.username, avatar: user.avatar }));
passport.deserializeUser(async (obj, done) => {
    try {
        const user = await UserProfile.findOne({ userId: obj.id }).lean();
        if (user) { user.id = user.userId; done(null, user); }
        else { done(null, obj); }
    } catch (err) { done(err, null); }
});

app.use((req, res) => { res.status(404).render('404', { user: req.user, profile: null }); });
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render('500', { user: req.user, error: err });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`🚀 Сайт запущен: http://localhost:${PORT}`);
    
    if (process.env.ENABLE_BOT === 'true') {
        initTelegramBot();
    } else {
        console.log('ℹ️ [BOT] Запуск бота отключен через ENABLE_BOT в .env');
    }
});