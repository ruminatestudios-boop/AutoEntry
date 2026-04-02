interface ToastProps {
    message: string;
    tone?: "success" | "error";
}

export function Toast({ message, tone = "success" }: ToastProps) {
    const isError = tone === "error";
    return (
        <div
            className={"mobile-toast " + (isError ? "mobile-toast--error" : "mobile-toast--success")}
        >
            {isError ? <span>!</span> : <span style={{ color: "#1a1a1a" }}>✓</span>}
            {message}
        </div>
    );
}
