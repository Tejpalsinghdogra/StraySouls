const Volunteer = require('../models/Volunteer');
const User = require('../models/User');

exports.registerVolunteer = async (req, res) => {
    try {
        console.log('Received volunteer registration request:', req.body);
        
        if (!req.body) {
            return res.status(400).json({ error: 'Request body is missing' });
        }

        const { name, email, phone, location, skills, availability, userId } = req.body;

        if (!name || !email || !phone || !location || !availability) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const newVolunteer = new Volunteer({
            name,
            email,
            phone,
            location,
            skills: skills || [],
            availability,
            userId, // Store userId if provided
            status: 'approved' // Auto-approve for now so user can see functionality
        });

        await newVolunteer.save();

        // Also update the User model role
        if (userId) {
            await User.findByIdAndUpdate(userId, { role: 'volunteer' });
        }

        res.status(201).json({
            message: 'Volunteer registered successfully',
            volunteer: newVolunteer
        });
    } catch (err) {
        console.error('Error registering volunteer:', err);
        res.status(500).json({ error: 'Server error registering volunteer' });
    }
};

exports.getVolunteerStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        let volunteer = await Volunteer.findOne({ userId }).sort({ createdAt: -1 });
        
        // Fallback: If not found by userId, try finding by email of the user
        if (!volunteer && userId) {
            const user = await User.findById(userId);
            if (user) {
                volunteer = await Volunteer.findOne({ email: user.email }).sort({ createdAt: -1 });
                // Automatically link if found
                if (volunteer && !volunteer.userId) {
                    volunteer.userId = userId;
                    await volunteer.save();
                }
            }
        }
        
        if (!volunteer) {
            return res.json({ status: 'none' });
        }

        // For this hackathon: auto-approve any pending volunteer when checked
        if (volunteer.status === 'pending') {
            volunteer.status = 'approved';
            await volunteer.save();
        }

        // Ensure User role is synchronized
        if (volunteer.status === 'approved' && userId) {
            await User.findByIdAndUpdate(userId, { role: 'volunteer' });
        }

        res.json({ status: volunteer.status });
    } catch (err) {
        console.error('Error fetching volunteer status:', err);
        res.status(500).json({ error: 'Server error fetching volunteer status' });
    }
};

exports.getAllVolunteers = async (req, res) => {
    try {
        const volunteers = await Volunteer.find().sort({ createdAt: -1 });
        res.json(volunteers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateVolunteerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const volunteer = await Volunteer.findByIdAndUpdate(id, { status }, { new: true });
        if (!volunteer) {
            return res.status(404).json({ error: 'Volunteer not found' });
        }
        
        // If approved, ensure user role is updated
        if (status === 'approved' && volunteer.userId) {
            await User.findByIdAndUpdate(volunteer.userId, { role: 'volunteer' });
        }

        res.json(volunteer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
