import { Text, BlockStack } from "@shopify/polaris";

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
    shop: string;
}

export function PricingModal({ isOpen, onClose, shop }: PricingModalProps) {
    if (!isOpen) return null;

    const plans = [
        {
            name: "Starter",
            price: "$19.99",
            limit: "100",
            features: ["Everything in Free", "100 monthly scans", "Batch scanning", "Priority support"],
            popular: false,
            value: "Starter"
        },
        {
            name: "Growth",
            price: "$49.99",
            limit: "500",
            features: ["Everything in Starter", "500 monthly scans", "Voice variants", "Advanced analytics"],
            popular: true,
            value: "Growth"
        },
        {
            name: "Power",
            price: "$99.99",
            limit: "1,000",
            features: ["Everything in Growth", "1,000 monthly scans", "API access", "Custom integrations"],
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
                                background: p.popular ? "linear-gradient(135deg, rgba(107, 229, 117, 0.08) 0%, rgba(107, 229, 117, 0.14) 50%, rgba(107, 229, 117, 0.06) 100%)" : "white",
                                borderRadius: "12px",
                                border: p.popular ? "1px solid rgba(107, 229, 117, 0.4)" : "1px solid var(--mobile-border)",
                                padding: "18px",
                                position: "relative",
                                boxShadow: p.popular ? "0 4px 20px rgba(107, 229, 117, 0.15)" : "none"
                            }}
                        >
                            {p.popular && (
                                <div
                                    style={{
                                        position: "absolute",
                                        top: "12px",
                                        right: "12px",
                                        background: "var(--mobile-accent)",
                                        color: "#1a1a1a",
                                        fontSize: "11px",
                                        fontWeight: "600",
                                        padding: "4px 10px",
                                        borderRadius: "999px"
                                    }}
                                >
                                    Most Popular
                                </div>
                            )}

                            <BlockStack gap="400">
                                <BlockStack gap="100">
                                    <Text as="h3" variant="headingSm" fontWeight="medium">{p.name}</Text>
                                    <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                                        <Text as="h1" variant="heading3xl" fontWeight="bold">{p.price}</Text>
                                        <Text as="span" variant="bodySm" tone="subdued">/mo</Text>
                                    </div>
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
                                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <div style={{ width: "4px", height: "4px", background: "#475569", borderRadius: "50%" }} />
                                            <Text as="span" variant="bodySm" tone="subdued">{f}</Text>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => {
                                        const url = `https://${shop}/admin/apps/auto-entry/app/pricing?plan=${p.value}`;
                                        window.location.href = url;
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: "12px",
                                        background: p.popular ? "var(--mobile-accent)" : "white",
                                        color: p.popular ? "#1a1a1a" : "#1a1a1a",
                                        border: p.popular ? "none" : "1px solid var(--mobile-border)",
                                        borderRadius: "12px",
                                        fontWeight: 700,
                                        fontSize: "15px",
                                        cursor: "pointer",
                                        marginTop: "6px"
                                    }}
                                >
                                    Choose {p.name}
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
