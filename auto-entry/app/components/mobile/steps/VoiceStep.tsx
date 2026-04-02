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
            <div className="mobile-capture-head" style={{ animation: "fadeIn 0.6s ease-out" }}>
                <h2 className="mobile-capture-head__title">Add Variants</h2>
                <p className="mobile-capture-head__subtitle">Speak or type options like \"Sizes S to XL\".</p>
            </div>

            <div className={"mobile-voice-card" + (isRecording ? " mobile-voice-card--recording" : "")}>
                <button
                    onClick={isRecording ? () => setIsRecording(false) : startRecording}
                    className={"mobile-voice-btn" + (isRecording ? " mobile-voice-btn--recording" : "")}
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
                    <p className={"mobile-voice-status" + (isRecording ? " mobile-voice-status--recording" : "")}>
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
                    className="mobile-textarea"
                    style={{ minHeight: "100px" }}
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
