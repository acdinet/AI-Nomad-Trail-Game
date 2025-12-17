const { GoogleGenAI } = require('@google/genai');

// Initialize the GoogleGenAI client.
// It will automatically use the GEMINI_API_KEY from your Vercel environment variables.
const ai = new GoogleGenAI({});

// Define the system instruction to guide the model's behavior
const systemInstruction = `You are a creative game master for a dynamic, text-based survival game.
Your task is to generate a new, unique scenario based on the latest global news, specifically around natural events, technological breakthroughs, or socio-political events.
The output MUST be a single, raw JSON object with no markdown formatting (no \`\`\`json\`).
The JSON object must contain these two fields:
1. "scenario_text": (string) A compelling, short narrative (3-5 sentences) that describes the player's current situation, linking it directly to the information retrieved from the search tool.
2. "options": (array of strings) A list of three distinct, plausible player choices for how to proceed in this new situation.

Example JSON:
{"scenario_text": "The latest reports of a massive solar flare disrupting GPS systems globally have reached your remote cabin. All navigation and satellite communication is down. You hear a distant emergency broadcast on a short-wave radio.", "options": ["Try to repair the old compass you have stored away.", "Venture out to a nearby town to find the source of the broadcast.", "Stay put and wait for official instructions to be transmitted."]}
`;

/**
 * Vercel Serverless Function handler (using CommonJS)
 * @param {object} req - Request object (Vercel's standard Node.js request)
 * @param {object} res - Response object (Vercel's standard Node.js response)
 */
module.exports = async (req, res) => {
    // 1. Setup CORS (Vercel uses res.setHeader for this style)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed.' });
    }

    try {
        // This prompt explicitly forces the use of the search tool
        const prompt = 'Using the latest information available from your search tool, generate a brand new, unique scenario for a text-based survival game. The scenario must be based on a recent global event, such as a natural disaster, political crisis, or major technology failure.';

        // 2. Call the Gemini API with the required configuration
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                // Enforce the model to output a valid JSON object
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'object',
                    properties: {
                        scenario_text: {
                            type: 'string',
                            description: 'A short narrative describing the player\'s new situation.'
                        },
                        options: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: 'Three distinct player choices.'
                        }
                    },
                    required: ['scenario_text', 'options']
                },
                // Provide the system instruction to define the model's role
                systemInstruction: systemInstruction,
                // *** Enabling the Google Search tool for grounding ***
                tools: [{ googleSearch: {} }],
                // Setting temperature slightly higher for creative results
                temperature: 0.7,
            },
        });

        // 3. Extract and return the raw text response (which is a JSON string)
        const jsonString = response.text.trim();

        // 4. Return the JSON to the client using the Vercel Response object
        // We must parse the string before sending it back as JSON
        const scenario = JSON.parse(jsonString);
        return res.status(200).json(scenario);

    } catch (error) {
        console.error('Gemini API Error:', error);
        return res.status(500).json({ error: 'Failed to generate scenario', details: error.message });
    }
};