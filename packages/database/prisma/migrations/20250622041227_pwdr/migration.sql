-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('voice_auth_score', 'transaction_metadata', 'geo_location', 'user_statement', 'bank_sms_alert', 'bank_statement', 'otp_verification_log', 'payment_gateway_metadata', 'risk_engine_flag', 'ip_address', 'device_fingerprint', 'past_payee_relationship', 'user_dispute_history', 'payment_method_risk_score');

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "ipfsHash" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "isFraud" BOOLEAN NOT NULL,
    "justification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vote_paymentId_nodeId_key" ON "Vote"("paymentId", "nodeId");

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
