import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "@/trpc";

export const testRouter = router({
  publicTest: publicProcedure.query(() => {
    return { messages: "This is a public test route", timestamp: new Date() };
  }),

  protectedTest: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is a protected test route",
      userId: ctx.user.id,
      timestamp: new Date(),
    };
  }),
});
