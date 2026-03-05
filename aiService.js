const { GoogleGenerativeAI } = require("@google/generative-ai");

console.log("Gemini key:", process.env.GEMINI_API_KEY);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateWithFallback(prompt) {

    try {

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-latest"
        });

        const result = await model.generateContent(prompt);

        const response = await result.response;

        return response.text();

    } catch (error) {

        console.error("AI ERROR:", error);

        return "AI analysis failed. Please try again.";
    }
}

module.exports = { generateWithFallback };