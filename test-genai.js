const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: 'Say hello in one word'
    });
    console.log("RESPONSE:", response.text);
  } catch (e) {
    console.error("ERROR:", e);
  }
}
run();
