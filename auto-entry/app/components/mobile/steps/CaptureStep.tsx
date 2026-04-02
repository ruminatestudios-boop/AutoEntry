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
    remainingScans?: number | null;
    planName?: string | null;
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
    remainingScans = null,
    planName = null,
    batchMode = false,
    onBatchModeChange
}: CaptureStepProps) {
    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <BlockStack gap="300">
            {onBatchModeChange && (
                <div className="mobile-mode-toggle">
                    <div className="mobile-mode-toggle__track">
                        <button
                            type="button"
                            onClick={() => onBatchModeChange(false)}
                            className={
                                "mobile-mode-toggle__btn" +
                                (!batchMode ? " mobile-mode-toggle__btn--active" : "")
                            }
                        >
                            Single
                        </button>
                        <button
                            type="button"
                            onClick={() => onBatchModeChange(true)}
                            className={
                                "mobile-mode-toggle__btn" +
                                (batchMode ? " mobile-mode-toggle__btn--active" : "")
                            }
                        >
                            Batch
                        </button>
                    </div>
                </div>
            )}
            <div style={{ marginTop: onBatchModeChange ? "14px" : 0 }} />
            {!imagePreview && (
                <div className="mobile-capture-head">
                    <h2 className="mobile-capture-head__title">Capture Product</h2>
                    <p className="mobile-capture-head__subtitle">
                        {batchMode ? "Take many photos → each sent to dashboard." : "Snap a photo. AI handles the rest."}
                    </p>
                </div>
            )}

            <div
                className="mobile-capture-frame"
                style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: imagePreview ? "1 / 1" : undefined,
                    minHeight: imagePreview ? "280px" : "auto",
                    background: imagePreview ? "#000" : "transparent",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
            >
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
                    <div className="mobile-dropzone">
                        <div className="mobile-dropzone__inner">
                            <p className="mobile-dropzone__hint">
                                Use your camera for the best results, or choose an existing photo.
                            </p>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="mobile-button-primary"
                                style={{ width: "100%" }}
                            >
                                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                    <circle cx="12" cy="13" r="4"></circle>
                                </svg>
                                Take Photo
                            </button>

                            <div className="mobile-or" aria-hidden>
                                <span>Or</span>
                            </div>

                            <button
                                onClick={() => galleryInputRef.current?.click()}
                                className="mobile-button-secondary"
                                style={{ width: "100%" }}
                            >
                                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                    <polyline points="21 15 16 10 5 21"></polyline>
                                </svg>
                                Photo Library
                            </button>
                        </div>
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
                <section className="mobile-fill-panel" aria-label="Capture status">
                    <div className="mobile-fill-panel__row">
                        <div style={{ minWidth: 0 }}>
                            <div className="mobile-fill-panel__kicker">Status</div>
                            <div className="mobile-fill-panel__title">
                                {remainingScans == null ? "Ready to scan" : `${remainingScans} scans remaining`}
                            </div>
                            <div className="mobile-fill-panel__sub">
                                {planName ? (
                                    <>
                                        Plan: <span className="mobile-plan-pill">{planName}</span>
                                    </>
                                ) : (
                                    "Take a photo to create a draft listing."
                                )}
                            </div>
                        </div>
                        <div className="mobile-fill-panel__badge" aria-hidden>
                            {batchMode ? "Batch" : "Single"}
                        </div>
                    </div>
                    <div className="mobile-fill-panel__steps">
                        <div className="mobile-fill-panel__step">
                            <span className="mobile-fill-panel__dot" aria-hidden />
                            Take a photo (or pick from library)
                        </div>
                        <div className="mobile-fill-panel__step">
                            <span className="mobile-fill-panel__dot" aria-hidden />
                            We generate a draft: title, tags, variants
                        </div>
                        <div className="mobile-fill-panel__step">
                            <span className="mobile-fill-panel__dot" aria-hidden />
                            Review and publish in Shopify Admin
                        </div>
                    </div>
                </section>
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
        </div>
    );
}
