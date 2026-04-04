const Report = require('../models/Report');
const Task = require('../models/Task');
const Shelter = require('../models/Shelter');
const Appointment = require('../models/Appointment');
const cloudinary = require('cloudinary').v2;
const { analyzeAnimalImage } = require('../utils/aiAnalyzer');

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

        // --- AI Image Analysis (Gemini 2.5 Flash) ---
        let aiResult = null;
        if (req.file && req.file.path) {
            console.log('[Report] Running full AI image analysis...');
            aiResult = await analyzeAnimalImage(req.file.path);
            console.log('[Report] AI Analysis Result:', aiResult);


            // --- Animal Type Cross-Validation ---
            const userType = animalType ? animalType.toLowerCase() : 'other';
            const aiType = aiResult.animalType ? aiResult.animalType.toLowerCase() : 'other';
            
            // If user explicitly selects a specific animal (e.g., 'bird'), the AI MUST agree.
            if (userType !== 'other') {
                if (userType !== aiType) {
                    console.log(`[Report] Mismatch! User selected: ${userType}, AI saw: ${aiType}. Cleaning up Cloudinary...`);
                    if (req.file.filename) {
                        await cloudinary.uploader.destroy(req.file.filename);
                    }
                    return res.status(400).json({
                        success: false,
                        error: `Validation Failed: You selected "${userType}", but the image appears to contain a "${aiType}". Please select the correct animal type.`
                    });
                }
            }
            // --- End Animal Type Validation ---

            console.log('[Report] AI verification passed ✓');
        }
        // --- End AI Analysis ---

        // AI auto-fills urgency, animalType, description — user values are used as fallback
        const finalUrgency    = (aiResult && aiResult.urgencyLevel)  || urgency    || 'low';
        const finalAnimalType = (aiResult && aiResult.animalType)     || animalType || 'other';
        const finalDescription = description || (aiResult && aiResult.aiDescription) || '';
        // Auto-escalate status to 'pending' with high urgency if AI flags
        const finalStatus = 'pending';

        const newReport = new Report({
            image: req.file ? req.file.path : '',
            location: {
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                address
            },
            animalType:  finalAnimalType,
            urgency:     finalUrgency,
            description: finalDescription,
            userId: req.user ? req.user.id : null,
            status: finalStatus,
            aiAnalysis: aiResult ? {
                isInjured:     aiResult.isInjured,
                urgencyLevel:  aiResult.urgencyLevel,
                aiDescription: aiResult.aiDescription
            } : undefined
        });

        console.log('Saving New Report...');
        await newReport.save();
        console.log('Report Saved Successfully:', newReport._id);

        const { autoAssignTask } = require('../utils/autoAssign');
        autoAssignTask(newReport, req.io).catch(err => {
            console.error('[Auto Assign Background Error]', err);
        });

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
        const resolvedReports = await Report.countDocuments({ status: 'resolved' });
        
        // For donations, we don't have a model yet, so we'll return a placeholder or 0
        const donationsToday = 0; 

        res.json({
            totalReports,
            pendingAdoptions,
            shelterRequests,
            resolvedReports,
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

// Get resolved reports (Admin only)
exports.getResolvedReports = async (req, res) => {
    try {
        const reports = await Report.find({ status: 'resolved' })
            .populate('resolvedBy', 'name email')
            .sort({ resolvedAt: -1 });

        // We need task details too (proof image, note)
        const resolvedData = await Promise.all(reports.map(async (report) => {
            const task = await Task.findOne({ reportId: report._id, status: 'completed' });
            return {
                report,
                task: task ? {
                    completionProof: task.completionProof,
                    assignedTo: task.assignedTo,
                    verifiedAt: task.verification.reviewedAt
                } : null
            };
        }));

        res.json(resolvedData);
    } catch (err) {
        console.error('Error getting resolved reports:', err);
        res.status(500).json({ error: err.message || 'Server Error' });
    }
};
