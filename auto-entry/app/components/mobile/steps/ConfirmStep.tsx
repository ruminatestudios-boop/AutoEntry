import { Text, BlockStack } from "@shopify/polaris";

interface ConfirmStepProps {
    parsedVariants: any;
    handleScanAnother: () => void;
}

export function ConfirmStep({
    parsedVariants,
    handleScanAnother,
}: ConfirmStepProps) {
    return (
        <BlockStack gap="400">
            <div style={{ textAlign: "center", animation: "fadeInUp 0.6s ease-out" }}>
                <div className="mobile-step-icon">
                    <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                </div>
                <Text as="h2" variant="headingLg" fontWeight="bold"><span style={{ fontSize: "18px" }}>Options Saved!</span></Text>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--mobile-text-muted)" }}>We parsed your instructions into these variants.</p>
            </div>

            <div className="mobile-panel" style={{ animation: "fadeInUp 0.6s 0.2s both" }}>
                {parsedVariants?.options ? (
                    <BlockStack gap="500">
                        {parsedVariants.options.map((opt: any, idx: number) => (
                            <div key={idx}>
                                <Text as="p" variant="bodyMd" fontWeight="bold">{opt.name}</Text>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "12px" }}>
                                    {opt.values.map((val: string, vIdx: number) => (
                                        <span key={vIdx} className="mobile-chip">
                                            {val}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </BlockStack>
                ) : (
                    <Text as="p" variant="bodyMd" tone="subdued">No structured variants found.</Text>
                )}
            </div>

            <div style={{ marginTop: '12px', animation: "fadeInUp 0.6s 0.4s both" }}>
                <button
                    onClick={handleScanAnother}
                    className="mobile-button-primary"
                >
                    Scan Next Product
                </button>
            </div>
        </BlockStack>
    );
}
