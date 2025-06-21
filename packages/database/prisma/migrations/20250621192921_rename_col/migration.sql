/*
  Warnings:

  - You are about to drop the column `default` on the `PaymentMethod` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PaymentMethod" DROP COLUMN "default",
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;
