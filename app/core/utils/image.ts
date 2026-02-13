
export async function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            const reader = new FileReader();

            reader.onload = (event) => {
                if (!event.target?.result) {
                    console.error("FileReader result is empty");
                    reject(new Error("Failed to read file"));
                    return;
                }

                const img = new Image();
                img.onload = () => {
                    try {
                        const canvas = document.createElement("canvas");
                        const SIZE = 512;
                        canvas.width = SIZE;
                        canvas.height = SIZE;

                        const ctx = canvas.getContext("2d");
                        if (!ctx) {
                            reject(new Error("Could not get canvas context"));
                            return;
                        }

                        // Center-crop to square
                        const s = Math.min(img.width, img.height);
                        const sx = (img.width - s) / 2;
                        const sy = (img.height - s) / 2;
                        ctx.drawImage(img, sx, sy, s, s, 0, 0, SIZE, SIZE);

                        // Use 0.5 quality for smaller payload and more reliable uploads
                        const dataUrl = canvas.toDataURL("image/jpeg", 0.5);
                        resolve(dataUrl);
                    } catch (e: any) {
                        console.error("Canvas compression error:", e);
                        reject(new Error("Image processing failed: " + e.message));
                    }
                };

                img.onerror = (e) => {
                    console.error("Image load error:", e);
                    reject(new Error("Invalid image file"));
                };

                // Trigger load
                img.src = event.target.result as string;
            };

            reader.onerror = (e) => {
                console.error("FileReader error:", e);
                reject(new Error("File reading failed"));
            };

            reader.readAsDataURL(file);
        } catch (e: any) {
            console.error("Compression setup error:", e);
            reject(new Error("Unexpected compression error"));
        }
    });
}
