-- AddForeignKey
ALTER TABLE "CancelIntent" ADD CONSTRAINT "CancelIntent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
