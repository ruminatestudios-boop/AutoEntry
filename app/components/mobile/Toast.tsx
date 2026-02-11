interface ToastProps {
    message: string;
}

export function Toast({ message }: ToastProps) {
    return (
        <div
            style={{
                position: "fixed",
                bottom: "24px",
                left: "16px",
                right: "16px",
                maxWidth: "calc(100vw - 32px)",
                background: "var(--mobile-accent)",
                color: "#1a1a1a",
                padding: "12px 20px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: "600",
                boxShadow: "0 8px 24px rgba(107, 229, 117, 0.4)",
                border: "1px solid rgba(107, 229, 117, 0.5)",
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                animation: "toastFadeIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            }}
        >
            <span style={{ color: "#1a1a1a" }}>✓</span>
            {message}
        </div>
    );
}
