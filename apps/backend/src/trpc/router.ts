import { router } from "@/trpc";
import { authRouter } from "@/routes/auth";
import { avatarRouter } from "@/routes/avatar";
import { paymentMethodsRouter } from "@/routes/payment_methods";
import { paymentsRouter } from "@/routes/payments";
import { usersRouter } from "@/routes/users";
import { Prisma } from "@repo/database/types";
import { smartPaymentRouter } from "@/routes/smart_payments";
import { voiceAuthRouter } from "@/routes/voice_auth";
import { contractsRouter } from "@/routes/contracts";

export const appRouter = router({
  auth: authRouter,
  avatar: avatarRouter,
  paymentMethods: paymentMethodsRouter,
  payments: paymentsRouter,
  users: usersRouter,
  smartPayment: smartPaymentRouter,
  voiceAuth: voiceAuthRouter,
  contracts: contractsRouter,
});

export type AppRouter = typeof appRouter;
