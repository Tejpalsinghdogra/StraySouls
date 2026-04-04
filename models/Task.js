const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    location: {
        lat: Number,
        lng: Number,
        address: String
    },
    urgency: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['open', 'accepted', 'in_progress', 'pending_verification', 'completed', 'rejected'],
        default: 'open'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Linking to User ID (who has volunteer role)
    },
    reportId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Report'
    },
    assignedAt: {
        type: Date
    },
    autoAssigned: {
        type: Boolean,
        default: true
    },
    broadcastedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    completionProof: {
        imageUrl: { type: String },
        cloudinaryPublicId: { type: String },
        note: { type: String, default: '' },
        submittedAt: { type: Date }
    },
    verification: {
        status: {
            type: String,
            enum: ['pending', 'verified', 'rejected'],
            default: 'pending'
        },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reviewedAt: { type: Date },
        rejectionReason: { type: String, default: '' }
    }
});

module.exports = mongoose.model('Task', taskSchema);
