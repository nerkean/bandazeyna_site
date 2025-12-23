import { Telegraf } from 'telegraf';
import axios from 'axios';

export const initTelegramBot = () => {
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN;
    const WEBSITE_URL = process.env.WEBSITE_URL; 

    if (!BOT_TOKEN) {
        console.error('🔴 [BOT] Ошибка: BOT_TOKEN не найден в .env');
        return;
    }

    const bot = new Telegraf(BOT_TOKEN);

    bot.start(async (ctx) => {
        const payload = ctx.startPayload;

        if (payload && payload.startsWith('login_')) {
            const nonce = payload.replace('login_', '');
            const { id, username, first_name } = ctx.from;
            const fullUrl = `${WEBSITE_URL}/api/auth/telegram/bot-callback`;

            await ctx.reply('⏳ <b>Проверяем данные авторизации...</b>', { parse_mode: 'HTML' });

            try {
                let photo_id = null;
                const photos = await ctx.telegram.getUserProfilePhotos(id, 0, 1);
                if (photos.total_count > 0) {
                    photo_id = photos.photos[0][0].file_id;
                }

                const response = await axios.post(fullUrl, {
                    nonce: nonce,
                    telegram_id: id,
                    username: username || first_name,
                    photo_id: photo_id
                }, {
                    headers: { 'x-internal-token': INTERNAL_TOKEN }
                });

                if (response.data.success) {
                    await ctx.reply(
                        `<b>✅ Вход выполнен успешно!</b>\n\n` +
                        `Добро пожаловать на <b>Дачу Зейна</b>, <u>${first_name}</u>!\n\n` +
                        `Теперь вы можете вернуться в браузер. Страница обновится автоматически`,
                        { parse_mode: 'HTML' }
                    );
                }
            } catch (error) {
                console.error('[BOT ERROR]:', error.message);
                await ctx.reply(
                    `<b>⚠️ Ошибка связи с сайтом</b>\n\n` +
                    `Не удалось завершить вход Попробуйте обновить страницу на сайте и нажать кнопку входа еще раз`,
                    { parse_mode: 'HTML' }
                );
            }
        } else {
            await ctx.reply(
                `<b>🐝 Приветствуем на Даче Зейна!</b>\n\n` +
                `Этот бот поможет тебе авторизоваться на нашем сайте и получать важные уведомления\n\n` +
                `🌐 <b>Наш сайт:</b> <a href="${WEBSITE_URL}">dachazeyna.com</a>`,
                { parse_mode: 'HTML', disable_web_page_preview: true }
            );
        }
    });

    bot.launch().then(() => {
        console.log('🚀 [BOT] Telegram бот запущен!');
    }).catch((err) => {
        console.error('🔴 [BOT] Ошибка запуска:', err.message);
    });
    
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
};