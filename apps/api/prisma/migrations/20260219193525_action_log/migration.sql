-- CreateTable
CREATE TABLE "ActionLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActionLog_clientId_createdAt_idx" ON "ActionLog"("clientId", "createdAt");
