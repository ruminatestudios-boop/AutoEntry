import { useState, useRef, useEffect } from "react";
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useRouteError } from "@remix-run/react";
import { AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";

import db from "../db.server";
import { AIService } from "../core/services/ai.service";
import { PLAN_LIMITS } from "../core/constants";
import shopify from "../shopify.server";

// Styles
import mobileStyles from "../styles/mobile.css?url";

// Components
import { MobileHeader } from "../components/mobile/MobileHeader";
import { PricingModal } from "../components/mobile/PricingModal";
import { Toast } from "../components/mobile/Toast";
import { CaptureStep } from "../components/mobile/steps/CaptureStep";
import { AnalyzingStep } from "../components/mobile/steps/AnalyzingStep";
import { VoiceStep } from "../components/mobile/steps/VoiceStep";
import { ConfirmStep } from "../components/mobile/steps/ConfirmStep";

// Hooks
import { useMobileScan } from "../core/hooks/useMobileScan";

const TIPS = [
    { label: "Step 1: Capture", text: "Snap a clear photo of the product.", icon: <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg> },
    { label: "Step 2: Voice Variants", text: "Dictate options like 'Sizes S to XL'.", icon: <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg> },
    { label: "Step 3: Desktop Review", text: "Batch review on your desktop.", icon: <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg> }
];

export const loader = async ({ params }: LoaderFunctionArgs) => {
    const { sessionId } = params;
    if (!sessionId) {
        throw new Response("Session not found", { status: 404 });
    }

    try {
        const scanSession = await db.scanSession.findUnique({
            where: { id: sessionId },
        });

        if (!scanSession) {
            throw new Response("Session not found", { status: 404 });
        }

        const now = new Date();
        const expiryTime = new Date(scanSession.expiresAt);
        const twoHoursAgo = new Date(now.getTime() - (2 * 60 * 60 * 1000));

        if (expiryTime < twoHoursAgo) {
            throw new Response("Session expired", { status: 404 });
        }

        const shopSettings = await db.shopSettings.findUnique({
            where: { shop: scanSession.shop }
        });

        const plan = shopSettings?.plan || "FREE";
        const scanCount = shopSettings?.scanCount || 0;
        const limit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || 10;

        return json({
            sessionId,
            scanCount,
            limit,
            plan,
            shop: scanSession.shop
        });
    } catch (e) {
        if (e instanceof Response) throw e;
        console.error("Mobile loader failed:", e);
        throw new Response("Database unavailable. Please try again in a moment.", { status: 503 });
    }
};

export const links = () => [
    { rel: "stylesheet", href: mobileStyles },
];

export const action = async ({ request, params }: ActionFunctionArgs) => {
    const { sessionId: currentSessionId } = params;

    try {
        let intent: string | null = null;
        let imageField: string | File | null = null;
        let isBatchAdd = false;

        const contentType = request.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            let body: { intent?: string; image?: string; batch_add?: boolean };
            try {
                body = await request.json() as { intent?: string; image?: string; batch_add?: boolean };
            } catch (parseErr) {
                console.error("MOBILE ACTION: JSON parse failed", parseErr);
                return json({ error: "Invalid request. Try taking the photo again." }, { status: 400 });
            }
            intent = body.intent ?? null;
            isBatchAdd = body.intent === "batch_add" || body.batch_add === true;
            imageField = body.image ?? null;
        } else {
            const formData = await request.formData();
            intent = formData.get("intent") as string | null;
            isBatchAdd = formData.get("intent") === "batch_add";
            imageField = formData.get("image") as string | File | null;
        }

        if (intent === "new_session") {
            const session = await db.scanSession.findUnique({ where: { id: currentSessionId } });
            if (!session) return json({ error: "Session not found" }, { status: 404 });

            const newSession = await db.scanSession.create({
                data: {
                    shop: session.shop,
                    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
                }
            });
            return json({ newSessionId: newSession.id });
        }

        const session = await db.scanSession.findUnique({ where: { id: currentSessionId } });
        if (!session) return json({ error: "Session not found" }, { status: 404 });
        const shop = session.shop;

        let settings = await db.shopSettings.findUnique({ where: { shop } });
        if (!settings) {
            settings = await db.shopSettings.create({ data: { shop, plan: "FREE" } });
        }

        // Lazy reset
        const now = new Date();
        const cycleStart = new Date(settings.billingCycleStart);
        if (Math.ceil(Math.abs(now.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)) > 30) {
            settings = await db.shopSettings.update({
                where: { shop },
                data: { scanCount: 0, billingCycleStart: new Date() }
            });
        }

        const limit = PLAN_LIMITS[settings.plan as keyof typeof PLAN_LIMITS] || 10;
        const totalAvailable = limit + (settings.bonusScans || 0);

        if (settings.scanCount >= totalAvailable) {
            return json({ error: "Scan limit reached. Please upgrade." }, { status: 403 });
        }

        // Currency/Country check
        let currencyCode = settings.currencyCode || "USD";
        let countryCode = settings.countryCode || "US";
        if (!settings.currencyCode || settings.currencyCode === "USD") {
            try {
                const { admin } = await shopify.unauthenticated.admin(shop);
                const response = await admin.graphql(`query { shop { currencyCode countryCode } }`);
                const shopData: any = await response.json();
                if (shopData.data?.shop?.currencyCode) {
                    currencyCode = shopData.data.shop.currencyCode;
                    countryCode = shopData.data.shop.countryCode;
                    settings = await db.shopSettings.update({
                        where: { shop },
                        data: { currencyCode, countryCode }
                    });
                }
            } catch (e) { console.error("Shop context fetch failed", e); }
        }
        if (!imageField) return json({ error: "No image provided" }, { status: 400 });

        let mimeType = "image/jpeg";
        let base64Data: string;
        let dataUrlForStorage = "";

        if (typeof imageField === "string") {
            const image = imageField;
            if (image.length < 50) return json({ error: "Image data too small. Try taking a new photo." }, { status: 400 });
            if (image.startsWith("data:")) {
                const commaIndex = image.indexOf(",");
                if (commaIndex === -1) return json({ error: "Invalid image format. Try again." }, { status: 400 });
                base64Data = image.substring(commaIndex + 1);
                const mimeMatch = image.substring(0, commaIndex).match(/data:(.*?);/);
                if (mimeMatch) mimeType = mimeMatch[1];
                dataUrlForStorage = image;
            } else {
                base64Data = image;
                dataUrlForStorage = `data:${mimeType};base64,${image}`;
            }
        } else if (imageField instanceof File) {
            const buffer = Buffer.from(await imageField.arrayBuffer());
            base64Data = buffer.toString("base64");
            mimeType = imageField.type || "image/jpeg";
            dataUrlForStorage = `data:${mimeType};base64,${base64Data}`;
        } else {
            return json({ error: "Invalid image. Please use the camera or photo library." }, { status: 400 });
        }

        if (!base64Data || base64Data.length < 100) return json({ error: "Image data too small. Please take a clear photo and try again." }, { status: 400 });

        console.log(`MOBILE ACTION: Image received (${Math.round((base64Data.length * 3) / 4 / 1024)}KB base64) - Session: ${currentSessionId}, Shop: ${shop}`);

        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
            console.error("MOBILE ACTION ERROR: AI API Key missing");
            return json({ error: "AI API Key missing" }, { status: 500 });
        }

        const aiService = new AIService(apiKey);
        console.log(`MOBILE ACTION: Analyzing image (Base64 length: ${base64Data.length})...`);
        const scanResult = await aiService.analyzeImage(base64Data, mimeType, currencyCode, countryCode, { skipVision: true });

        if (!scanResult.success || !scanResult.data) {
            console.error("MOBILE ACTION ERROR: AI analysis failed:", scanResult.error);
            return json({ error: scanResult.error || "AI failed to analyze image" }, { status: 500 });
        }
        console.log("MOBILE ACTION: AI Analysis Success");

        const aiData = scanResult.data;
        const generateSKU = (title: string) => {
            const clean = title.toUpperCase().replace(/[^A-Z0-9]/g, '-').substring(0, 10);
            return `${clean}-${Date.now().toString().slice(-4)}`;
        };

        const sku = generateSKU(aiData.title);
        console.log(`MOBILE ACTION: Generated SKU: ${sku}`);

        // Use scanned image only on mobile to avoid proxy timeout (502). Image search can add 10s+.
        const finalImageUrls = [dataUrlForStorage];

        // Ensure all fields are populated for the dashboard form (never leave description/tags empty)
        const tagsArray = Array.isArray(aiData.tags) && aiData.tags.length > 0
            ? aiData.tags
            : [aiData.productType || "General", ...(aiData.title || "Product").split(/\s+/).filter((w: string) => w.length > 2).slice(0, 4)];
        const descriptionHtml = (aiData.descriptionHtml && aiData.descriptionHtml.trim().length > 20)
            ? aiData.descriptionHtml.trim()
            : `<p>${aiData.title || "Product"}</p><ul><li>Details from packaging. Edit as needed.</li></ul>`;
        const price = (aiData.price != null && String(aiData.price).trim() !== "") ? String(aiData.price).trim() : "";
        const estimatedWeightGrams = (aiData.estimatedWeight != null && Number(aiData.estimatedWeight) > 0)
            ? Number(aiData.estimatedWeight)
            : 200;

        if (isBatchAdd) {
            // Batch mode: add this product without replacing others in the session
            await db.scannedProduct.create({
                data: {
                    sessionId: currentSessionId!,
                    title: aiData.title || "Product",
                    descriptionHtml,
                    productType: aiData.productType || "General",
                    tags: tagsArray.join(", "),
                    estimatedWeight: estimatedWeightGrams,
                    price,
                    imageUrls: JSON.stringify(finalImageUrls),
                    status: "DRAFT",
                    processed: true,
                    sku: sku,
                    inventoryQuantity: 10,
                    trackInventory: true
                }
            });
            await db.shopSettings.update({
                where: { shop },
                data: { scanCount: { increment: 1 } }
            });
            const batchCount = await db.scannedProduct.count({ where: { sessionId: currentSessionId! } });
            console.log(`MOBILE ACTION: Batch add success. Session now has ${batchCount} product(s).`);
            return json({ success: true, batchAdded: true, batchCount });
        }

        // Single-product mode: replace any existing product for this session
        await db.scannedProduct.deleteMany({ where: { sessionId: currentSessionId! } });
        await db.scannedProduct.create({
            data: {
                sessionId: currentSessionId!,
                title: aiData.title || "Product",
                descriptionHtml,
                productType: aiData.productType || "General",
                tags: tagsArray.join(", "),
                estimatedWeight: estimatedWeightGrams,
                price,
                imageUrls: JSON.stringify(finalImageUrls),
                status: "DRAFT",
                processed: true,
                sku: sku,
                inventoryQuantity: 10,
                trackInventory: true
            }
        });

        await db.scanSession.update({
            where: { id: currentSessionId },
            data: { status: "COMPLETED" }
        });

        await db.shopSettings.update({
            where: { shop },
            data: { scanCount: { increment: 1 } }
        });

        console.log(`MOBILE ACTION: Success! Returning product: ${aiData.title}`);
        return json({
            success: true,
            isMock: scanResult.isMock,
            product: {
                ...aiData,
                descriptionHtml,
                tags: tagsArray,
                price
            }
        });
    } catch (serverError: unknown) {
        const msg = serverError instanceof Error ? serverError.message : String(serverError ?? "Unknown error");
        console.error("MOBILE ACTION CRITICAL FAILURE:", serverError);
        return json({
            error: "Something went wrong. Please try again."
        }, { status: 500 });
    }
};

export default function MobileCapture() {
    const { sessionId, shop } = useLoaderData<typeof loader>();
    const [batchMode, setBatchMode] = useState(false);
    const {
        step, setStep, imagePreview, error, setError, voiceError, toastMessage, toastTone,
        currentTip, setCurrentTip, transcript, setTranscript, isRecording, setIsRecording,
        parsedVariants, handleCapture, handleAnalyze, handleScanAnother,
        startRecording, handleSaveVariants, isAnalyzing, isParsingVariants, fetcherData
    } = useMobileScan({ sessionId: sessionId || "", batchMode });

    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTip((prev) => (prev + 1) % TIPS.length), 4000);
        return () => clearInterval(timer);
    }, [setCurrentTip]);

    const onCaptureChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleCapture(file);
            event.target.value = "";
        }
    };

    const renderStep = () => {
        switch (step) {
            case "analyzing":
                return <AnalyzingStep imagePreview={imagePreview} error={error} onTryAgain={() => setStep("capture")} />;
            case "voice":
                return <VoiceStep isRecording={isRecording} setIsRecording={setIsRecording} startRecording={startRecording} voiceError={voiceError} transcript={transcript} setTranscript={setTranscript} onBack={() => setStep("capture")} onSave={handleSaveVariants} isSaving={isParsingVariants} sessionId={sessionId as string} />;
            case "confirm":
                return <ConfirmStep parsedVariants={parsedVariants} handleScanAnother={handleScanAnother} />;
            default:
                return <CaptureStep imagePreview={imagePreview} fileInputRef={fileInputRef} galleryInputRef={galleryInputRef} handleCapture={onCaptureChange} currentTip={currentTip} tips={TIPS} onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} onScanNewProduct={handleScanAnother} batchMode={batchMode} onBatchModeChange={setBatchMode} />;
        }
    };

    return (
        <AppProvider i18n={enTranslations}>
            <div className="mobile-container">
                <MobileHeader title="Auto Entry" subtitle="Mobile Product Scanner" />

                <div style={{ padding: "12px 12px 20px" }}>
                    <div className="mobile-card">
                        {renderStep()}
                    </div>
                </div>

                <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} shop={shop} />
                {toastMessage && <Toast message={toastMessage} tone={toastTone} />}

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes spin { to { transform: rotate(360deg); } }
                    @keyframes pulse { 0% { transform: scale(1); } 70% { transform: scale(1.05); } 100% { transform: scale(1); } }
                    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                    @keyframes toastFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                    @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                    @keyframes slideInUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                `}} />
            </div>
        </AppProvider>
    );
}

export function ErrorBoundary() {
    const error = useRouteError();
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return (
        <div className="mobile-container" style={{ padding: "24px", textAlign: "center" }}>
            <div className="mobile-card" style={{ maxWidth: "360px", margin: "0 auto" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚠️</div>
                <h2 style={{ margin: "0 0 8px", fontSize: "18px" }}>Scan failed</h2>
                <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#6b7280" }}>{message}</p>
                <a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }} style={{ display: "inline-block", padding: "12px 20px", background: "#004c46", color: "white", borderRadius: "8px", textDecoration: "none", fontWeight: 600 }}>
                    Try again
                </a>
            </div>
        </div>
    );
}
