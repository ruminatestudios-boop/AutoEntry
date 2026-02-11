import { Text, BlockStack } from "@shopify/polaris";

interface VoiceStepProps {
    isRecording: boolean;
    setIsRecording: (recording: boolean) => void;
    startRecording: () => void;
    voiceError: string | null;
    transcript: string;
    setTranscript: (text: string) => void;
    onBack: () => void;
    onSave: () => void;
    isSaving: boolean;
    sessionId: string;
}

export function VoiceStep({
    isRecording,
    setIsRecording,
    startRecording,
    voiceError,
    transcript,
    setTranscript,
    onBack,
    onSave,
    isSaving,
}: VoiceStepProps) {
    return (
        <BlockStack gap="400">
            <div style={{ textAlign: "center", animation: "fadeIn 0.6s ease-out" }}>
                <Text as="h2" variant="headingLg" fontWeight="bold"><span style={{ fontSize: "18px" }}>Add Variants</span></Text>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--mobile-text-muted)" }}>Speak or type options like "Sizes S to XL".</p>
            </div>

            <div style={{
                padding: "24px 16px",
                background: isRecording ? "rgba(239, 68, 68, 0.06)" : "linear-gradient(135deg, rgba(107, 229, 117, 0.06) 0%, rgba(107, 229, 117, 0.12) 50%, rgba(107, 229, 117, 0.08) 100%)",
                borderRadius: "12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
                border: isRecording ? "1px solid rgba(239, 68, 68, 0.25)" : "1px solid rgba(107, 229, 117, 0.25)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            }}>
                <button
                    onClick={isRecording ? () => setIsRecording(false) : startRecording}
                    style={{
                        width: "72px",
                        height: "72px",
                        borderRadius: "50%",
                        background: isRecording ? "#ef4444" : "var(--mobile-accent)",
                        border: "none",
                        color: isRecording ? "white" : "#1a1a1a",
                        cursor: "pointer",
                        boxShadow: isRecording ? "0 0 0 12px rgba(239, 68, 68, 0.2)" : "0 8px 24px rgba(107, 229, 117, 0.35)",
                        transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        animation: isRecording ? "pulse 1.5s infinite" : "none"
                    }}
                >
                    {isRecording ? (
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                            <rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect>
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                            <line x1="12" y1="19" x2="12" y2="23"></line>
                            <line x1="8" y1="23" x2="16" y2="23"></line>
                        </svg>
                    )}
                </button>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: isRecording ? "#ef4444" : "var(--mobile-accent)" }}>
                        {isRecording ? "Listening..." : "Tap to Speak"}
                    </p>
                    {voiceError && (
                        <div style={{ marginTop: '8px' }}>
                            <Text as="p" variant="bodySm" tone="critical">
                                {voiceError}
                            </Text>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ position: "relative" }}>
                <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Or type here (e.g. Small, Medium, Large)"
                    style={{
                        width: "100%",
                        padding: "14px 16px",
                        borderRadius: "12px",
                        border: "1px solid var(--mobile-border)",
                        fontSize: "15px",
                        minHeight: "100px",
                        fontFamily: "inherit",
                        background: "#fff",
                        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
                        transition: "border-color 0.2s"
                    }}
                />
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
                <button
                    onClick={onBack}
                    className="mobile-button-secondary"
                    style={{ flex: 1 }}
                >
                    Back
                </button>
                <button
                    onClick={onSave}
                    disabled={!transcript.trim() || isSaving}
                    className="mobile-button-primary"
                    style={{ flex: 2, opacity: (!transcript.trim() || isSaving) ? 0.6 : 1 }}
                >
                    {isSaving ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                            <div className="spin-animation" style={{ width: "20px", height: "20px", border: "2px solid #1a1a1a", borderTopColor: "transparent", borderRadius: "50%" }} />
                            Parsing...
                        </div>
                    ) : "Save Options"}
                </button>
            </div>
        </BlockStack>
    );
}
