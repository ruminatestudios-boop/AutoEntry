
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) {
    console.error("❌ GOOGLE_GENERATIVE_AI_API_KEY is missing from .env");
    process.exit(1);
} else {
    // Print first chars to verify it's the right one
    console.log(`✅ AI Key found: ${apiKey.substring(0, 8)}...`);
}

async function testAI() {
    try {
        console.log("🚀 Testing Gemini API...");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Using 2.0 flash

        const prompt = "Explain why the sky is blue in one sentence.";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("🎉 Success! Response:");
        console.log(text);
    } catch (error) {
        console.error("❌ AI Test Failed:", error);
    }
}

testAI();
