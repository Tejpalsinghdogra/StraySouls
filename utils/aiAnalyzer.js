const { GoogleGenAI } = require('@google/genai');
const fs   = require('fs');
const path = require('path');

/**
 * Analyzes an animal image using Gemini 2.5 Flash Vision.
 *
 * CONFIRMED WORKING MODEL: gemini-2.5-flash
 * SDK: @google/genai  (new unified SDK - NOT @google/generative-ai)
 * Correct call pattern: ai.models.generateContent({ model, contents })
 *
 * Returns:
 *  - isAnimal      : boolean
 *  - isInjured     : boolean
 *  - urgencyLevel  : 'low' | 'medium' | 'high'
 *  - animalType    : 'dog' | 'cat' | 'bird' | 'cattle' | 'other'
 *  - aiDescription : detailed string — stored in Report.description in MongoDB
 */
exports.analyzeAnimalImage = async (imageUrl) => {

    const WORKING_MODEL = 'gemini-2.5-flash-lite';

    const fallback = {
        isAnimal:      true,
        isInjured:     false,
        urgencyLevel:  'low',
        animalType:    'other',
        aiDescription: 'AI analysis is currently unavailable (limit reached). Please manually describe the animal and its condition.'
    };

    if (!imageUrl) {
        console.error('[AI Analyzer] No image URL provided.');
        return fallback;
    }

    try {
        // ── 1. Initialize Gemini client ───────────────────────────────────────
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not set in environment.');
        }
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // ── 2. Load image as base64 ───────────────────────────────────────────
        let base64Data;
        let mimeType = 'image/jpeg';

        console.log(`[AI Analyzer] Processing image: ${imageUrl}`);

        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            // Cloudinary / remote URL — fetch and convert to base64
            const fetchResp = await fetch(imageUrl);
            if (!fetchResp.ok) {
                throw new Error(`Failed to fetch image (${fetchResp.status}): ${fetchResp.statusText}`);
            }
            const arrayBuf = await fetchResp.arrayBuffer();
            const ct       = fetchResp.headers.get('content-type') || '';
            mimeType       = ct.split(';')[0].trim() || 'image/jpeg';
            base64Data     = Buffer.from(arrayBuf).toString('base64');
            console.log(`[AI Analyzer] Fetched from remote URL. mimeType=${mimeType}, size=${arrayBuf.byteLength} bytes`);
        } else {
            // Local disk path (Multer disk storage fallback)
            const absolutePath = path.isAbsolute(imageUrl)
                ? imageUrl
                : path.join(process.cwd(), imageUrl);

            if (!fs.existsSync(absolutePath)) {
                throw new Error(`Local file not found: ${absolutePath}`);
            }

            const buffer = fs.readFileSync(absolutePath);
            base64Data   = buffer.toString('base64');
            const ext    = path.extname(absolutePath).toLowerCase();
            if      (ext === '.png')  mimeType = 'image/png';
            else if (ext === '.webp') mimeType = 'image/webp';
            else if (ext === '.gif')  mimeType = 'image/gif';
            else                      mimeType = 'image/jpeg';
            console.log(`[AI Analyzer] Loaded local file. mimeType=${mimeType}, size=${buffer.length} bytes`);
        }

        // ── 3. Build the prompt ───────────────────────────────────────────────
        const prompt = `You are an expert animal welfare AI assistant analyzing images for a stray animal reporting platform.

Analyze the image and respond with ONLY a valid JSON object — no markdown, no code fences, no extra text.

Required JSON fields:
- "isAnimal"      : boolean — true if the image clearly contains an animal (dog, cat, bird, etc.), false if it is just a building, landscape, person, or inanimate object.
- "isInjured"     : boolean — true if the animal shows any wound, bleeding, limping, swelling, skin disease, or visible distress.
- "urgencyLevel"  : string  — exactly one of: "low", "medium", "high". Use "high" for critical injuries or immediate danger.
- "animalType"    : string  — exactly one of: "dog", "cat", "bird", "cattle", "other".
- "aiDescription" : string  — Write a brief 2-3 line description covering: the animal type/breed, its visible condition or any injuries, and the surrounding environment. Keep it concise but informative as it will be stored in the database and shown on reports.

Respond with ONLY the JSON object. Example format:
{"isAnimal": true, "isInjured": true, "urgencyLevel": "high", "animalType": "dog", "aiDescription": "A medium-sized stray dog with a dirty coat and a visible wound on its hind leg. The animal appears weak and unable to stand, with signs of infection. Found on a busy urban roadside with no shelter nearby."}

Now analyze the uploaded image:`;

        // ── 4. Call Gemini (new @google/genai SDK) ────────────────────────────
        console.log(`[AI Analyzer] Calling ${WORKING_MODEL}...`);

        const result = await ai.models.generateContent({
            model: WORKING_MODEL,
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                data:     base64Data,
                                mimeType: mimeType
                            }
                        }
                    ]
                }
            ]
        });

        // ── 5. Safely extract text from response ──────────────────────────────
        let rawText = '';
        if (typeof result.text === 'string' && result.text.length > 0) {
            rawText = result.text.trim();
        } else if (result.candidates && result.candidates[0]) {
            rawText = (result.candidates[0].content.parts || [])
                .map(p => p.text || '')
                .join('')
                .trim();
        }

        console.log(`[AI Analyzer] Raw response: ${rawText.substring(0, 300)}`);

        if (!rawText) throw new Error('Gemini returned an empty response');

        // Strip accidental markdown code fences
        const cleaned = rawText
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim();

        // ── 6. Parse and validate ─────────────────────────────────────────────
        const analysis = JSON.parse(cleaned);

        const validUrgency    = ['low', 'medium', 'high'];
        const validAnimalType = ['dog', 'cat', 'bird', 'cattle', 'other'];

        const aiDescription = (typeof analysis.aiDescription === 'string' ? analysis.aiDescription : '').trim();

        console.log(`[AI Analyzer] ✓ Done — type:${analysis.animalType} | urgency:${analysis.urgencyLevel} | injured:${analysis.isInjured}`);
        console.log(`[AI Analyzer] Description preview: "${aiDescription.substring(0, 150)}..."`);

        return {
            isAnimal:     typeof analysis.isAnimal === 'boolean' ? analysis.isAnimal : true,
            isInjured:    typeof analysis.isInjured === 'boolean' ? analysis.isInjured : false,
            urgencyLevel: validUrgency.includes(analysis.urgencyLevel)  ? analysis.urgencyLevel : 'low',
            animalType:   validAnimalType.includes(analysis.animalType) ? analysis.animalType   : 'other',
            aiDescription
        };

    } catch (err) {
        const msg = err.message || String(err);
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
            console.error('[AI Analyzer] ✗ Quota/Rate limit hit — using fallback. Try again later.');
        } else if (msg.includes('404') || msg.includes('NOT_FOUND')) {
            console.error('[AI Analyzer] ✗ Model not found — using fallback:', msg.substring(0, 120));
        } else if (msg.includes('API_KEY') || msg.includes('INVALID_ARGUMENT')) {
            console.error('[AI Analyzer] ✗ API key issue — using fallback:', msg.substring(0, 120));
        } else {
            console.error('[AI Analyzer] ✗ Unexpected error — using fallback:', msg.substring(0, 200));
        }
        return fallback;
    }
};
