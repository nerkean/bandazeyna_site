import mongoose from 'mongoose';

const depositSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    guildId: { type: String, required: true },
    amount: { type: Number, required: true },
    interestRate: { type: Number, required: true }, 
    payoutAmount: { type: Number, required: true }, 
    planType: { type: String, enum: ['SAVINGS', 'FLEXIBLE'], required: true },
    
    depositDate: { type: Date, default: Date.now },
    maturityDate: { type: Date, required: true }, 
    
    status: { 
        type: String, 
        enum: ['active', 'collected', 'closed', 'completed'], 
        default: 'active' 
    }
}, { timestamps: true });

export default mongoose.model('Deposit', depositSchema);