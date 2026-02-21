-- AlterTable
ALTER TABLE "File" ADD COLUMN     "guestId" TEXT;

-- CreateIndex
CREATE INDEX "File_guestId_idx" ON "File"("guestId");
