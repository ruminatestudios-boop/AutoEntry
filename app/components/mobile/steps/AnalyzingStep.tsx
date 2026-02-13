import { BlockStack } from "@shopify/polaris";

interface AnalyzingStepProps {
    imagePreview: string | null;
    error: string | null;
    onTryAgain: () => void;
}

export function AnalyzingStep({ imagePreview, error }: AnalyzingStepProps) {
    return (
        <BlockStack gap="400">
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
