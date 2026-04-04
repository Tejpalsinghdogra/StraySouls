const MedicalRequest = require('../models/MedicalRequest');
const { analyzeAnimalImage } = require('../utils/aiAnalyzer');
const cloudinary = require('cloudinary').v2;

exports.createMedicalRequest = async (req, res) => {
    try {
        const { lat, lng, address, animalType, injuryType, description, isEmergency } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: 'Image is required' });
        }

        // --- AI Image Analysis (Gemini 1.5 Flash) ---
        let aiResult = null;
        if (req.file && req.file.path) {
            console.log('[Medical] Running deep AI image analysis...');
            aiResult = await analyzeAnimalImage(req.file.path);
            console.log('[Medical] AI Analysis Result:', aiResult);

            // --- Animal Type Cross-Validation ---
            const userType = animalType ? animalType.toLowerCase() : 'other';
            const aiType = aiResult.animalType ? aiResult.animalType.toLowerCase() : 'other';
            
            // Allow submission if AI says 'other' but user picked a specific type (like 'cattle')
            // Only block if there is a flat-out contradiction (e.g. user says 'cattle', AI says 'dog')
            if (userType !== 'other' && aiType !== 'other' && userType !== aiType) {
                 console.log(`[Medical] Mismatch! User selected: ${userType}, AI saw: ${aiType}. Cleaning up Cloudinary...`);
                 if (req.file.filename) {
                     await cloudinary.uploader.destroy(req.file.filename);
                 }
                 return res.status(400).json({
                     success: false,
                     error: `Validation Failed: You selected "${userType}", but the image appears to contain a "${aiType}". Please select the correct animal type.`
                 });
            }
            console.log('[Medical] AI verification passed ✓');
        }

        const finalUrgency = (aiResult && aiResult.urgencyLevel) || (isEmergency === 'true' ? 'high' : 'low');
        
        // --- Smart Description Merging ---
        const userDesc = (description || "").trim();
        const aiDesc = (aiResult && aiResult.aiDescription) || "";
        let finalDescription = userDesc;
 
        if (!userDesc) {
            finalDescription = aiDesc;
        } else if (aiDesc) {
            // Ensure the detailed AI description is appended and stored in MongoDB so it gets used everywhere
            finalDescription = `${userDesc}\n\nAI Detailed Analysis: ${aiDesc}`;
        }
        // --- End Description Merging ---
 
        const newRequest = new MedicalRequest({
            image: req.file.path,
            location: {
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                address
            },
            animalType: animalType || (aiResult && aiResult.animalType) || 'other',
            injuryType,
            description: finalDescription,
            isEmergency: isEmergency === 'true' || isEmergency === true || finalUrgency === 'high',
            userId: req.user ? req.user.id : null,
            aiAnalysis: aiResult ? {
                isInjured:     aiResult.isInjured,
                urgencyLevel:  aiResult.urgencyLevel,
                aiDescription: aiResult.aiDescription
            } : undefined
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
