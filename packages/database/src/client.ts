if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL environment variable is not set.");
}
import { PrismaClient } from "../generated/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export * from "../generated/client";
