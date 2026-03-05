const express = require("express");
const multer = require("multer");
require("dotenv").config();
const { GoogleGenAI } = require("@google/genai"); 
const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");

const connectDB = require("./config/db");
const auth = require("./middleware/authMiddleware");
const Resume = require("./models/Resume");

const MAX_LENGTH = 10000; 

connectDB();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/api/auth", require("./routes/authRoutes"));


const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateWithFallback(prompt) {
    const models = [
        "gemini-3.1-flash-lite-preview",
        "gemini-3.1-flash-preview",
        "gemini-3-flash-preview"
    ];

    for (const modelName of models) {
        let retries = 0;

        while (retries < 5) { 
            try {
                console.log(`Trying model: ${modelName}, attempt ${retries + 1}`);
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: [{ role: "user", parts: [{ text: prompt }] }]
                });

                if (response.text) {
                    console.log(" AI response generated successfully!");
                    return response.text;
                }

            } catch (error) {
                if (error.status === 429) { 
                    retries++;
                    const waitTime = 10000; 
                    console.log(` Rate limit hit for ${modelName}. Waiting ${waitTime / 1000}s before retry...`);
                    await sleep(waitTime);
                    continue;
                } else if (error.status === 503) { 
                    console.log(` Model ${modelName} overloaded. Trying next model...`);
                    break;
                } else if (error.status === 404) { 
                    console.log(` Model ${modelName} not found. Skipping...`);
                    break;
                }
                console.log(`Model ${modelName} failed with error:`, error.message);
                break;
            }
        }

        console.log(` Moving to next model after ${retries} retries: ${modelName}`);
    }

    return "AI analysis failed. Please try again later.";
}


app.post("/upload", auth, upload.single("resume"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    try {
        console.log(" Resume received:", req.file.originalname);

        const fileBuffer = fs.readFileSync(req.file.path);
        const data = await pdf(fileBuffer);

      
        const extractedText = data.text.substring(0, MAX_LENGTH);
        console.log(" PDF text extracted. Length:", extractedText.length);

        const prompt = `
You are an expert ATS resume reviewer.
Analyze the following resume text:

1. Resume Score out of 100
2. Key Strengths
3. Areas for Improvement
4. ATS Optimization Tips
5. Missing Keywords
6. Formatting Suggestions
7. Provide an ATS Score

If the resume is long, summarize it while keeping all important details.

Resume:
${extractedText}`;

        const aiAnalysis = await generateWithFallback(prompt);

        console.log("-----------------------------------------");
        console.log("FULL AI ANALYSIS RESULTS:");
        console.log(aiAnalysis);
        console.log("-----------------------------------------");

        await Resume.create({
            userId: req.user.id,
            analysis: aiAnalysis
        });

        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        res.json({
            status: "success",
            analysis: aiAnalysis
        });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error("❌ Upload Error:", error.message);
        res.status(error.status || 500).json({ error: error.message });
    }
});


app.get("/history", auth, async (req, res) => {
    try {
        const history = await Resume.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: "Failed to load history" });
    }
});

app.listen(process.env.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
});