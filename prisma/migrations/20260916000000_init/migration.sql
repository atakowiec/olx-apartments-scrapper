CREATE TABLE "details" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rent" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "images" TEXT NOT NULL,
    "loaded" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending'
);

CREATE UNIQUE INDEX "details_url_key" ON "details"("url");
