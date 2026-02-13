import { Text, BlockStack } from "@shopify/polaris";

interface AnalyzingStepProps {
    imagePreview: string | null;
    error: string | null;
    onTryAgain: () => void;
}

function getErrorDisplay(error: string): { title: string; hint: string } {
    const lower = error.toLowerCase();
    if (lower.includes("image too large") || lower.includes("smaller photo")) {
        return { title: "Photo too large", hint: "Take a smaller or more compressed photo and try again." };
    }
    if (lower.includes("no image") || lower.includes("no image provided")) {
        return { title: "No photo received", hint: "Please take a clear photo and try again." };
    }
    if (lower.includes("scan limit") || lower.includes("upgrade")) {
        return { title: "Scan limit reached", hint: "Upgrade your plan or wait for the next billing cycle." };
    }
    if (lower.includes("session not found")) {
        return { title: "Session expired", hint: "Refresh the page and scan the QR code again." };
    }
    if (lower.includes("api key") || lower.includes("api key missing")) {
        return { title: "Server configuration", hint: "AI is not configured. Please contact the app owner or try again later." };
    }
    if (lower.includes("quota") || lower.includes("rate limit") || lower.includes("429")) {
        return { title: "Service busy", hint: "Too many requests. Wait a moment and try again." };
    }
    if (lower.includes("server error") || lower.includes("network") || lower.includes("connection")) {
        return { title: "Something went wrong", hint: "Check your connection and try again in a moment." };
    }
    if (lower.includes("clearer") || lower.includes("too long") || lower.includes("timeout")) {
        return { title: "Analysis took too long", hint: "Try a clearer, well-lit photo of the product label or packaging." };
    }
    if (lower.includes("safety") || lower.includes("blocked") || lower.includes("content")) {
        return { title: "Image not accepted", hint: "Try a different photo focused on the product or packaging." };
    }
    if (lower.includes("ai") || lower.includes("analyze") || lower.includes("vision") || lower.includes("failed to analyze")) {
        return { title: "Analysis failed", hint: "Try a clearer, well-lit photo of the product label or packaging." };
    }
    return { title: "Analysis failed", hint: error };
}

export function AnalyzingStep({ imagePreview, error, onTryAgain }: AnalyzingStepProps) {
    return (
        <BlockStack gap="400">
            <div style={{ textAlign: "center", animation: "fadeIn 0.6s ease-out" }}>
                <Text as="h2" variant="headingLg" fontWeight="bold"><span style={{ fontSize: "18px" }}>AI Analysis</span></Text>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--mobile-text-muted)" }}>Identifying your product...</p>
            </div>

            <div style={{
                position: "relative",
                width: "100%",
                aspectRatio: "1/1",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                background: "#f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
            }}>
                {imagePreview ? (
                    <img
                        src={imagePreview}
                        alt="Analyzing"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: 'blur(2px) brightness(0.7)'
                        }}
                    />
                ) : (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(135deg, var(--mobile-primary) 0%, var(--mobile-primary-light) 100%)'
                    }} />
                )
                }

                {!error && (
                    <div style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "2px",
                        background: "var(--mobile-accent)",
                        boxShadow: "0 0 12px 2px rgba(107, 229, 117, 0.5)",
                        animation: "scanLine 2.5s infinite linear",
                        zIndex: 2
                    }} />
                )}

                {!error && (
                    <div className="spin-animation" style={{
                        position: "relative",
                        width: "48px",
                        height: "48px",
                        border: "3px solid rgba(107, 229, 117, 0.3)",
                        borderTop: "3px solid var(--mobile-accent)",
                        borderRadius: "50%",
                        zIndex: 3
                    }} />
                )}
            </div>

            <div style={{ textAlign: "center", marginTop: "24px" }}>
                {error ? (
                    (() => {
                        const { title, hint } = getErrorDisplay(error);
                        return (
                            <div style={{
                                background: "#fef2f2",
                                padding: "16px",
                                borderRadius: "12px",
                                border: "1px solid #fee2e2",
                                animation: "pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                            }}>
                                <div style={{ fontSize: "32px", marginBottom: "8px" }}>⚠️</div>
                                <Text as="p" variant="bodyMd" fontWeight="bold" tone="critical">
                                    {title}
                                </Text>
                                <div style={{ marginTop: "4px" }}>
                                    <Text as="p" variant="bodySm" tone="subdued">
                                        {hint}
                                    </Text>
                                </div>
                                <button
                                    onClick={onTryAgain}
                                    className="mobile-button-primary"
                                    style={{ marginTop: "12px", padding: "12px" }}
                                >
                                    Try Again
                                </button>
                            </div>
                        );
                    })()
                ) : (
                    <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 24px",
                        background: "rgba(107, 229, 117, 0.15)",
                        borderRadius: "999px",
                        border: "1px solid rgba(107, 229, 117, 0.35)"
                    }}>
                        <div className="pulse-animation" style={{
                            width: "8px",
                            height: "8px",
                            background: "var(--mobile-accent)",
                            borderRadius: "50%"
                        }} />
                        <Text as="span" variant="bodySm" fontWeight="bold">
                            <span style={{ color: "var(--mobile-accent)" }}>Scanning Image...</span>
                        </Text>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scanLine {
                    0% { top: 0; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}} />
        </BlockStack>
    );
}
