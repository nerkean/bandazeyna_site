import { Schema, model } from 'mongoose';

const voiceSessionSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  joinTime: { type: Number, required: true },
  lastTextMessageTimestamp: { type: Number, default: 0 } 
});

voiceSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

const VoiceSession = model('VoiceSession', voiceSessionSchema);

export default VoiceSession;