  import mongoose from 'mongoose';

  const muteSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    moderatorTag: { type: String, required: true },
    reason: { type: String, default: 'не указана' },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  });

  muteSchema.index({ expiresAt: 1 });
  muteSchema.index({ userId: 1, guildId: 1 }, { unique: true });

  const Mute = mongoose.model('Mute', muteSchema);

  export default Mute;
