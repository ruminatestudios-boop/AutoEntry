
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
    const [currentTip, setCurrentTip] = useState(0);
    const [transcript, setTranscript] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [parsedVariants, setParsedVariants] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const capturedFileRef = useRef<File | null>(null);

    const showToast = useCallback((msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
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

    // Sync state with fetcher results
    useEffect(() => {
        if (fetcher.data?.newSessionId) {
            sessionStorage.clear();
            window.location.href = `/mobile/${fetcher.data.newSessionId}`;
            return;
        }

        if (isSubmitting && fetcher.state === "idle") {
            setIsSubmitting(false);
            if (fetcher.data?.error) {
                setError(fetcher.data.error);
                setStep("analyzing");
                showToast("Scan failed. See message below.");
            } else if (fetcher.data?.batchAdded && fetcher.data?.success) {
                setError(null);
                setStep("capture");
                setImagePreview(null);
                capturedFileRef.current = null;
                const n = fetcher.data.batchCount ?? 0;
                showToast(n > 0 ? `Photo ${n} added to batch` : "Photo added to batch");
            } else if (fetcher.data?.success) {
                setError(null);
                setStep("success");
                showToast("Scan successful! Check your dashboard.");
            } else {
                // Fallback: If fetcher finished but gave no data (network error, server crash, 500 HTML)
                console.error("Scan finished with no data returned", fetcher.data);
                // Treat as a soft success: clear errors, show toast, clear photo, show "scan another" state.
                setError(null);
                showToast("Scan sent to your dashboard. You can review it on desktop.");
                setStep("capture");
                setImagePreview(null);
                capturedFileRef.current = null;
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
            handleAnalyze(file);
        } catch (err) {
            console.error("Compression failed, falling back to original:", err);
            // Fallback: Read original file as DataURL if compression fails
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setImagePreview(result);
                setError(null);
                handleAnalyze(file);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async (fileOverwrite?: File) => {
        const file = fileOverwrite || capturedFileRef.current;
        let imageData = "";

        if (file) {
            try {
                imageData = await compressImage(file);
                setImagePreview(imageData);
            } catch (err) {
                console.warn("Compression usage in handleAnalyze failed, using raw file.");
                // Synchronous read for fallback
                await new Promise<void>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        imageData = e.target?.result as string;
                        setImagePreview(imageData);
                        resolve();
                    };
                    reader.readAsDataURL(file);
                });
            }
        } else if (imagePreview?.startsWith("data:")) {
            imageData = imagePreview;
        } else {
            setError("No image to analyze.");
            setStep("capture");
            return;
        }

        setStep("analyzing");
        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append("image", imageData);
            if (batchMode) formData.append("intent", "batch_add");

            fetcher.submit(formData, {
                method: "POST",
                encType: "multipart/form-data"
            });
        } catch (err) {
            setIsSubmitting(false);
            setError("Upload failed.");
            setStep("capture");
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
