import { StaticAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { EventSubWsListener } from '@twurple/eventsub-ws';

export const initTwitch = async (io) => {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const accessToken = process.env.TWITCH_ACCESS_TOKEN;
    const userId = process.env.TWITCH_USER_ID;

    try {
        const authProvider = new StaticAuthProvider(clientId, accessToken);
        const apiClient = new ApiClient({ authProvider });
        const listener = new EventSubWsListener({ apiClient });
        
        await listener.start();
        console.log('🟢 [TWITCH] Слушатель EventSub успешно запущен!');

        await listener.onChannelRedemptionAdd(userId, (event) => {
            const rewardTitle = event.rewardTitle.toLowerCase();
            console.log(`🎁 [TWITCH] Награда: ${rewardTitle}`);

            if (rewardTitle.includes('мёд')) {
                io.emit('stream_update', { action: 'vfx', type: 'honey_rain' });
            } 
            else if (rewardTitle.includes('глитч') || rewardTitle.includes('хайп') || rewardTitle.includes('эпик')) {
                io.emit('stream_update', { action: 'vfx', type: 'epic_pulse' });
            } 
            else if (rewardTitle.includes('золото')) {
                io.emit('stream_update', { action: 'vfx', type: 'gold_aura' });
            } 
            else if (rewardTitle.includes('фото') || rewardTitle.includes('папарацци')) {
                io.emit('stream_update', { action: 'vfx', type: 'paparazzi' });
            }
            else if (rewardTitle.includes('желе') || rewardTitle.includes('радуга')) {
    io.emit('stream_update', { action: 'vfx', type: 'royal_jelly' });
}
        });

    } catch (err) {
        console.error('🔴 [TWITCH ERROR]:', err.message);
    }
};