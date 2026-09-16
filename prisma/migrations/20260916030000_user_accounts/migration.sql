CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "username" TEXT NOT NULL,
  "passwordHash" TEXT,
  "role" TEXT NOT NULL DEFAULT 'user' CHECK ("role" IN ('admin', 'user')),
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

ALTER TABLE "details" ADD COLUMN "statusSetById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "details" ADD COLUMN "statusSetAt" DATETIME;

CREATE TABLE "StatusChange" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "apartmentId" INTEGER,
  "apartmentTitle" TEXT NOT NULL,
  "apartmentUrl" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL CHECK ("toStatus" IN ('accepted', 'maybe', 'rejected')),
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("apartmentId") REFERENCES "details"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "StatusChange_userId_toStatus_idx" ON "StatusChange"("userId", "toStatus");
CREATE INDEX "StatusChange_createdAt_idx" ON "StatusChange"("createdAt");
