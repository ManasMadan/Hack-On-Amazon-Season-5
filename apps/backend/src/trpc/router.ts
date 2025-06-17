import { router } from "@/trpc";
import { testRouter } from "@/routes/test";

export const appRouter = router({
  test: testRouter,
});

export type AppRouter = typeof appRouter;
