const MedicalRequest = require('../models/MedicalRequest');

exports.createMedicalRequest = async (req, res) => {
    try {
        const { lat, lng, address, injuryType, description, isEmergency } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: 'Image is required' });
        }

        const newRequest = new MedicalRequest({
            image: req.file.path,
            location: {
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                address
            },
            injuryType,
            description,
            isEmergency: isEmergency === 'true' || isEmergency === true,
            userId: req.user ? req.user.id : null
        });

        await newRequest.save();

        res.status(201).json({ 
            success: true, 
            message: 'Medical request submitted successfully',
            data: newRequest
        });
    } catch (err) {
        console.error('Error in createMedicalRequest:', err);
        res.status(500).json({ error: 'Server error while submitting medical request' });
    }
};

exports.getMedicalRequests = async (req, res) => {
    try {
        const requests = await MedicalRequest.find().sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: 'Server error while fetching medical requests' });
    }
};
exports.getUserMedicalRequests = async (req, res) => {
    try {
        const requests = await MedicalRequest.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: 'Server error while fetching your medical requests' });
    }
};
