interface ToastProps {
    message: string;
    tone?: "success" | "error";
}

export function Toast({ message, tone = "success" }: ToastProps) {
    const isError = tone === "error";
    return (
        <div
            style={{
                position: "fixed",
                bottom: "24px",
                left: "16px",
                right: "16px",
                maxWidth: "calc(100vw - 32px)",
                background: isError ? "#dc2626" : "var(--mobile-accent)",
                color: isError ? "#fff" : "#1a1a1a",
                padding: "12px 20px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: "600",
                boxShadow: isError ? "0 8px 24px rgba(220, 38, 38, 0.35)" : "0 8px 24px rgba(107, 229, 117, 0.4)",
                border: isError ? "1px solid rgba(220, 38, 38, 0.5)" : "1px solid rgba(107, 229, 117, 0.5)",
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                animation: "toastFadeIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            }}
        >
            {isError ? <span>!</span> : <span style={{ color: "#1a1a1a" }}>✓</span>}
            {message}
        </div>
    );
}
