import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import passport from 'passport';
import { createServer } from 'http';
import { Server } from 'socket.io';
import UserProfile from './models/UserProfile.js';
import MongoStore from 'connect-mongo';
import { Strategy as DiscordStrategy } from 'passport-discord';
import compression from 'compression';
import helmet from 'helmet'; 
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import minify from 'express-minify';

import pagesRouter from './routes/pages.js';
import apiRouter from './routes/api.js';
import authRouter from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: { error: 'Слишком много запросов. Подождите 15 минут.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: 20,
    message: 'Слишком много попыток входа.'
});

const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(compression());
app.use(minify());

app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
});

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com", 
                "https://unpkg.com",
                (req, res) => `'nonce-${res.locals.nonce}'`
            ],
            scriptSrcAttr: ["'unsafe-inline'"], 
            styleSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "https://fonts.googleapis.com", 
                "https://unpkg.com"
            ],
            imgSrc: ["'self'", "data:", "https:", "blob:", "https://cdn.discordapp.com", "https://i.ibb.co"],
            connectSrc: ["'self'", "https://discord.com", "ws:", "wss:", "https://cdn.jsdelivr.net", "https://unpkg.com"], 
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false, 
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d', etag: false }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    req.io = io;
    next();
});

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('🌍 MongoDB Connected'))
    .catch(err => console.error('DB Error:', err));

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
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
    res.json({ isOnline: onlineUsers.has(req.params.userId) });
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
passport.deserializeUser((obj, done) => done(null, obj));

app.use(async (req, res, next) => {
    const start = Date.now();
    try {
        if (mongoose.connection.readyState === 1) await mongoose.connection.db.admin().ping();
        res.locals.systemStatus = { online: true, ping: Date.now() - start };
    } catch (e) { res.locals.systemStatus = { online: false, ping: 999 }; }
    next();
});

app.use('/auth', authLimiter, authRouter); 
app.use('/api', apiLimiter, apiRouter);   
app.use('/', pagesRouter);    

app.use((req, res) => { res.status(404).render('404', { user: req.user }); });

app.use((err, req, res, next) => {
    console.error('[Server Error]', err);
    res.status(500).render('500', { user: req.user, error: process.env.NODE_ENV === 'development' ? err : null });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`🚀 Сайт запущен (Production Mode): http://localhost:${PORT}`));