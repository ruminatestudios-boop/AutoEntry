
import { useState, useRef, useEffect, useCallback } from "react";
import { useFetcher } from "@remix-run/react";
import { compressImage } from "../utils/image";

export type Step = "capture" | "analyzing" | "success" | "voice" | "confirm";

interface UseMobileScanProps {
    sessionId: string;
    batchMode?: boolean;
}

export function useMobileScan({ sessionId, batchMode = false }: UseMobileScanProps) {
    const fetcher = useFetcher<{ success?: boolean; error?: string; isMock?: boolean; newSessionId?: string; batchAdded?: boolean; batchCount?: number }>();
    const variantFetcher = useFetcher<{ success?: boolean; variants?: any; error?: string }>();

    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [step, setStep] = useState<Step>("capture");
    const [error, setError] = useState<string | null>(null);
    const [voiceError, setVoiceError] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastTone, setToastTone] = useState<"success" | "error">("success");
    const [currentTip, setCurrentTip] = useState(0);
    const [transcript, setTranscript] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [parsedVariants, setParsedVariants] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const capturedFileRef = useRef<File | null>(null);
    const lastSubmittedImageRef = useRef<string | null>(null);
    const retriedRef = useRef(false);

    const showToast = useCallback((msg: string, tone: "success" | "error" = "success") => {
        setToastTone(tone);
        setToastMessage(msg);
        setTimeout(() => { setToastMessage(null); }, 3000);
    }, []);

    // Restore persistence on mount
    useEffect(() => {
        const savedImage = sessionStorage.getItem(`capture_img_${sessionId}`);
        const savedStep = sessionStorage.getItem(`capture_step_${sessionId}`);
        // We do NOT restore isSubmitting because fetchers do not persist across reloads.

        if (savedImage) setImagePreview(savedImage);

        if (savedStep && ["capture", "success", "voice", "confirm"].includes(savedStep)) {
            setStep(savedStep as Step);
        } else if (savedStep === "analyzing") {
            // If we were analyzing during reload, we lost the request. Reset to capture.
            setStep("capture");
        }
    }, [sessionId]);

    // Save persistence on changes
    useEffect(() => {
        if (imagePreview && imagePreview.startsWith("data:")) {
            sessionStorage.setItem(`capture_img_${sessionId}`, imagePreview);
        }
        sessionStorage.setItem(`capture_step_${sessionId}`, step);
        sessionStorage.setItem(`capture_submitting_${sessionId}`, isSubmitting.toString());
    }, [imagePreview, step, isSubmitting, sessionId]);

    // Timeout: if we're stuck analyzing for too long, reset so user can try again
    useEffect(() => {
        if (step !== "analyzing" || !isSubmitting) return;
        const timeout = setTimeout(() => {
            lastSubmittedImageRef.current = null;
            retriedRef.current = false;
            setIsSubmitting(false);
            setStep("capture");
            showToast("Scan timed out. Try again.", "error");
        }, 50000);
        return () => clearTimeout(timeout);
    }, [step, isSubmitting, showToast]);

    // Sync state with fetcher results
    useEffect(() => {
        if (fetcher.data?.newSessionId) {
            sessionStorage.clear();
            window.location.href = `/mobile/${fetcher.data.newSessionId}`;
            return;
        }

        if (isSubmitting && fetcher.state === "idle") {
            if (fetcher.data?.error) {
                lastSubmittedImageRef.current = null;
                retriedRef.current = false;
                setIsSubmitting(false);
                setError(null);
                setStep("capture");
                showToast(fetcher.data.error, "error");
            } else if (fetcher.data?.batchAdded && fetcher.data?.success) {
                lastSubmittedImageRef.current = null;
                retriedRef.current = false;
                setIsSubmitting(false);
                setError(null);
                setStep("capture");
                setImagePreview(null);
                capturedFileRef.current = null;
                const n = fetcher.data.batchCount ?? 0;
                showToast(n > 0 ? `Photo ${n} added to batch` : "Photo added to batch");
            } else if (fetcher.data?.success) {
                lastSubmittedImageRef.current = null;
                retriedRef.current = false;
                setIsSubmitting(false);
                setError(null);
                setStep("capture");
                setImagePreview(null);
                capturedFileRef.current = null;
                showToast("Scan complete! Retake to replace or scan a new product.");
            } else {
                // No data (connection/server error): retry once automatically, then just return to capture without error toast
                const img = lastSubmittedImageRef.current;
                if (img && !retriedRef.current) {
                    retriedRef.current = true;
                    fetcher.submit(
                        { image: img, ...(batchMode ? { intent: "batch_add" } : {}) },
                        { method: "POST", encType: "application/json", action: window.location.pathname }
                    );
                    return;
                }
                lastSubmittedImageRef.current = null;
                retriedRef.current = false;
                setIsSubmitting(false);
                setError(null);
                setStep("capture");
            }
        }
    }, [fetcher.data, fetcher.state, isSubmitting, showToast]);

    useEffect(() => {
        if (variantFetcher.data?.error) setVoiceError(variantFetcher.data.error);
        if (variantFetcher.data?.success) {
            setParsedVariants(variantFetcher.data.variants);
            setVoiceError(null);
            setTranscript("");
            setStep("confirm");
        }
    }, [variantFetcher.data]);

    // Clean up blob URLs
    useEffect(() => {
        return () => {
            if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
        };
    }, [imagePreview]);

    const handleCapture = async (file: File) => {
        if (file.size > 25 * 1024 * 1024) {
            setError("Image too large. Please take a smaller photo.");
            return;
        }

        capturedFileRef.current = file;
        try {
            const compressed = await compressImage(file);
            setImagePreview(compressed);
            setError(null);
            // Pass compressed data directly so we scan exactly this image, no double-compress or state race
            handleAnalyze(compressed);
        } catch (err) {
            console.error("Compression failed, falling back to original:", err);
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setImagePreview(result);
                setError(null);
                handleAnalyze(result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = (imageDataOrFile?: string | File) => {
        // Prevent double-submit while a request is in flight (allows retake after previous request completes)
        if (fetcher.state !== "idle") return;

        let imageData = "";
        if (typeof imageDataOrFile === "string" && imageDataOrFile.startsWith("data:")) {
            imageData = imageDataOrFile;
        } else if (imagePreview?.startsWith("data:")) {
            imageData = imagePreview;
        }
        if (!imageData) {
            setError("No image to analyze.");
            setStep("capture");
            return;
        }

        setStep("analyzing");
        setIsSubmitting(true);
        lastSubmittedImageRef.current = imageData;
        retriedRef.current = false;

        try {
            const payload = { image: imageData, ...(batchMode ? { intent: "batch_add" } : {}) };
            fetcher.submit(payload, {
                method: "POST",
                encType: "application/json",
                action: window.location.pathname,
            });
        } catch (err) {
            console.error("Scan submit failed:", err);
            lastSubmittedImageRef.current = null;
            retriedRef.current = false;
            setIsSubmitting(false);
            setStep("capture");
            showToast("Upload failed. Try again.", "error");
        }
    };

    const handleScanAnother = () => {
        sessionStorage.clear();
        setImagePreview(null);
        setError(null);
        capturedFileRef.current = null;
        fetcher.submit({ intent: "new_session" }, { method: "POST" });
    };

    const startRecording = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Speech recognition not supported.");
            return;
        }
        // @ts-ignore
        const recognition = new window.webkitSpeechRecognition();
        recognition.onstart = () => { setIsRecording(true); setVoiceError(null); };
        recognition.onend = () => setIsRecording(false);
        recognition.onerror = () => { setIsRecording(false); setVoiceError("Microphone error."); };
        recognition.onresult = (event: any) => {
            const text = event.results[0][0].transcript;
            setTranscript(text);
            variantFetcher.submit({ transcript: text, sessionId }, { method: "POST", action: "/api/parse-variants" });
        };
        recognition.start();
    };

    const handleSaveVariants = () => {
        if (!transcript.trim()) return;
        variantFetcher.submit({ transcript: transcript.trim(), sessionId }, { method: "POST", action: "/api/parse-variants" });
    };

    return {
        step,
        setStep,
        imagePreview,
        error,
        setError,
        voiceError,
        toastMessage,
        toastTone,
        currentTip,
        setCurrentTip,
        transcript,
        setTranscript,
        isRecording,
        setIsRecording,
        parsedVariants,
        handleCapture,
        handleAnalyze,
        handleScanAnother,
        startRecording,
        handleSaveVariants,
        isAnalyzing: isSubmitting || fetcher.state !== "idle",
        isParsingVariants: variantFetcher.state !== "idle",
        fetcherData: fetcher.data,
        batchMode,
    };
}
