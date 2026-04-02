import { Text, BlockStack } from "@shopify/polaris";

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
    shop: string;
    apiKey: string;
}

export function PricingModal({ isOpen, onClose, shop, apiKey }: PricingModalProps) {
    if (!isOpen) return null;

    const plans = [
        {
            name: "Starter",
            price: "$19.99",
            limit: "100",
            description: "Small boutiques",
            features: ["Everything in Free", "100 monthly scans", "Batch scanning", "Priority support"],
            popular: false,
            value: "Starter"
        },
        {
            name: "Growth",
            price: "$49.99",
            limit: "500",
            description: "Growing stores",
            features: ["Everything in Starter", "500 monthly scans", "Voice variants", "Advanced analytics"],
            popular: true,
            value: "Growth"
        },
        {
            name: "Power",
            price: "$99.99",
            limit: "1,000",
            description: "High-volume",
            features: ["Everything in Growth", "1,000 monthly scans", "Team workflows", "Custom integrations"],
            popular: false,
            value: "Power"
        }
    ];

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(8px)",
                zIndex: 2000,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                animation: "fadeIn 0.3s ease"
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: "#f5f5f5",
                    width: "100%",
                    maxHeight: "90vh",
                    borderTopLeftRadius: "16px",
                    borderTopRightRadius: "16px",
                    padding: "20px 16px 32px",
                    overflowY: "auto",
                    animation: "slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ width: "36px", height: "4px", background: "var(--mobile-border)", borderRadius: "10px", margin: "0 auto 20px" }} />

                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                    <Text as="h2" variant="headingLg" fontWeight="bold"><span style={{ fontSize: "20px" }}>Upgrade your Plan</span></Text>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--mobile-text-muted)" }}>Choose the perfect plan for your business</p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {plans.map((p) => (
                        <div
                            key={p.name}
                            style={{
                                background: "white",
                                borderRadius: "16px",
                                border: p.popular ? "1px solid rgba(107, 229, 117, 0.55)" : "1px solid var(--mobile-border)",
                                padding: "16px",
                                position: "relative",
                                boxShadow: p.popular ? "0 10px 28px rgba(107, 229, 117, 0.12)" : "0 6px 18px rgba(0,0,0,0.06)"
                            }}
                        >
                            {p.popular && (
                                <div
                                    style={{
                                        position: "absolute",
                                        top: "12px",
                                        right: "12px",
                                        background: "#ffffff",
                                        border: "1px solid #000000",
                                        color: "#ea580c",
                                        fontSize: "11px",
                                        fontWeight: "700",
                                        letterSpacing: "0.06em",
                                        textTransform: "uppercase",
                                        padding: "4px 12px",
                                        borderRadius: "999px",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    MOST POPULAR
                                </div>
                            )}

                            <BlockStack gap="400">
                                <BlockStack gap="100">
                                    <Text as="h3" variant="headingSm" fontWeight="medium">{p.name}</Text>
                                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                                        <Text as="h1" variant="heading3xl" fontWeight="bold">{p.price}</Text>
                                        <Text as="span" variant="bodySm" tone="subdued">/monthly</Text>
                                    </div>
                                    <Text as="p" variant="bodySm" tone="subdued">{p.description}</Text>
                                </BlockStack>

                                <div
                                    style={{
                                        background: "rgba(107, 229, 117, 0.2)",
                                        color: "#1a1a1a",
                                        padding: "5px 10px",
                                        borderRadius: "8px",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        width: "fit-content"
                                    }}
                                >
                                    {p.limit} Scans / mo
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    {p.features.map((f, idx) => (
                                        <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                                            <div style={{
                                                width: "18px",
                                                height: "18px",
                                                borderRadius: "999px",
                                                background: "rgba(107, 229, 117, 0.22)",
                                                border: "1px solid rgba(26, 81, 77, 0.2)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "12px",
                                                fontWeight: 800,
                                                color: "var(--mobile-primary)",
                                                marginTop: "1px",
                                                flexShrink: 0
                                            }}>✓</div>
                                            <Text as="span" variant="bodySm" tone="subdued">{f}</Text>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => {
                                        // Use client_id (api key) deep link so it works for all installs.
                                        const url = `https://${shop}/admin/apps/${encodeURIComponent(apiKey)}/app/pricing?plan=${encodeURIComponent(p.value)}`;
                                        window.location.href = url;
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: "12px",
                                        background: "linear-gradient(180deg, #111827 0%, #000000 100%)",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "12px",
                                        fontWeight: 700,
                                        fontSize: "15px",
                                        cursor: "pointer",
                                        marginTop: "6px"
                                    }}
                                >
                                    Start {p.name}
                                </button>
                            </BlockStack>
                        </div>
                    ))}
                </div>

                <button
                    onClick={onClose}
                    style={{
                        width: "100%",
                        marginTop: "24px",
                        background: "none",
                        border: "none",
                        color: "var(--mobile-text-muted)",
                        fontWeight: 600,
                        fontSize: "14px",
                        cursor: "pointer"
                    }}
                >
                    Keep Current Plan
                </button>
            </div>
        </div>
    );
}
