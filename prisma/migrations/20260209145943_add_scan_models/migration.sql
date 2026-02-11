-- CreateTable
CREATE TABLE "ScanSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ScannedProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "title" TEXT,
    "descriptionHtml" TEXT,
    "productType" TEXT,
    "tags" TEXT,
    "estimatedWeight" REAL,
    "price" TEXT,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "processed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ScannedProduct_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ScanSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ScannedProduct_sessionId_key" ON "ScannedProduct"("sessionId");
