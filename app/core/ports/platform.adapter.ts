import type { ScannedProduct } from "../types/product";

export interface PlatformAdapter {
    createProduct(product: ScannedProduct): Promise<{ id: string; url?: string }>;
    updateInventory(productId: string, quantity: number): Promise<void>;
    getShopInfo(): Promise<{ name: string; currencyCode: string }>;
}
