// Vercel Serverless Function: api/generate.js
// This file runs on the Vercel server, securely using the API key.

// Import Google's official client library
const { GoogleGenAI } = require("@google/genai");

// Retrieve API Key securely from Vercel's environment variables
// This variable (GEMINI_API_KEY) MUST be set in your Vercel project settings.
const apiKey = process.env.GEMINI_API_KEY; 

// Initialize the AI client
if (!apiKey) {
    // If the key is missing on the server, send a 500 error to the client
    module.exports = (req, res) => res.status(500).send({ error: "Server Configuration Error: API Key Missing." });
    return;
}
const ai = new GoogleGenAI(apiKey);

// --- Define the Schema and System Prompt (Copied from the client JS) ---
const systemPrompt = `You are the Game Master for a game called "The 2025 Digital Nomad Trail". Your task is to generate a unique, unpredictable, and highly specific scenario tailored to a remote worker traveling across the US. The scenario MUST be relevant to CURRENT EVENTS or timeless digital nomad challenges: tech failure, gig economy paywalls, political instability, unexpected travel costs, or mental health burnout. You MUST return the output as a valid JSON object following the provided schema, including exactly two distinct choices (A and B) with realistic consequences. Do not add any text or explanation outside the JSON.`;
 
const scenarioSchema = {
    type: "OBJECT",
    properties: {
        title: { type: "STRING", description: "A catchy, short title for the event, e.g., 'Server Meltdown' or 'Unexpected Checkpoint'." },
        description: { type: "STRING", description: "A detailed description of the event unfolding, setting the scene." },
        choices: {
            type: "ARRAY",
            description: "Exactly two distinct choices the player can make, A and B.",
            items: {
                type: "OBJECT",
                properties: {
                    option: { type: "STRING", description: "The text for the player's choice (e.g., 'Pay for premium repairs' or 'Attempt DIY fix')." },
                    effect_cash: { type: "INTEGER", description: "Change to player cash. Positive is gain, negative is loss. Range: -200 to 200." },
                    effect_laptop: { type: "INTEGER", description: "Change to laptop health (1-100). Positive is gain, negative is loss. Range: -30 to 15." },
                    effect_mental: { type: "INTEGER", description: "Change to mental health (1-100). Positive is gain, negative is loss. Range: -20 to 10." },
                    outcome_text: { type: "STRING", description: "A brief, narrative consequence of making this choice." }
                },
                required: ["option", "effect_cash", "effect_laptop", "effect_mental", "outcome_text"]
            }
        }
    },
    required: ["title", "description", "choices"]
};

// --- Serverless Function Handler ---

module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).send({ error: "Method Not Allowed" });
    }

    try {
        const { profession } = req.body; 
        
        if (!profession) {
            return res.status(400).send({ error: "Missing profession in request body." });
        }

        const userQuery = `Generate a new event scenario for a player who is currently a ${profession}. The event should involve a choice between two actions, each with clear impacts on Cash, Laptop Health (1-100), and Mental Health (1-100). Keep the effects moderate (e.g., changes between -100 and +100 for cash, and -30 to +15 for health).`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-09-2025",
            contents: [{ parts: [{ text: userQuery }] }],
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                responseSchema: scenarioSchema,
            },
        });
        
        const resultText = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!resultText) {
             return res.status(500).send({ error: "AI returned no content." });
        }
        
        const scenario = JSON.parse(resultText);

        // Send the secure scenario back to the client
        res.status(200).send({ scenario: scenario });

    } catch (error) {
        console.error("Serverless AI Call Failed:", error);
        res.status(500).send({ error: "Failed to generate scenario due to a server error." });
    }
};
