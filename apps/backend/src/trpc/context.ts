import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { prisma } from "@repo/database";
import { auth } from "@repo/auth";

export const createContext = async ({
  req,
  res,
}: CreateExpressContextOptions): Promise<{
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  prisma: typeof prisma;
  session: Awaited<ReturnType<typeof auth.api.getSession>>;
}> => {
  const session = await auth.api.getSession({
    headers: Object.fromEntries(
      Object.entries(req.headers).filter(([_, v]) => v !== undefined)
    ) as unknown as Headers,
  });

  return {
    req,
    res,
    prisma,
    session,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
