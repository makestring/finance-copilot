-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "billingDay" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subscription_clientId_idx" ON "Subscription"("clientId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
