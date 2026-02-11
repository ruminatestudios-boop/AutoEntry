-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShopSettings" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "bonusScans" INTEGER NOT NULL DEFAULT 0,
    "notificationEmail" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "countryCode" TEXT NOT NULL DEFAULT 'US',
    "billingCycleStart" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ShopSettings" ("billingCycleStart", "bonusScans", "currencyCode", "notificationEmail", "plan", "scanCount", "shop", "updatedAt") SELECT "billingCycleStart", "bonusScans", "currencyCode", "notificationEmail", "plan", "scanCount", "shop", "updatedAt" FROM "ShopSettings";
DROP TABLE "ShopSettings";
ALTER TABLE "new_ShopSettings" RENAME TO "ShopSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
