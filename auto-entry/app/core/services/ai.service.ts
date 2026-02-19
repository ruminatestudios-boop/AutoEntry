import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIScanResult, ScannedProduct } from "../types/product";

/** Fallback product when AI blocks or fails - we never reject the image, user can edit. */
function fallbackScannedProduct(descriptiveTitle?: string | null): ScannedProduct {
    const title = descriptiveTitle?.trim() && descriptiveTitle.length <= 120
        ? descriptiveTitle
        : "Item from photo";
    const desc = descriptiveTitle
        ? `<p>${descriptiveTitle}. Edit title and description as needed.</p><ul><li>Details from your image</li><li>Edit in dashboard before publishing</li></ul>`
        : "<p>Item from your photo. Edit title and description as needed.</p><ul><li>Details from your image</li><li>Edit in dashboard before publishing</li></ul>";
    return {
        title,
        descriptionHtml: desc,
        productType: "General",
        tags: ["scanned", "custom"],
        estimatedWeight: 200,
        price: "0",
        status: "DRAFT",
    };
}

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

    /** When main analysis fails, ask for one short phrase describing what's in the image (e.g. "Blue toaster on grey surface"). */
    private async describeImageBriefly(rawBase64: string, mimeType: string): Promise<string | null> {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const prompt = `Look at this image. In one short phrase (2–10 words), describe what you see—e.g. object, color, setting. Examples: "Blue two-slot toaster on grey surface", "Handmade ceramic mug", "Red running shoes". Reply with ONLY that phrase, no quotes or punctuation.`;
            const result = await Promise.race([
                model.generateContent([
                    prompt,
                    { inlineData: { data: rawBase64, mimeType: mimeType || "image/jpeg" } },
                ]),
                new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
            ]) as any;
            const text = result?.response?.text?.()?.trim();
            return text && text.length <= 120 ? text : null;
        } catch {
            return null;
        }
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

        Analyze this image and the OCR TEXT below. The image can be ANY product: packaged goods, unpackaged items, handmade goods, produce, clothing, electronics, furniture, art, food, accessories, etc. Describe exactly what you see.

        - If there is a brand, logo, or printed text (on packaging, label, tag, or product): extract it with SUPER ACCURACY. Use the exact spelling and wording from OCR or the image. Do NOT guess or approximate brand names.
        - If there is no brand or label: describe the product from what you see (appearance, material, color, shape, likely use). Invent a clear, descriptive title (e.g. "Handmade Ceramic Mug", "Organic Red Apple").
        - OCR TEXT is the primary source for any printed text (brand, model, ingredients, price). Use it when present; otherwise rely on visual description.

        OCR TEXT:
        """
        ${ocrText}
        """

        RULES:
        - Brand names: use ONLY what appears in OCR or clearly on the image. Exact spelling. If unsure, omit brand from title and put a generic product name.
        - You MUST fill in every field. No field may be empty or minimal.
        - Work for every type of product: packaged or unpackaged, famous brand or no brand, physical item only.
        - NEVER use a generic title like "Scanned Item" or "Product". Always describe what you see (e.g. "Blue two-slot toaster", "Handmade ceramic mug", "Small appliance on grey surface") so the title adds value.

        FIELD REQUIREMENTS:
        1. "title": Full product name. If brand is visible (OCR or logo): "BRAND + Product/Model name" (e.g. "PHILIPS Series 1000 Electric Shaver", "Nike Air Max 90"). If no brand or unclear: describe what you see (e.g. "Blue toaster on grey surface", "Handwoven Cotton Throw"). Never use "Scanned Item".
        2. "descriptionHtml": MUST be proper HTML. Include:
           - One short <p> describing what the product is and what you see (materials, colors, key visual details, or copy from packaging if present).
           - A <ul> with <li> bullets: features, specs, or visual details (from label/OCR or from observation). Minimum 2-3 bullets.
           Describe what you see; do not output only the product name.
        3. "productType": One clear category. Use: Electronics, Food & Beverages, Health & Beauty, Clothing & Accessories, Home & Garden, Sports & Outdoors, Toys & Games, Pet Supplies, Office Supplies, Art & Collectibles, or a close match. Single category phrase.
        4. "tags": Non-empty array of 3-8 lowercase tags: include brand if visible (exact), product type, materials/features (e.g. ["philips", "electric", "shaver"] or ["ceramic", "handmade", "mug", "kitchen"]). Never return [].
        5. "estimatedWeight": Number in grams. REQUIRED. Use weight from packaging if shown (convert kg to g). Otherwise estimate by what you see (size, product type). Never use 0.
        6. "price": REQUIRED. Use price from OCR/sticker if visible. Otherwise estimate a reasonable retail price in ${currency} (${country}) for this product type. Return numeric string (e.g. "24.99").
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
                    error: "We couldn't read the product details from the image. Try a clearer, well-lit photo of the product.",
                };
            }

            return {
                success: true,
                data,
            };
        } catch (error: any) {
            console.error(`[${timestamp}] AI Analysis Error:`, error);
            const errorMessage = (error?.message || String(error)).toLowerCase();

            // Only reject for unrecoverable errors; otherwise accept image with fallback data
            if (errorMessage.includes("api key") || errorMessage.includes("invalid_argument") || errorMessage.includes("401")) {
                return {
                    success: false,
                    error: "AI API key missing or invalid. Please contact the app owner.",
                };
            }
            // 429/quota: accept image with fallback so user doesn't see "service busy" message
            if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("resource_exhausted")) {
                console.log(`[${timestamp}] AI_SERVICE: Rate limited, returning fallback product (image accepted)`);
                const phrase = await this.describeImageBriefly(rawBase64, mimeType || "image/jpeg");
                return {
                    success: true,
                    data: fallbackScannedProduct(phrase),
                };
            }

            // Safety/blocked/content/timeout/parse/other: never reject - return fallback so user can edit
            console.log(`[${timestamp}] AI_SERVICE: Returning fallback product (image accepted)`);
            const phrase = await this.describeImageBriefly(rawBase64, mimeType || "image/jpeg");
            return {
                success: true,
                data: fallbackScannedProduct(phrase),
            };
        }
    }

    async parseVariants(transcript: string): Promise<{ success: boolean; data?: any; error?: string }> {
        const timestamp = new Date().toLocaleTimeString();
        try {
            console.log(`[${timestamp}] AI_SERVICE: Requesting variant model: gemini-2.0-flash`);
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const prompt = `
        Parse the following natural language description of product variants (like sizes, colors, materials, and optional quantities per value) into a structured JSON format.

        Input: "${transcript}"

        Return ONLY a JSON object in this format:
        {
            "options": [
                {
                    "name": "Option Name (e.g. Size, Color, Material)",
                    "values": ["Value1", "Value2", "Value3"],
                    "quantities": [optional array of numbers, one per value, e.g. [4, 5, 7] when user says "small 4, medium 5, large 7"]
                }
            ]
        }

        Rules:
        - Extract every variant value the user mentions. For "small 4, medium 5, large 7" output one option with name "Size" (or "Quantity"), values ["small", "medium", "large"], and quantities [4, 5, 7].
        - If the user gives numbers after values (e.g. "small 4, medium 5, large 7"), include a "quantities" array with the same length as "values".
        - Multiple option types: "sizes S M L and colors red, blue" → two options: Size with values [S,M,L], Color with values [red, blue]. Omit quantities if not specified.
        - Use clear option names: Size, Color, Material, etc. Values must be strings; quantities must be numbers.

        Examples:
        Input: "small 4, medium 5, large 7"
        Output: { "options": [{ "name": "Size", "values": ["small", "medium", "large"], "quantities": [4, 5, 7] }] }

        Input: "Available in Small, Medium, Large and Red, Blue colors"
        Output: { "options": [{ "name": "Size", "values": ["Small", "Medium", "Large"] }, { "name": "Color", "values": ["Red", "Blue"] }] }

        If no clear variants are mentioned, return: { "options": [] }
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
