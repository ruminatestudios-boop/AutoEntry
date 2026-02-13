
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
                        const MAX_WIDTH = 640;
                        const MAX_HEIGHT = 640;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;

                        const ctx = canvas.getContext("2d");
                        if (!ctx) {
                            reject(new Error("Could not get canvas context"));
                            return;
                        }

                        ctx.drawImage(img, 0, 0, width, height);

                        // Use 0.55 quality to keep payload smaller and avoid proxy timeouts (502)
                        const dataUrl = canvas.toDataURL("image/jpeg", 0.55);
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
