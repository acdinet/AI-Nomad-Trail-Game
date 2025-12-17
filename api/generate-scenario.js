const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async (req, res) => {
    // Setup CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `Generate a travel dilemma for an AI Engineer on a road trip. 
        Return ONLY a JSON object with:
        "scenario_text": "a 3-sentence technical or travel challenge", 
        "options": ["Choice A", "Choice B", "Choice C"]`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        
        // Clean markdown backticks if AI adds them
        const cleanJson = text.replace(/```json|```/g, "").trim();
        const data = JSON.parse(cleanJson);

        // DATA FAIL-SAFE:
        // We send both naming styles so your frontend doesn't break
        const finalOutput = {
            scenario_text: data.scenario_text || data.description || "A glitch occurred.",
            description: data.scenario_text || data.description || "A glitch occurred.",
            options: data.options || data.choices || ["Fix it", "Ignore it", "Rest"],
            choices: data.options || data.choices || ["Fix it", "Ignore it", "Rest"]
        };

        return res.status(200).json(finalOutput);

    } catch (error) {
        console.error("API Error:", error);
        return res.status(500).json({ error: error.message });
    }
};