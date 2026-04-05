const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'volunteer', 'admin', 'ngo', 'shelter'],
        default: 'user'
    },
    // Reward System Fields
    pointsBalance: {
        type: Number,
        default: 0
    },
    totalPointsEarned: {
        type: Number,
        default: 0
    },
    badges: [{
        type: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);
