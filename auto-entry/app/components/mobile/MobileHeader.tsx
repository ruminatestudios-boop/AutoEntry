import { Text } from "@shopify/polaris";

interface MobileHeaderProps {
    title: string;
    subtitle: string;
}

export function MobileHeader({ title, subtitle }: MobileHeaderProps) {
    return (
        <header
            style={{
                background: "var(--mobile-primary)",
                color: "#fff",
                padding: "14px 16px 16px",
                textAlign: "center",
                marginBottom: "0",
            }}
        >
            <Text as="h1" variant="headingLg" fontWeight="bold">
                <span style={{ color: "#fff", letterSpacing: "-0.02em", fontSize: "20px" }}>{title}</span>
            </Text>
            <div style={{ marginTop: "2px", opacity: 0.92 }}>
                <Text as="p" variant="bodyMd">
                    <span style={{ color: "#fff", fontSize: "13px" }}>{subtitle}</span>
                </Text>
            </div>
        </header>
    );
}
