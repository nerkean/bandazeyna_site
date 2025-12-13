import { Schema, model } from 'mongoose';

const warningSchema = new Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    moderatorTag: { type: String, required: true },
    reason: { type: String, required: true, maxlength: 512 },
    messageId: { type: String, default: null }, 
}, { timestamps: true });

warningSchema.index({ userId: 1, guildId: 1 });
warningSchema.index({ moderatorId: 1, guildId: 1 });

const Warning = model('Warning', warningSchema);

export default Warning;
