ALTER TABLE "details" ADD COLUMN "messageSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "details" ADD COLUMN "viewingScheduled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "details" ADD COLUMN "notes" TEXT NOT NULL DEFAULT '';
CREATE INDEX "details_status_viewingScheduled_messageSent_id_idx" ON "details"("status", "viewingScheduled", "messageSent", "id");
