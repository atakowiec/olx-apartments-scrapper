CREATE TABLE "new_details" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rent" INTEGER,
    "price" INTEGER,
    "images" TEXT NOT NULL,
    "loaded" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "surfaceArea" REAL,
    "source" TEXT NOT NULL DEFAULT 'olx'
);
INSERT INTO "new_details" ("id", "url", "title", "description", "rent", "price", "images", "loaded", "status", "surfaceArea")
SELECT "id", "url", "title", "description", "rent", "price", "images", "loaded", "status", "surfaceArea" FROM "details";
DROP TABLE "details";
ALTER TABLE "new_details" RENAME TO "details";
CREATE UNIQUE INDEX "details_url_key" ON "details"("url");
