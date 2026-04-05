const mongoose = require('mongoose');

const redemptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rewardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reward',
        required: true
    },
    status: {
        type: String,
        enum: ['pending_fulfillment', 'fulfilled'],
        default: 'pending_fulfillment'
    },
    redeemedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Redemption', redemptionSchema);
