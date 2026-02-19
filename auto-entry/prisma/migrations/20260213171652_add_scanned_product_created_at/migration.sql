-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScannedProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT,
    "descriptionHtml" TEXT,
    "productType" TEXT,
    "tags" TEXT,
    "estimatedWeight" REAL,
    "price" TEXT,
    "imageUrl" TEXT,
    "imageUrls" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "sku" TEXT,
    "inventoryQuantity" INTEGER DEFAULT 10,
    "trackInventory" BOOLEAN DEFAULT true,
    "variants" TEXT,
    CONSTRAINT "ScannedProduct_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ScanSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ScannedProduct" ("descriptionHtml", "estimatedWeight", "id", "imageUrl", "imageUrls", "inventoryQuantity", "price", "processed", "productType", "sessionId", "sku", "status", "tags", "title", "trackInventory", "variants") SELECT "descriptionHtml", "estimatedWeight", "id", "imageUrl", "imageUrls", "inventoryQuantity", "price", "processed", "productType", "sessionId", "sku", "status", "tags", "title", "trackInventory", "variants" FROM "ScannedProduct";
DROP TABLE "ScannedProduct";
ALTER TABLE "new_ScannedProduct" RENAME TO "ScannedProduct";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
