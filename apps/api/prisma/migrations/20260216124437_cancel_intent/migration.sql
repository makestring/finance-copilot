-- CreateTable
CREATE TABLE "CancelIntent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "reason" TEXT,

    CONSTRAINT "CancelIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CancelIntent_clientId_createdAt_idx" ON "CancelIntent"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "CancelIntent_subscriptionId_idx" ON "CancelIntent"("subscriptionId");

-- AddForeignKey
ALTER TABLE "CancelIntent" ADD CONSTRAINT "CancelIntent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
