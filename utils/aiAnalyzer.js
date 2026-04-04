const { GoogleGenAI } = require('@google/genai');

/**
 * Analyzes an image using Gemini 2.5 Flash vision to determine:
 * - Whether the image contains a real animal
 * - Whether the animal appears injured/in distress
 * - Estimated urgency level
 * - Animal type
 * - A short AI-generated description
 *
 * @param {string} imageUrl - Public Cloudinary URL of the uploaded image
 * @returns {Promise<{isAnimal: boolean, isInjured: boolean, urgencyLevel: string, animalType: string, aiDescription: string}>}
 */
exports.analyzeAnimalImage = async (imageUrl) => {
    // Lazily instantiate so GEMINI_API_KEY is read after dotenv.config() runs
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const fallback = {
        isAnimal: true,
        isInjured: false,
        urgencyLevel: 'low',
        animalType: 'other',
        aiDescription: ''
    };

    try {
        console.log(`[AI Analyzer] Fetching image from: ${imageUrl}`);

        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const mimeType = response.headers.get('content-type') || 'image/jpeg';
        const base64Data = Buffer.from(buffer).toString('base64');

        const prompt = `You are an expert animal welfare AI. Analyze this image and respond ONLY with a valid JSON object — no markdown, no extra text.

Rules:
- "isInjured": true if the animal appears wounded, sick, bleeding, limping, or in visible distress.
- "urgencyLevel": one of "low", "medium", or "high". Use "high" if the animal is critically injured or in immediate danger.
- "animalType": one of "dog", "cat", "bird", or "other".
- "aiDescription": a 1-2 sentence factual description of the animal's condition for the report.

Respond with ONLY this JSON structure:
{"isInjured": false, "urgencyLevel": "low", "animalType": "dog", "aiDescription": "..."}`;

        console.log(`[AI Analyzer] Sending image to Gemini 2.5 Flash for full analysis...`);

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            inlineData: {
                                data: base64Data,
                                mimeType: mimeType
                            }
                        },
                        { text: prompt }
                    ]
                }
            ]
        });

        const rawText = result.text.trim();
        console.log(`[AI Analyzer] Raw Gemini response: ${rawText}`);

        // Strip markdown code fences if Gemini wraps with ```json ... ```
        const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
        const analysis = JSON.parse(cleaned);

        // Validate and sanitise values against allowed enums
        const validUrgency = ['low', 'medium', 'high'];
        const validAnimalType = ['dog', 'cat', 'bird', 'other'];

        return {
            isAnimal:      true,
            isInjured:     typeof analysis.isInjured === 'boolean' ? analysis.isInjured : false,
            urgencyLevel:  validUrgency.includes(analysis.urgencyLevel) ? analysis.urgencyLevel : 'low',
            animalType:    validAnimalType.includes(analysis.animalType) ? analysis.animalType : 'other',
            aiDescription: typeof analysis.aiDescription === 'string' ? analysis.aiDescription : ''
        };

    } catch (err) {
        console.error('[AI Analyzer Error] Falling back to defaults:', err.message);
        // Fallback: allow the report through without blocking, but log the error
        return fallback;
    }
};
