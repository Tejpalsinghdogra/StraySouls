const Report = require('../models/Report');
const Shelter = require('../models/Shelter');
const Appointment = require('../models/Appointment');

// Get all reports
exports.getReports = async (req, res) => {
    try {
        const reports = await Report.find().sort({ createdAt: -1 });
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Create a new report
exports.createReport = async (req, res) => {
    try {
        const { lat, lng, address, animalType, urgency, description } = req.body;
        console.log('Incoming Report Data:', { lat, lng, address, animalType, urgency });
        console.log('Uploaded File:', req.file);

        const newReport = new Report({
            image: req.file ? req.file.path : '',
            location: {
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                address
            },
            animalType,
            urgency,
            description,
            userId: req.user ? req.user.id : null,
            status: 'pending'
        });

        console.log('Saving New Report...');
        await newReport.save();
        console.log('Report Saved Successfully:', newReport._id);

        // Emit real-time event if io is passed or available globally
        // For now, we'll need to handle io differently or pass it to the controller
        // A common pattern is to attach io to req in middleware
        if (req.io) {
            req.io.emit('new-report', newReport);
        }

        res.status(201).json(newReport);
    } catch (err) {
        console.error('CONTROLLER ERROR:', err);
        if (!res.headersSent) {
            res.status(500).json({ 
                success: false,
                error: err.message || 'Server Error' 
            });
        }
    }
};

// Get stats for admin dashboard
exports.getReportStats = async (req, res) => {
    try {
        const totalReports = await Report.countDocuments();
        const pendingAdoptions = await Appointment.countDocuments({ status: 'pending' });
        const shelterRequests = await Shelter.countDocuments({ status: 'pending' });
        
        // For donations, we don't have a model yet, so we'll return a placeholder or 0
        const donationsToday = 0; 

        res.json({
            totalReports,
            pendingAdoptions,
            shelterRequests,
            donationsToday
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update report status
exports.updateReportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const report = await Report.findByIdAndUpdate(id, { status }, { new: true });
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        if (req.io) {
            req.io.emit('report-status-updated', report);
        }

        res.json(report);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get a single report by ID
exports.getReportById = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        res.json(report);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
