const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    image: {
        type: String,
        required: true
    },
    location: {
        lat: {
            type: Number,
            required: true
        },
        lng: {
            type: Number,
            required: true
        },
        address: {
            type: String
        }
    },
    animalType: {
        type: String,
        required: true,
        enum: ['dog', 'cat', 'bird', 'cattle', 'other'],
        default: 'other'
    },
    urgency: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'low'
    },
    description: String,
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['pending', 'open', 'accepted', 'in_progress', 'resolved'],
        default: 'pending'
    },
    resolvedAt: {
        type: Date
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Volunteer'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    aiAnalysis: {
        isInjured:     { type: Boolean, default: false },
        urgencyLevel:  { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
        aiDescription: { type: String, default: '' }
    },
    numberOfStrays: {
        type: Number,
        required: true,
        min: 1,
        max: 50
    },
    routedTo: {
        type: String,
        enum: ['volunteers', 'shelters'],
        required: true
    }
});

module.exports = mongoose.model('Report', reportSchema);
