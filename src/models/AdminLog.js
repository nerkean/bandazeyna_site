import mongoose from 'mongoose';

const AdminLogSchema = new mongoose.Schema({
    adminId: { type: String, required: true },
    adminName: { type: String, required: true }, 
    action: { type: String, required: true },   
    entity: { type: String, default: 'Wiki' },  
    targetTitle: { type: String },    
    details: { type: String },  
    timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('AdminLog', AdminLogSchema);