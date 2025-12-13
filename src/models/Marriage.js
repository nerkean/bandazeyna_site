import mongoose from 'mongoose';

const marriageSchema = new mongoose.Schema({
    partner1Id: { type: String, required: true },
    partner2Id: { type: String, required: true },
    date: { type: Date, default: Date.now },
    familyBank: { type: Number, default: 0 },
    children: { type: Array, default: [] }
}, {
    timestamps: true 
});

marriageSchema.statics.findbyPartnerId = function(userId) {
    return this.findOne({
        $or: [{ partner1Id: userId }, { partner2Id: userId }]
    });
};

const Marriage = mongoose.model('Marriage', marriageSchema);

export default Marriage;