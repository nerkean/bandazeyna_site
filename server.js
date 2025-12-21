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
import PixelBoard from './src/models/PixelBoard.js';
import teammatesRoutes from './routes/teammates.js';
import Notification from './src/models/Notification.js';
import cron from 'node-cron';
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

app.set('io', io)

app.use(compression());

app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    res.locals.gaId = process.env.GOOGLE_ANALYTICS_ID; 
    next();
});

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

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.jsdelivr.net",
                "https://unpkg.com",
                "https://cdnjs.cloudflare.com",
                "https://www.googletagmanager.com",
                "https://www.google-analytics.com",
                "https://www.googleadservices.com",
                "https://googleads.g.doubleclick.net",
                "https://www.clarity.ms",
                "https://c.bing.com",
                "https://*.clarity.ms"
            ],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: [
                "'self'", "'unsafe-inline'",
                "https://fonts.googleapis.com", 
                "https://unpkg.com", 
                "https://cdnjs.cloudflare.com"
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
                "https://www.google-analytics.com",
                "https://www.googletagmanager.com",
                "https://*.clarity.ms",
                "https://c.bing.com",
                ...googleDomains
            ],
            fontSrc: [
                "'self'", 
                "https://fonts.gstatic.com",
                "https://cdnjs.cloudflare.com" 
            ],
            connectSrc: [
                "'self'", 
                "https://dachazeyna.com", 
                "https://cdn.jsdelivr.net",
                "ws:", "wss:", 
                "https://discord.com",
                "https://www.google-analytics.com",
                "https://region1.google-analytics.com",
                "https://www.googletagmanager.com",
                "https://www.clarity.ms",
                "https://c.bing.com",
                "https://*.clarity.ms",
                ...googleDomains
            ],
            frameSrc: [
                "'self'",
                "https://www.googletagmanager.com",
                "https://td.doubleclick.net"
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

const connection = mongoose.connection;

connection.once('open', () => {
    console.log('👀 Сайт следит за балансом пользователей...');
    
    const changeStream = UserProfile.watch([], { fullDocument: 'updateLookup' });

    changeStream.on('change', (change) => {
        if (change.operationType === 'update') {
            const doc = change.fullDocument;
            const updatedFields = change.updateDescription.updatedFields;

            if (updatedFields.stars !== undefined || updatedFields.shards !== undefined) {
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

let boardCache = new Array(10000).fill('#222222');

async function initBoard() {
    let board = await PixelBoard.findOne();
    if (!board) {
        board = await PixelBoard.create({ pixels: boardCache });
    } else {
        if (board.pixels.length < 10000) {
            board.pixels = board.pixels.concat(new Array(10000 - board.pixels.length).fill('#222222'));
        }
        boardCache = board.pixels;
    }
    console.log('🎨 Pixel War доска загружена!');
}
initBoard();

async function saveBoard() {
    await PixelBoard.findOneAndUpdate({}, { pixels: boardCache, lastUpdated: new Date() }, { upsert: true });
}
setInterval(saveBoard, 30000);

io.on('connection', (socket) => {
    console.log(`🔌 [SOCKET] Новое соединение: ${socket.id}`);

    const user = socket.request.user;

   if (user) {
        const userId = String(user.id); 
        
        console.log(`✅ [SOCKET] Пользователь опознан: ${user.username} (ID: ${userId})`);
        
        socket.join(userId);

        socket.on('join_room', (id) => {
            if (id === userId) {
                socket.join(id);
                console.log(`📡 [SOCKET] Ручная подписка на комнату: ${id}`);
            }
        });
        
        onlineUsers.add(userId);
        socket.broadcast.emit('user_status', { userId, status: 'online' });

        socket.on('disconnect', () => {
            console.log(`❌ [SOCKET] Отключился: ${user.username}`);
            const socketsInRoom = io.sockets.adapter.rooms.get(userId);
            if (!socketsInRoom || socketsInRoom.size === 0) {
                onlineUsers.delete(userId);
                socket.broadcast.emit('user_status', { userId, status: 'offline', lastSeen: new Date() });
            }
        });
    }
socket.on('get_board', () => {
        socket.emit('board_data', boardCache);
    });

    socket.on('place_pixel', async ({ index, color, userId }) => {
        try {
            if (index < 0 || index >= 10000) return;
            
            const user = await UserProfile.findOne({ userId });
            if (!user) return;

            const now = new Date();
            const cooldownTime = 5 * 60 * 1000; 
            const lastPlace = user.lastPixelTime || 0;
            const diff = now - lastPlace;

            let cost = 0;

            if (diff < cooldownTime) {
                cost = 10; 
                if (user.stars < cost) {
                    socket.emit('pixel_error', 'Кулдаун! Либо жди, либо плати 10 звезд (не хватает).');
                    return;
                }
            }

            if (cost > 0) {
                user.stars -= cost;
                user.lastPixelTime = now; 
                await user.save();
                
                socket.emit('user_update', { stars: user.stars });
            } else {
                user.lastPixelTime = now;
                await user.save();
            }

            boardCache[index] = color;

            io.emit('pixel_update', { index, color, userId: user.userId, username: user.username });
        } catch (e) {
            console.error(e);
        }
    });

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
        const user = await UserProfile.findOne({ userId: obj.id }).lean();
        
        if (user) {
            user.avatar = obj.avatar; 
            user.discordUsername = obj.username;
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
        } catch (e) {
            console.error('Ошибка загрузки уведомлений:', e);
        }
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

app.use((req, res, next) => {
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
            '/api/appeal' 
        ];

        if (req.path === '/') return next();

        const isAllowed = allowedPaths.some(prefix => req.path.startsWith(prefix));

        if (!isAllowed) {
            if (req.path.startsWith('/api/')) {
                return res.status(403).json({ error: 'Ваш аккаунт заблокирован.' });
            }
            
            return res.redirect('/banned');
        }
    }
    next();
});

app.use('/auth', authRouter); 
app.use('/api', apiRouter);   
app.use('/', pagesRouter);
app.use('/teammates', teammatesRoutes);

app.use((req, res) => { res.status(404).render('404', { user: req.user, profile: null }); });
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render('500', { user: req.user, error: err });
});

cron.schedule('0 20 * * *', async () => {
    console.log('⏰ [CRON] Проверка ежедневных наград (Timezone: MSK)...');
    
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const usersToRemind = await UserProfile.find({
            $or: [
                { lastDailyReward: { $exists: false } },
                { lastDailyReward: null },
                { lastDailyReward: { $lt: startOfToday } }
            ]
        }).select('userId username');

        console.log(`🔍 Найдено ${usersToRemind.length} игроков, не забравших награду.`);

        for (const user of usersToRemind) {
            const newNotif = await Notification.create({
                userId: user.userId,
                type: 'WARNING',
                message: '🌙 День заканчивается! Не забудьте забрать ежедневную награду 🎁',
                link: '/daily'
            });

            io.to(user.userId).emit('new_notification', {
                _id: newNotif._id,
                type: newNotif.type,
                message: newNotif.message,
                link: newNotif.link,
                createdAt: newNotif.createdAt,
                read: false
            });
        }
        
    } catch (e) {
        console.error('❌ [CRON ERROR]', e);
    }
}, {
    scheduled: true,
    timezone: "Europe/Moscow" 
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`🚀 Сайт запущен: http://localhost:${PORT}`));