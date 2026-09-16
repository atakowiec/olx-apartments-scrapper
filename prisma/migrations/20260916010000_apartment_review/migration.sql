ALTER TABLE "details" ADD COLUMN "surfaceArea" REAL;
UPDATE "details" SET "status" = 'accepted' WHERE "status" = 'approved';
