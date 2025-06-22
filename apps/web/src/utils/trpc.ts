import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "backend";
import { Prisma } from "@repo/database/types";
export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();
