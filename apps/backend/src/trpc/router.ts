import { router } from "@/trpc";
import { authRouter } from "@/routes/auth";
import { avatarRouter } from "@/routes/avatar";
import { paymentMethodsRouter } from "@/routes/payment_methods";
import { Prisma } from "@repo/database";

export const appRouter = router({
  auth: authRouter,
  avatar: avatarRouter,
  paymentMethods: paymentMethodsRouter,
});

export type AppRouter = typeof appRouter;
