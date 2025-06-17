import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { prisma } from "@repo/database";
import { auth } from "@repo/auth";
import { fromNodeHeaders } from "better-auth/node";

export const createContext = async (
  opts: CreateExpressContextOptions
): Promise<{
  session: Awaited<ReturnType<typeof auth.api.getSession>>;
  prisma: typeof prisma;
}> => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(opts.req.headers),
  });

  return {
    session,
    prisma,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
