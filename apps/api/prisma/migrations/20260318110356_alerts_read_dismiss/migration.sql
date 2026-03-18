-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "dismissedAt" TIMESTAMP(3),
ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "readAt" TIMESTAMP(3);
