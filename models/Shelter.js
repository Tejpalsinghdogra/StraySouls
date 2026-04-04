const mongoose = require('mongoose');

const shelterSchema = new mongoose.Schema({
    organizationName: {
        type: String,
        required: true
    },
    registrationNumber: {
        type: String
    },
    contactPerson: {
        type: String,
        required: true
    },
    contactEmail: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    capacity: {
        type: Number,
        required: true
    },
    services: {
        type: [String],
        default: []
    },
    certification: {
        type: String // URL from Cloudinary
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedTasks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    }],
    notifications: [{
        message: { type: String },
        taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
        type: { type: String, enum: ['taskAssigned', 'verified', 'rejected'] },
        read: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Shelter', shelterSchema);
