const Shelter = require('../models/Shelter');

exports.registerShelter = async (req, res) => {
    try {
        const {
            organizationName,
            registrationNumber,
            contactPerson,
            contactEmail,
            address,
            capacity,
            services
        } = req.body;

        const newShelter = new Shelter({
            organizationName,
            registrationNumber,
            contactPerson,
            contactEmail,
            address,
            capacity,
            services: Array.isArray(services) ? services : JSON.parse(services || '[]'),
            certification: req.file ? req.file.path : null,
            status: 'pending'
        });

        await newShelter.save();

        res.status(201).json({
            success: true,
            msg: 'Application submitted successfully! We will review and contact you shortly.',
            shelter: newShelter
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

exports.getAllShelters = async (req, res) => {
    try {
        const shelters = await Shelter.find().sort({ createdAt: -1 });
        res.json(shelters);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateShelterStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const shelter = await Shelter.findByIdAndUpdate(id, { status }, { new: true });
        if (!shelter) {
            return res.status(404).json({ error: 'Shelter not found' });
        }
        res.json(shelter);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getShelterNotifications = async (req, res) => {
    try {
        if (req.user.role !== 'shelter') {
            return res.status(403).json({ error: 'Access denied: shelters only' });
        }

        const shelter = await Shelter.findOne({ userId: req.user.id });
        if (!shelter) {
            return res.status(404).json({ error: 'Shelter not found for this user' });
        }

        const notifications = [...shelter.notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Mark all as read
        let updated = false;
        shelter.notifications.forEach(notif => {
            if (!notif.read) {
                notif.read = true;
                updated = true;
            }
        });
        
        if (updated) {
            await shelter.save();
        }

        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
