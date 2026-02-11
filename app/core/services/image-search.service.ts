/**
 * Image search via SerpAPI Google Images API.
 * When officialDomain is set, only returns images from that domain and excludes stock/watermark sites.
 */

const SERPAPI_BASE = "https://serpapi.com/search";

/** Domains we never use (stock photo sites, watermarks, aggregators). */
const BLOCKED_SOURCE_DOMAINS = [
    "shutterstock.com",
    "gettyimages.com",
    "getty.co",
    "alamy.com",
    "adobestock.com",
    "dreamstime.com",
    "istockphoto.com",
    "depositphotos.com",
    "bigstockphoto.com",
    "pond5.com",
    "123rf.com",
    "canstockphoto.com",
    "stock.adobe.com",
    "fotosearch.com",
    "wirestock.com",
    "stockfreeimages.com",
    "freepik.com",
    "vectorstock.com",
];

interface SerpApiImageResult {
    position?: number;
    thumbnail?: string;
    original?: string;
    link?: string;
    title?: string;
    source?: string;
}

interface SerpApiResponse {
    search_metadata?: { status?: string; error?: string };
    images_results?: SerpApiImageResult[];
    error?: string;
}

function getHost(url: string): string {
    try {
        return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
        return "";
    }
}

function isFromOfficialDomain(link: string | undefined, officialDomain: string): boolean {
    if (!link) return false;
    const host = getHost(link);
    const domain = officialDomain.toLowerCase().replace(/^www\./, "");
    return host === domain || host.endsWith("." + domain);
}

function isBlockedSource(link: string | undefined): boolean {
    if (!link) return true;
    const host = getHost(link);
    return BLOCKED_SOURCE_DOMAINS.some((blocked) => host === blocked || host.endsWith("." + blocked));
}

export interface SearchImagesOptions {
    /** When set, only return images whose page URL is from this domain (official site only). */
    officialDomain?: string;
}

export class ImageSearchService {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async searchImages(
        query: string,
        limit: number = 10,
        options: SearchImagesOptions = {}
    ): Promise<string[]> {
        try {
            const { officialDomain } = options;
            const params = new URLSearchParams({
                engine: "google_images",
                q: query,
                api_key: this.apiKey,
                image_type: "photo",
                imgsz: "l",
                safe: "active",
                image_color: "white",
            });
            const url = `${SERPAPI_BASE}?${params.toString()}`;
            console.log("[ImageSearchService] SerpAPI request for query:", query, officialDomain ? `(official only: ${officialDomain})` : "");

            const response = await fetch(url);
            const data = (await response.json()) as SerpApiResponse;

            if (!response.ok) {
                console.error("[ImageSearchService] SerpAPI HTTP Error:", response.status, response.statusText);
                console.error("[ImageSearchService] Error Details:", JSON.stringify(data, null, 2));
                const errMsg = data?.error || data?.search_metadata?.error || response.statusText;
                throw new Error(errMsg || "Image search API error");
            }

            if (data.search_metadata?.status === "Error" || data.error) {
                const errMsg = data.error || data.search_metadata?.error || "Search failed";
                console.error("[ImageSearchService] SerpAPI error:", errMsg);
                throw new Error(errMsg);
            }

            const results = data.images_results || [];
            const urls: string[] = [];

            for (const item of results) {
                if (urls.length >= limit) break;
                const pageLink = item.link;
                const imageUrl = item.original || item.link;
                if (typeof imageUrl !== "string" || !imageUrl.length) continue;

                // Only from official site when required
                if (officialDomain && !isFromOfficialDomain(pageLink, officialDomain)) continue;
                // Never from stock/watermark sites
                if (isBlockedSource(pageLink)) continue;

                urls.push(imageUrl);
            }

            if (urls.length === 0) {
                console.warn("[ImageSearchService] No acceptable image results for query:", query, officialDomain ? `(official: ${officialDomain})` : "");
            }

            return urls;
        } catch (error: unknown) {
            console.error("Image Search Service Error:", error);
            if (error instanceof Error && error.message) throw error;
            throw new Error("Image search failed — check server logs");
        }
    }
}
