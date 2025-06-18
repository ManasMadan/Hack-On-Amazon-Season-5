-- AlterTable
ALTER TABLE "user" ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "emailVerified" SET DEFAULT false;
