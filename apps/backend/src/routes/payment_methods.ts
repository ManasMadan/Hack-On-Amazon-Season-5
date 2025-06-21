import { z } from "zod";
import { router, protectedProcedure } from "@/trpc";
import { Prisma, PaymentMethodType } from "@repo/database";

export const paymentMethodsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        type: z.enum([
          PaymentMethodType.debit_card,
          PaymentMethodType.credit_card,
          PaymentMethodType.bank,
          PaymentMethodType.upi_id,
        ]),
        details: z.record(z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, type, details } = input;

      const paymentMethod = await ctx.prisma.paymentMethod.create({
        data: {
          userId,
          type,
          details,
        },
      });

      return paymentMethod;
    }),

  listUserPaymentMethods: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        includeArchived: z.boolean().optional().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const { userId, includeArchived } = input;

      let whereClause: Prisma.PaymentMethodWhereInput = { userId };

      if (!includeArchived) {
        whereClause = {
          ...whereClause,
          archivedAt: null,
        };
      }

      return await ctx.prisma.paymentMethod.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
      });
    }),

  archivePaymentMethod: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      return await ctx.prisma.paymentMethod.update({
        where: { id },
        data: {
          archivedAt: new Date(),
        },
      });
    }),

  getPaymentMethod: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { id } = input;

      return await ctx.prisma.paymentMethod.findUnique({
        where: { id },
      });
    }),
});
