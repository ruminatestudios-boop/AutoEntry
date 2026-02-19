export interface ScannedProduct {
    title: string;
    descriptionHtml: string;
    productType: string;
    tags: string[];
    estimatedWeight: number; // in kg or standard units
    vendor?: string;
    imageUrls?: string[];
    price?: string;
    status: 'DRAFT' | 'ACTIVE' | 'PUBLISHED';
    // Inventory fields
    sku?: string;
    inventoryQuantity?: number;
    trackInventory?: boolean;
    variants?: {
        options: {
            name: string;
            values: string[];
            quantities?: number[]; // optional per-value inventory, same length as values
        }[];
    };
}

export interface AIScanResult {
    success: boolean;
    data?: ScannedProduct;
    error?: string;
    confidenceScore?: number;
    isMock?: boolean;
}
