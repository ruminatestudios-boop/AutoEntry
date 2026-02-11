import { GoogleGenerativeAI } from "@google/generative-ai";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import type { AIScanResult, ScannedProduct } from "../types/product";

export class AIService {
    private genAI: GoogleGenerativeAI;
    private visionClient: ImageAnnotatorClient;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.visionClient = new ImageAnnotatorClient();
    }

    async analyzeImage(base64Image: string, mimeType: string, currency: string = "USD", country: string = "United States"): Promise<AIScanResult> {
        const timestamp = new Date().toLocaleTimeString();
        try {
            console.log(`[${timestamp}] AI_SERVICE: Requesting model: gemini-2.0-flash (Currency: ${currency}, Country: ${country})`);
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            // First, run OCR with Google Cloud Vision to get reliable text from the packaging.
            let ocrText = "";
            try {
                const imageBuffer = Buffer.from(base64Image.includes(",") ? base64Image.split(",")[1] : base64Image, "base64");
                const [visionResult] = await this.visionClient.textDetection({
                    image: { content: imageBuffer },
                });
                ocrText = visionResult.fullTextAnnotation?.text?.trim() || "";
                console.log(`[${timestamp}] AI_SERVICE: Vision OCR length: ${ocrText.length}`);
            } catch (ocrError) {
                console.error(`[${timestamp}] AI_SERVICE: Vision OCR failed`, ocrError);
                // Continue without OCR; Gemini will still see the image but may be less precise.
            }

            const prompt = `
        You are a product data extraction engine. You MUST populate every field with useful content so the result can be used directly in a product listing.

        Analyze this image and the OCR TEXT below. Extract factual data from the packaging, labels, barcodes and price stickers.
        Treat OCR TEXT as the primary source for brand names, product names, and printed details.

        OCR TEXT:
        """
        ${ocrText}
        """

        RULES:
        - Do NOT invent brand names or product names that do not appear in OCR TEXT or clearly on the image.
        - You MUST fill in every field below. No field may be empty or minimal.

        FIELD REQUIREMENTS:
        1. "title": Full product name (brand + model/product name from OCR or image). Example: "PHILIPS Series 1000 Electric Shaver".
        2. "descriptionHtml": MUST be a proper product description in HTML. Include:
           - One short introductory <p> paragraph describing the product (what it is, who it's for).
           - A <ul> with <li> bullets listing key features, benefits, or specs from the packaging/OCR.
           Do NOT output only a single <p> with the product name. Minimum: one paragraph + at least 2-3 bullet points.
        3. "productType": A clear product category suitable for tax and search. Use one of: Electronics, Food & Beverages, Health & Beauty, Clothing & Accessories, Home & Garden, Sports & Outdoors, Toys & Games, Pet Supplies, Office Supplies, or a close match. Must be a single category phrase.
        4. "tags": MUST be a non-empty array of 3-8 lowercase tags. Include: brand name, product type, and relevant keywords from OCR (e.g. ["philips", "electric", "shaver", "grooming", "series 1000"]). Never return [].
        5. "estimatedWeight": Number in grams. REQUIRED. If weight is on the packaging (in g or kg), use it (convert kg to grams). Otherwise estimate by product type: e.g. electric shaver 200-400, chocolate bar 40-50, phone 150-200, bottle of shampoo 200-400, t-shirt 150-250. Never use 0.
        6. "price": REQUIRED - never leave empty. If a price appears in OCR or on a sticker, use that number as a string (e.g. "29.99"). If no price is visible, estimate an average retail price for this product type in ${currency} (${country}): e.g. small electronics often 20-80, food/snacks 2-10, health & beauty 5-30, clothing 15-100. Return the numeric string (e.g. "24.99").
        7. "status": "DRAFT"

        Return ONLY a JSON object, no other text:
        {
            "title": "string",
            "descriptionHtml": "string with <p> and <ul><li>...</li></ul>",
            "productType": "string",
            "tags": ["tag1", "tag2", "tag3", ...],
            "estimatedWeight": number,
            "price": "string (numeric, never empty)",
            "status": "DRAFT"
        }
        `;

            const imagePart = {
                inlineData: {
                    data: base64Image.includes(",") ? base64Image.split(",")[1] : base64Image,
                    mimeType,
                },
            };

            console.log(`[${timestamp}] AI_SERVICE: Sending request to Gemini...`);

            // Add a timeout to the AI request
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("AI_TIMEOUT")), 25000)
            );

            const result = await Promise.race([
                model.generateContent([prompt, imagePart]),
                timeoutPromise
            ]) as any;

            console.log(`[${timestamp}] AI_SERVICE: Gemini response received.`);
            const response = await result.response;

            if (!response) {
                throw new Error("Empty response from AI");
            }

            let text = response.text();
            if (!text) {
                throw new Error("No text content in AI response");
            }

            // Sanitizing response text to remove potential markdown code blocks
            text = text.replace(/```json/g, "").replace(/```/g, "").trim();

            const data = JSON.parse(text) as ScannedProduct;

            return {
                success: true,
                data,
            };
        } catch (error: any) {
            console.error(`[${timestamp}] AI Analysis Error:`, error);
            const errorMessage = error.message || String(error);

            if (errorMessage === "AI_TIMEOUT") {
                return {
                    success: false,
                    error: "AI took too long to respond. Please try again with a clearer photo.",
                };
            }

            // For any other API / safety / quota errors, fail the scan instead of returning fake data.
            // This ensures you never see misleading dummy products in your dashboard.
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    async parseVariants(transcript: string): Promise<{ success: boolean; data?: any; error?: string }> {
        const timestamp = new Date().toLocaleTimeString();
        try {
            console.log(`[${timestamp}] AI_SERVICE: Requesting variant model: gemini-2.0-flash`);
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const prompt = `
        Parse the following natural language description of product variants (like sizes, colors, materials) into a structured JSON format.

        Input: "${transcript}"

        Return ONLY a JSON object in this format:
        {
            "options": [
                {
                    "name": "Option Name (e.g. Size, Color, Material)",
                    "values": ["Value1", "Value2", "Value3"]
                }
            ]
        }

        Example:
        Input: "Available in Small, Medium, Large and Red, Blue colors"
        Output:
        {
            "options": [
                { "name": "Size", "values": ["Small", "Medium", "Large"] },
                { "name": "Color", "values": ["Red", "Blue"] }
            ]
        }

        If no clear variants are mentioned, return: { "variants": [] }
        `;

            console.log(`[${timestamp}] AI_SERVICE: Sending variant parsing request...`);
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();

            text = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const data = JSON.parse(text);

            console.log(`[${timestamp}] AI_SERVICE: Variant parsing successful.`);
            return {
                success: true,
                data: data, // returns { options: [...] }
            };
        } catch (error) {
            console.error(`[${timestamp}] Variant Parsing Error:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    /**
     * Returns image-search payload: exact product name and official brand domain.
     * We only use web images when siteDomain is set (official site only, no watermarks/stock).
     */
    async generateSearchQuery(title: string): Promise<{ query: string; siteDomain?: string }> {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const prompt = `You identify the exact product name and the brand's official product website for image search. We will ONLY show images from that official site (no retailers, no stock sites, no watermarked images).

Product title: "${title}"

Return a JSON object with:
1. "query": The EXACT product name as used on the brand's own website (e.g. "Sensodyne Pronamel Gentle Whitening Toothpaste"). Brand + product line + variant only. No sizes like "100ml", no retailer names, no pack counts.
2. "siteDomain": (REQUIRED for known brands) The brand's official product website domain only, e.g. "sensodyne.com", "colgate.com", "oralb.com", "gsk.com". For Sensodyne/Pronamel use "sensodyne.com". For Colgate use "colgate.com". For store brands or unknown brands use the main manufacturer domain if you know it. If you truly cannot determine any official brand domain, use null.

We only fetch images from site:siteDomain, so siteDomain must be the real brand/manufacturer product site, not a retailer.

Return ONLY valid JSON. Example: {"query":"Sensodyne Pronamel Gentle Whitening","siteDomain":"sensodyne.com"}`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text().trim();
            text = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const data = JSON.parse(text) as { query?: string; siteDomain?: string | null };
            const query = typeof data.query === "string" && data.query.length > 0 ? data.query : title;
            const siteDomain =
                typeof data.siteDomain === "string" && data.siteDomain.length > 0 ? data.siteDomain : undefined;
            return { query, siteDomain };
        } catch (error) {
            console.error("AI Search Query Generation Error:", error);
            return { query: title };
        }
    }
}
