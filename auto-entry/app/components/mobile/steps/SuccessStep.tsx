import { Text, BlockStack } from "@shopify/polaris";

interface SuccessStepProps {
    imagePreview: string | null;
    fetcherData: any;
    handleScanAnother: () => void;
    onAddVariants: () => void;
    transcript: string;
    setTranscript: (text: string) => void;
    isRecording: boolean;
    startRecording: () => void;
    isParsingVariants: boolean;
    handleSaveVariants: () => void;
}

export function SuccessStep({
    imagePreview,
    fetcherData,
    handleScanAnother,
    onAddVariants,
    transcript,
    setTranscript,
    isRecording,
    startRecording,
    isParsingVariants,
    handleSaveVariants
}: SuccessStepProps) {
    return (
        <BlockStack gap="400">
            <div style={{ textAlign: "center", padding: "6px 0" }}>
                <div style={{
                    width: "56px",
                    height: "56px",
                    background: "linear-gradient(135deg, rgba(107, 229, 117, 0.2) 0%, var(--mobile-accent) 100%)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px",
                    color: "#1a1a1a",
                    boxShadow: "0 6px 20px rgba(107, 229, 117, 0.35)",
                    border: "1px solid rgba(107, 229, 117, 0.4)",
                    animation: "pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                }}>
                    <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>

                <Text as="h2" variant="headingLg" fontWeight="bold"><span style={{ fontSize: "18px" }}>Scan Complete!</span></Text>

                {imagePreview && (
                    <div style={{
                        margin: "12px auto",
                        width: "100px",
                        height: "100px",
                        borderRadius: "12px",
                        overflow: "hidden",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                        border: "2px solid rgba(107, 229, 117, 0.3)",
                        animation: "pop 0.6s 0.2s both"
                    }}>
                        <img
                            src={imagePreview}
                            alt="Product"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                    </div>
                )}

                <div style={{ marginTop: "8px", animation: "fadeIn 0.5s 0.3s both" }}>
                    {fetcherData?.product?.title ? (
                        <div style={{ padding: '0 8px' }}>
                            <p style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>{fetcherData.product.title}</p>
                            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--mobile-text-muted)" }}>Identified successfully.</p>
                        </div>
                    ) : (
                        <p style={{ margin: 0, fontSize: "13px", color: "var(--mobile-text-muted)" }}>Product details extracted.</p>
                    )}
                </div>

                {/* Variants Card */}
                <div style={{
                    marginTop: "20px",
                    padding: "16px",
                    background: "linear-gradient(135deg, rgba(107, 229, 117, 0.06) 0%, rgba(107, 229, 117, 0.14) 50%, rgba(107, 229, 117, 0.08) 100%)",
                    borderRadius: "12px",
                    border: "1px solid rgba(107, 229, 117, 0.25)",
                    textAlign: "left",
                    animation: "fadeInUp 0.6s 0.4s both"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <Text as="h3" variant="headingMd" fontWeight="bold"><span style={{ fontSize: "15px" }}>Variants</span></Text>
                        <span style={{
                            background: "rgba(107, 229, 117, 0.2)",
                            color: "#1a1a1a",
                            padding: "4px 10px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: "bold",
                            letterSpacing: "0.02em"
                        }}>
                            AI Powered
                        </span>
                    </div>

                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <div style={{ position: "relative", flex: 1 }}>
                            <input
                                type="text"
                                value={transcript}
                                onChange={(e) => setTranscript(e.target.value)}
                                placeholder="e.g. Sizes Small to XL, Colors Red & Blue"
                                style={{
                                    width: "100%",
                                    padding: "10px 36px 10px 12px",
                                    borderRadius: "12px",
                                    border: "1px solid var(--mobile-border)",
                                    fontSize: "14px",
                                    background: "white",
                                    outline: "none"
                                }}
                            />
                            <button
                                onClick={startRecording}
                                style={{
                                    position: "absolute",
                                    right: "10px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    background: "none",
                                    border: "none",
                                    color: isRecording ? "#ef4444" : "var(--mobile-accent)",
                                    padding: "4px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    zIndex: 10,
                                    animation: isRecording ? "pulse 1.5s infinite" : "none"
                                }}
                            >
                                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                    <line x1="12" y1="19" x2="12" y2="23"></line>
                                    <line x1="8" y1="23" x2="16" y2="23"></line>
                                </svg>
                            </button>
                        </div>
                        <button
                            onClick={handleSaveVariants}
                            disabled={!transcript.trim() || isParsingVariants}
                            style={{
                                background: "var(--mobile-accent)",
                                color: "#1a1a1a",
                                border: "none",
                                padding: "10px 16px",
                                borderRadius: "12px",
                                fontWeight: "bold",
                                fontSize: "14px",
                                cursor: "pointer",
                                opacity: (!transcript.trim() || isParsingVariants) ? 0.6 : 1
                            }}
                        >
                            {isParsingVariants ? "..." : "Add"}
                        </button>
                    </div>

                    {isRecording && (
                        <div style={{ marginTop: '8px', textAlign: 'center' }}>
                            <Text as="p" variant="bodySm" tone="critical">Listening...</Text>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "8px", animation: "fadeInUp 0.6s 0.5s both" }}>
                    <button
                        onClick={handleScanAnother}
                        className="mobile-button-primary"
                    >
                        Scan Next Item
                    </button>

                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        style={{
                            marginTop: '4px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--mobile-text-muted)',
                            fontWeight: '600',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        Done for now
                    </button>
                </div>
            </div>
        </BlockStack>
    );
}
