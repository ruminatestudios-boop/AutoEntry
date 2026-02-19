
import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { AIService } from "../core/services/ai.service";
import { ImageSearchService } from "../core/services/image-search.service";

export const action = async ({ request }: ActionFunctionArgs) => {
    await authenticate.admin(request);

    // Image search via SerpAPI Google Images (free tier: 250 searches/month)
    const apiKey = process.env.SERPAPI_API_KEY;

    if (!apiKey) {
        return json({
            error: "Image search not configured. Add SERPAPI_API_KEY to your app env. Get a key at https://serpapi.com/"
        }, { status: 500 });
    }

    // Handle both JSON and FormData
    let query;
    const contentType = request.headers.get("content-type");

    if (contentType?.includes("application/json")) {
        const body = await request.json();
        query = body.query;
    } else {
        const formData = await request.formData();
        query = formData.get("query") as string;
    }

    console.log(`[ImageSearch] Received query: "${query}"`);

    if (!query) {
        return json({ error: "Missing search query" }, { status: 400 });
    }

    try {
        const aiService = new AIService(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
        const { query: aiQuery, siteDomain } = await aiService.generateSearchQuery(query);

        // Only return images from the brand's official site (no random/watermarked/stock)
        if (!siteDomain) {
            return json({
                imageUrls: [],
                message: "No official brand site identified. Images are only shown from the brand's official website to avoid watermarks and inconsistent sources.",
            });
        }

        const finalQuery = `site:${siteDomain} ${aiQuery} official product photo white background`;
        console.log(`[ImageSearch] Official-only query: "${finalQuery}"`);

        const imageService = new ImageSearchService(apiKey);
        const imageUrls = await imageService.searchImages(finalQuery, 10, { officialDomain: siteDomain });
        return json({ imageUrls });
    } catch (e: any) {
        console.error(`[ImageSearch] Failed:`, e);
        return json({ error: e.message || "Search failed" }, { status: 500 });
    }
};
