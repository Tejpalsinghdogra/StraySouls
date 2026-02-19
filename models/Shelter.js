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
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Shelter', shelterSchema);
