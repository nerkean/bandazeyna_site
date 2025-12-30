import mongoose from 'mongoose';

const nomineeSloganSchema = new mongoose.Schema({
    userId: { 
        type: String, 
        required: true, 
        unique: true
    },
    username: String,
    responses: [{
        nominationId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Nomination' 
        },
        nominationTitle: String,
        slogan: String
    }],
    submittedAt: { 
        type: Date, 
        default: Date.now 
    }
});

export default mongoose.model('NomineeSlogan', nomineeSloganSchema);