-- CreateTable
CREATE TABLE "payment_timeline" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_timeline_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "payment_timeline" ADD CONSTRAINT "payment_timeline_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
