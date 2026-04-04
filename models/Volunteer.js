const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    skills: {
        type: [String],
        default: []
    },
    availability: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    assignedTasks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    }],
    isAvailable: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    notifications: [{
        message: String,
        taskId: mongoose.Schema.Types.ObjectId,
        type: { type: String, enum: ['verified', 'rejected'] },
        read: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('Volunteer', volunteerSchema);
