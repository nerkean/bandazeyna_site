import mongoose from 'mongoose';

const applicationSubmissionSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true }, 
    guildId: { type: String, required: true }, 
    submittedAt: { type: Date, default: Date.now }, 
});

applicationSubmissionSchema.index({ userId: 1, guildId: 1 }, { unique: true });

const ApplicationSubmission = mongoose.model('ApplicationSubmission', applicationSubmissionSchema);

export default ApplicationSubmission;