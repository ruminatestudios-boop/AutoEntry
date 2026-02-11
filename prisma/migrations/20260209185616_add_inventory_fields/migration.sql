-- AlterTable
ALTER TABLE "ScannedProduct" ADD COLUMN "inventoryQuantity" INTEGER DEFAULT 10;
ALTER TABLE "ScannedProduct" ADD COLUMN "sku" TEXT;
ALTER TABLE "ScannedProduct" ADD COLUMN "trackInventory" BOOLEAN DEFAULT true;

-- CreateTable
CREATE TABLE "ShopSettings" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "billingCycleStart" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
