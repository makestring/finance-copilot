-- CreateEnum
CREATE TYPE "OutcomeStatus" AS ENUM ('PENDING', 'MEASURED', 'PARTIAL', 'MISSED');

-- CreateEnum
CREATE TYPE "OutcomeSourceType" AS ENUM ('CONFIRM_CANCELLATION', 'MANUAL_ADJUSTMENT', 'ALERT_DISMISS', 'OTHER');

-- CreateTable
CREATE TABLE "Outcome" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "actionLogId" TEXT,
    "sourceType" "OutcomeSourceType" NOT NULL,
    "sourceReferenceId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "expectedScoreDelta" INTEGER NOT NULL DEFAULT 0,
    "actualScoreDelta" INTEGER,
    "expectedSavingsCents" INTEGER NOT NULL DEFAULT 0,
    "actualSavingsCents" INTEGER,
    "baselineScore" INTEGER,
    "measuredScore" INTEGER,
    "status" "OutcomeStatus" NOT NULL DEFAULT 'PENDING',
    "expectedAt" TIMESTAMP(3),
    "measuredAt" TIMESTAMP(3),

    CONSTRAINT "Outcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Outcome_clientId_status_idx" ON "Outcome"("clientId", "status");

-- CreateIndex
CREATE INDEX "Outcome_clientId_createdAt_idx" ON "Outcome"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "Outcome_actionLogId_idx" ON "Outcome"("actionLogId");

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_actionLogId_fkey" FOREIGN KEY ("actionLogId") REFERENCES "ActionLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
