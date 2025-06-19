import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { prisma } from "@repo/database";
import { auth, Session } from "@repo/auth";
import { fromNodeHeaders } from "better-auth/node";
import * as Minio from "minio";

export const createContext = async (
  opts: CreateExpressContextOptions
): Promise<{
  session: Awaited<Session>;
  prisma: typeof prisma;
}> => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(opts.req.headers),
  });

  return {
    session: session as Session,
    prisma,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
