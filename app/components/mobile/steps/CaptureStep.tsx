import React, { RefObject } from "react";
import { Text, BlockStack } from "@shopify/polaris";

interface Tip {
    label: string;
    text: string;
    icon: React.ReactNode;
}

interface CaptureStepProps {
    imagePreview: string | null;
    fileInputRef: RefObject<HTMLInputElement>;
    galleryInputRef: RefObject<HTMLInputElement>;
    handleCapture: (event: React.ChangeEvent<HTMLInputElement>) => void;
    currentTip: number;
    tips: Tip[];
    onAnalyze: () => void;
    isAnalyzing: boolean;
    onScanNewProduct: () => void;
    batchMode?: boolean;
    onBatchModeChange?: (on: boolean) => void;
}

export function CaptureStep({
    imagePreview,
    fileInputRef,
    galleryInputRef,
    handleCapture,
    currentTip,
    tips,
    onAnalyze,
    isAnalyzing,
    onScanNewProduct,
    batchMode = false,
    onBatchModeChange
}: CaptureStepProps) {
    return (
        <BlockStack gap="300">
            {onBatchModeChange && (
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    alignItems: "center",
                    textAlign: "center",
                }}>
                    <div style={{
                        display: "flex",
                        background: "rgba(107, 229, 117, 0.15)",
                        borderRadius: "10px",
                        padding: "3px",
                        border: "1px solid rgba(107, 229, 117, 0.3)",
                    }}>
                        <button
                            type="button"
                            onClick={() => onBatchModeChange(false)}
                            style={{
                                padding: "6px 14px",
                                borderRadius: "8px",
                                border: "none",
                                background: !batchMode ? "rgba(107, 229, 117, 0.4)" : "transparent",
                                color: !batchMode ? "#004c46" : "#6b7280",
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: "pointer",
                                boxShadow: !batchMode ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                            }}
                        >
                            Single
                        </button>
                        <button
                            type="button"
                            onClick={() => onBatchModeChange(true)}
                            style={{
                                padding: "6px 14px",
                                borderRadius: "8px",
                                border: "none",
                                background: batchMode ? "var(--mobile-accent)" : "transparent",
                                color: batchMode ? "#1a1a1a" : "#6b7280",
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: "pointer",
                                boxShadow: batchMode ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                            }}
                        >
                            Batch
                        </button>
                    </div>
                </div>
            )}
            <div style={{ marginTop: onBatchModeChange ? "24px" : 0 }} />
            {!imagePreview && (
                <div style={{ textAlign: "center", marginBottom: "12px", animation: "fadeIn 0.6s ease-out" }}>
                    <Text as="h2" variant="headingLg" fontWeight="bold">
                        <span style={{ fontSize: "18px" }}>Capture Product</span>
                    </Text>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--mobile-text-muted)" }}>
                        {batchMode ? "Take many photos → each sent to dashboard." : "Snap a photo. AI handles the rest."}
                    </p>
                </div>
            )}

            <div style={{
                position: "relative",
                width: "100%",
                aspectRatio: imagePreview ? "1 / 1" : undefined,
                minHeight: imagePreview ? "280px" : "auto",
                borderRadius: "12px",
                overflow: "hidden",
                background: imagePreview ? "#000" : "transparent",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
            }}>
                {imagePreview ? (
                    <img
                        src={imagePreview}
                        alt="Preview"
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            animation: "pop 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
                        }}
                    />
                ) : (
                    <div style={{
                        padding: "20px 16px",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        minHeight: "200px",
                        border: "2px dashed var(--mobile-border)",
                        borderRadius: "12px",
                        background: "#fafafa",
                        margin: "6px"
                    }}>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="mobile-button-primary"
                            style={{ maxWidth: "260px" }}
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                <circle cx="12" cy="13" r="4"></circle>
                            </svg>
                            Take Photo
                        </button>

                        <div style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", margin: "2px 0" }}>
                            <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
                            <span style={{ fontSize: "12px", color: "var(--mobile-text-muted)", fontWeight: 500 }}>OR</span>
                            <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
                        </div>

                        <button
                            onClick={() => galleryInputRef.current?.click()}
                            className="mobile-button-secondary"
                            style={{ maxWidth: "260px" }}
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                            Photo Library
                        </button>
                    </div>
                )}

                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={handleCapture}
                />
                <input
                    type="file"
                    accept="image/*"
                    ref={galleryInputRef}
                    style={{ display: "none" }}
                    onChange={handleCapture}
                />
            </div>

            {!imagePreview && (
                <div style={{ marginTop: "12px" }}>
                    <div key={currentTip} className="tip-card">
                        <div style={{
                            color: "var(--mobile-primary)",
                            background: "rgba(0, 76, 70, 0.08)",
                            width: "40px",
                            height: "40px",
                            borderRadius: "10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            border: "1px solid rgba(0, 76, 70, 0.15)"
                        }}>
                            <span style={{ transform: "scale(0.85)" }}>{tips[currentTip].icon}</span>
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ letterSpacing: "0.3px", textTransform: "uppercase", fontSize: "9px", fontWeight: "bold", color: "var(--mobile-text-muted)" }}>
                                {tips[currentTip].label}
                            </div>
                            <p style={{ margin: "1px 0 0", fontSize: "13px", fontWeight: 500, color: "#374151", lineHeight: 1.3 }}>
                                {tips[currentTip].text}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "5px", justifyContent: "center", marginTop: "10px" }}>
                        {tips.map((_, i) => (
                            <div key={i} style={{
                                width: i === currentTip ? "18px" : "5px",
                                height: "5px",
                                borderRadius: "6px",
                                background: i === currentTip ? "var(--mobile-accent)" : "#d1d5db",
                                transition: "all 0.3s ease"
                            }} />
                        ))}
                    </div>
                </div>
            )}

            {imagePreview && (
                <div style={{ marginTop: "12px" }}>
                    {isAnalyzing ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: "8px" }}>
                            <div className="spin-animation" style={{ width: "24px", height: "24px", border: "2px solid rgba(107, 229, 117, 0.4)", borderTop: "2px solid var(--mobile-accent)", borderRadius: "50%" }} />
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="mobile-button-primary"
                            >
                                Retake Photo
                            </button>
                            <button
                                onClick={onScanNewProduct}
                                className="mobile-button-secondary"
                                style={{ marginTop: "8px" }}
                            >
                                Scan new product
                            </button>
                        </>
                    )}
                </div>
            )}
        </BlockStack>
    );
}
