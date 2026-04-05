const Report = require('../models/Report');
const Task = require('../models/Task');
const Shelter = require('../models/Shelter');
const Appointment = require('../models/Appointment');
const cloudinary = require('cloudinary').v2;
const { analyzeAnimalImage } = require('../utils/aiAnalyzer');

// Get all reports
exports.getReports = async (req, res) => {
    try {
        const query = {};
        
        // Apply role-based filtering - skip if user explicitly passed routedTo query (admin override)
        // But for volunteers/shelters, enforce their scope
        if (req.routeScope) {
            query.routedTo = req.routeScope;
        } else if (req.query.routedTo) {
            // Only allow query param override for admins (req.routeScope is null for admin)
            if (!req.user || req.user.role === 'admin') {
                query.routedTo = req.query.routedTo;
            }
        }
        
        const reports = await Report.find(query)
            .populate('resolvedBy', 'name email role')
            .sort({ createdAt: -1 });
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Analyze image for live description (Frontend calls this before submission)
exports.analyzeImage = async (req, res) => {
    try {
        if (!req.file || !req.file.path) {
            return res.status(400).json({ error: 'No image uploaded for analysis' });
        }

        console.log('[Report] Running live AI image analysis...');
        const aiResult = await analyzeAnimalImage(req.file.path);
        console.log('[Report] Live AI Analysis Result:', aiResult);

        // We don't want to save anything yet, just return analysis
        res.json({
            success: true,
            analysis: aiResult
        });
    } catch (err) {
        console.error('[Report] Live Analysis Error:', err);
        res.status(500).json({ 
            success: false, 
            error: err.message || 'AI Analysis failed due to a server-side error' 
        });
    }
};

// Timeout wrapper — prevents Gemini from hanging the server indefinitely
function withTimeout(promise, ms = 25000) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`AI analysis timed out after ${ms}ms`)), ms)
        )
    ]);
}

// Create a new report
exports.createReport = async (req, res) => {
    try {
        const { lat, lng, address, animalType, urgency, description } = req.body;
        console.log('[Report] Incoming Data:', { lat, lng, address, animalType, urgency });
        console.log('[Report] Raw User Description:', `"${description}"`);
        console.log('[Report] Uploaded File:', req.file ? req.file.path : 'No file');

        // --- AI Image Analysis (Gemini 2.5 Flash) ---
        let aiResult = null;

        // 1) Use cached analysis from frontend to avoid double Gemini call & timeout
        if (req.body.cachedAiAnalysis) {
            try {
                aiResult = JSON.parse(req.body.cachedAiAnalysis);
                console.log('[Report] ✓ Using cached AI analysis from frontend — skipping Gemini call.');
            } catch (parseErr) {
                console.warn('[Report] Failed to parse cachedAiAnalysis, will re-analyze:', parseErr.message);
            }
        }

        // 2) Only call Gemini if no cached result and a file was uploaded
        if (!aiResult && req.file && req.file.path) {
            console.log('[Report] No cached analysis — running fresh Gemini AI analysis...');
            try {
                aiResult = await withTimeout(analyzeAnimalImage(req.file.path), 25000);
                console.log('[Report] AI Analysis Result:', aiResult);
            } catch (aiErr) {
                console.warn('[Report] AI analysis failed or timed out, using defaults:', aiErr.message);
                aiResult = null;
            }
        }

        // --- Animal Type Cross-Validation (only when AI result is available) ---
        if (aiResult) {
            const userType = animalType ? animalType.toLowerCase() : 'other';
            const aiType   = aiResult.animalType ? aiResult.animalType.toLowerCase() : 'other';

            // Block only on clear contradiction; allow when either side is 'other'
            if (userType !== 'other' && aiType !== 'other' && userType !== aiType) {
                console.log(`[Report] Mismatch! User: ${userType}, AI: ${aiType}. Cleaning up Cloudinary...`);
                if (req.file && req.file.filename) {
                    await cloudinary.uploader.destroy(req.file.filename);
                }
                return res.status(400).json({
                    success: false,
                    error: `Validation Failed: You selected "${userType}", but the image appears to contain a "${aiType}". Please select the correct animal type.`
                });
            }
            console.log('[Report] AI verification passed ✓');
        }
        // --- End AI Analysis ---

        // AI auto-fills urgency, animalType, description — user values are used as fallback
        const finalUrgency    = (aiResult && aiResult.urgencyLevel)  || urgency    || 'low';
        const finalAnimalType = (aiResult && aiResult.animalType)     || animalType || 'other';
        
        // --- Smart Description Merging ---
        const userDesc = (description || "").trim();
        const aiDesc = (aiResult && aiResult.aiDescription) || "";
        let finalDescription = userDesc;
 
        if (!userDesc) {
            finalDescription = aiDesc;
        } else if (aiDesc && !userDesc.includes(aiDesc)) {
            // Ensure the detailed AI description is appended only if it's not already in the user's text
            finalDescription = `${userDesc}\n\nAI Detailed Analysis: ${aiDesc}`;
        }
        // --- End Description Merging ---
 
        const finalStatus = 'pending';

        // --- Smart Routing: Number of Strays ---
        const numberOfStrays = parseInt(req.body.numberOfStrays);
        if (!numberOfStrays || numberOfStrays < 1) {
            return res.status(400).json({ success: false, message: "Number of strays must be at least 1" });
        }
        if (numberOfStrays > 50) {
            return res.status(400).json({ success: false, message: "Number of strays cannot exceed 50" });
        }
        const routedTo = numberOfStrays <= 2 ? "volunteers" : "shelters";
        // --- End Smart Routing ---

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
            } : undefined,
            numberOfStrays,
            routedTo
        });

        console.log('Saving New Report...');
        await newReport.save();
        console.log('Report Saved Successfully:', newReport._id);

        // --- Emit Socket.io event based on routing ---
        if (routedTo === "volunteers") {
            req.io.emit("new_report_volunteers", {
                reportId: newReport._id,
                location: newReport.location,
                animalType: newReport.animalType,
                urgency: newReport.urgency,
                numberOfStrays,
                message: `New report: ${numberOfStrays} stray(s) need volunteer assistance`
            });
        } else {
            req.io.emit("new_report_shelters", {
                reportId: newReport._id,
                location: newReport.location,
                animalType: newReport.animalType,
                urgency: newReport.urgency,
                numberOfStrays,
                message: `New report: ${numberOfStrays} strays require NGO/Shelter response`
            });
        }
        // --- End Socket.io events ---

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
