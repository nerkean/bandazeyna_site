import mongoose from 'mongoose';

const depositSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    guildId: { type: String, required: true },
    amount: { type: Number, required: true },
    interestRate: { type: Number, required: true }, // Например 0.05 для 5%
    payoutAmount: { type: Number, required: true }, // Сколько вернется
    planType: { type: String, enum: ['SAVINGS', 'FLEXIBLE'], required: true },
    
    depositDate: { type: Date, default: Date.now },
    maturityDate: { type: Date, required: true }, // Дата окончания
    
    status: { 
        type: String, 
        enum: ['active', 'collected', 'closed', 'completed'], 
        default: 'active' 
    }
}, { timestamps: true });

export default mongoose.model('Deposit', depositSchema);