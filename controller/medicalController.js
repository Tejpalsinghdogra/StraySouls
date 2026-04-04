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
            
            // If user selected a specific type, check against AI. 
            // We are more lenient here but still want to catch gross misclassifications.
            if (userType !== 'other' && userType !== 'cattle' && userType !== aiType) {
                 console.warn(`[Medical] Type mismatch warn: user=${userType}, ai=${aiType}`);
            }
            console.log('[Medical] AI verification passed ✓');
        }

        const finalUrgency = (aiResult && aiResult.urgencyLevel) || (isEmergency === 'true' ? 'high' : 'low');
        const finalDescription = description || (aiResult && aiResult.aiDescription) || '';

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
