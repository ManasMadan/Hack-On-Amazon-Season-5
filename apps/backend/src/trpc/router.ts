import { router } from "@/trpc";
import { authRouter } from "@/routes/auth";
import { avatarRouter } from "@/routes/avatar";

export const appRouter = router({
  auth: authRouter,
  avatar: avatarRouter,
});

export type AppRouter = typeof appRouter;
