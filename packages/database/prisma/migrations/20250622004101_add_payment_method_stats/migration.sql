-- AlterTable
ALTER TABLE "PaymentMethod" ADD COLUMN     "disputedPayments" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "failedPayments" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_used_at" TIMESTAMP(3),
ADD COLUMN     "successfulPayments" INTEGER NOT NULL DEFAULT 0;
