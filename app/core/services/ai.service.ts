import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIScanResult, ScannedProduct } from "../types/product";

/** Lazy-load Vision client so gRPC native module is only required when OCR runs (avoids startup crash on Alpine/musl). */
async function getVisionClient(): Promise<{ textDetection: (req: { image: { content: Buffer } }) => Promise<[{ fullTextAnnotation?: { text?: string } }]> } | null> {
    try {
        const { ImageAnnotatorClient } = await import("@google-cloud/vision");
        return new ImageAnnotatorClient();
    } catch (err) {
        console.error("Vision client load failed (OCR disabled):", (err as Error).message);
        return null;
    }
}

export class AIService {
    private genAI: GoogleGenerativeAI;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    async analyzeImage(base64Image: string, mimeType: string, currency: string = "USD", country: string = "United States", options?: { skipVision?: boolean }): Promise<AIScanResult> {
        const timestamp = new Date().toLocaleTimeString();
        const rawBase64 = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
        if (!rawBase64 || rawBase64.length < 100) {
            return { success: false, error: "No image data or image too small. Please take a clear photo." };
        }
        try {
            console.log(`[${timestamp}] AI_SERVICE: Requesting model: gemini-2.0-flash (Currency: ${currency}, Country: ${country}, base64 length: ${rawBase64.length}, skipVision: ${options?.skipVision ?? false})`);
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            let ocrText = "";
            if (!options?.skipVision) {
                try {
                    const visionClient = await getVisionClient();
                    if (visionClient) {
                        const imageBuffer = Buffer.from(rawBase64, "base64");
                        const [visionResult] = await visionClient.textDetection({
                            image: { content: imageBuffer },
                        });
                        ocrText = visionResult.fullTextAnnotation?.text?.trim() || "";
                        console.log(`[${timestamp}] AI_SERVICE: Vision OCR length: ${ocrText.length}`);
                    }
                } catch (ocrError) {
                    console.error(`[${timestamp}] AI_SERVICE: Vision OCR failed (continuing with Gemini only):`, (ocrError as Error).message);
                }
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
                    data: rawBase64,
                    mimeType: mimeType || "image/jpeg",
                },
            };

            console.log(`[${timestamp}] AI_SERVICE: Sending request to Gemini...`);

            const timeoutMs = 22000;
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs)
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

            let data: ScannedProduct;
            try {
                data = JSON.parse(text) as ScannedProduct;
            } catch (parseErr) {
                console.error(`[${timestamp}] AI_SERVICE: JSON parse failed:`, parseErr);
                return {
                    success: false,
                    error: "We couldn't read the product details from the image. Try a clearer photo of the label or packaging.",
                };
            }

            return {
                success: true,
                data,
            };
        } catch (error: any) {
            console.error(`[${timestamp}] AI Analysis Error:`, error);
            const errorMessage = (error?.message || String(error)).toLowerCase();

            if (errorMessage.includes("ai_timeout") || errorMessage.includes("timeout")) {
                return {
                    success: false,
                    error: "AI took too long to respond. Please try again with a clearer photo.",
                };
            }
            if (errorMessage.includes("safety") || errorMessage.includes("blocked") || errorMessage.includes("content")) {
                return {
                    success: false,
                    error: "Image was not accepted (content policy). Try a different photo of the product or packaging.",
                };
            }
            if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("resource_exhausted")) {
                return {
                    success: false,
                    error: "Service is busy. Please wait a moment and try again.",
                };
            }
            if (errorMessage.includes("api key") || errorMessage.includes("invalid_argument") || errorMessage.includes("401")) {
                return {
                    success: false,
                    error: "AI API key missing or invalid. Please contact the app owner.",
                };
            }

            return {
                success: false,
                error: (error?.message || String(error)).trim() || "Failed to analyze image. Try a clearer, well-lit photo.",
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
