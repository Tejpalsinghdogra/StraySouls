const mongoose = require('mongoose');

const medicalRequestSchema = new mongoose.Schema({
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
            type: String,
            required: true
        }
    },
    injuryType: {
        type: String,
        required: true,
        enum: ['Visible Wounds', 'Limping / Broken Limb', 'Skin Infection / Mange', 'Unconscious / Heavy Breathing', 'Other']
    },
    description: String,
    isEmergency: {
        type: Boolean,
        default: false
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'resolved'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('MedicalRequest', medicalRequestSchema);
