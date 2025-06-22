import { z } from "zod";
import { router, protectedProcedure } from "@/trpc";
import { Prisma, PaymentMethodType } from "@repo/database/types";

export const paymentMethodsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
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
      const { type, details } = input;
      const userId = ctx.session.user.id;

      const existingMethodsCount = await ctx.prisma.paymentMethod.count({
        where: { userId, archivedAt: null },
      });

      const paymentMethod = await ctx.prisma.paymentMethod.create({
        data: {
          userId,
          type,
          details,
          isDefault: existingMethodsCount === 0,
        },
      });

      return paymentMethod;
    }),

  listUserPaymentMethods: protectedProcedure
    .input(
      z.object({
        includeArchived: z.boolean().optional().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const { includeArchived } = input;
      const userId = ctx.session.user.id;

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
      const userId = ctx.session.user.id;

      return await ctx.prisma.paymentMethod.update({
        where: { id, userId: userId },
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
      const userId = ctx.session.user.id;

      const paymentMethod = await ctx.prisma.paymentMethod.findUnique({
        where: { id },
      });

      if (!paymentMethod || paymentMethod.userId !== userId) {
        throw new Error(
          "Unauthorized: Payment method not found or doesn't belong to the user"
        );
      }

      return paymentMethod;
    }),
  updateDefaultStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        isDefault: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, isDefault } = input;
      const userId = ctx.session.user.id;

      return await ctx.prisma.$transaction(async (prisma) => {
        if (isDefault) {
          await prisma.paymentMethod.updateMany({
            where: {
              userId,
              isDefault: true,
            },
            data: {
              isDefault: false,
            },
          });
        }

        // Update the specified payment method
        const updatedMethod = await prisma.paymentMethod.update({
          where: { id },
          data: { isDefault: isDefault },
        });

        // When archiving a default payment method, set another one as default
        if (!isDefault && updatedMethod.archivedAt) {
          const nextDefaultMethod = await prisma.paymentMethod.findFirst({
            where: {
              userId,
              archivedAt: null,
              id: { not: id },
            },
            orderBy: { createdAt: "desc" },
          });

          if (nextDefaultMethod) {
            await prisma.paymentMethod.update({
              where: { id: nextDefaultMethod.id },
              data: { isDefault: true },
            });
          }
        }

        return updatedMethod;
      });
    }),

  getPaymentMethodStats: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { id } = input;
      const userId = ctx.session.user.id;

      const paymentMethod = await ctx.prisma.paymentMethod.findFirst({
        where: {
          id,
          userId,
          archivedAt: null,
        },
        select: {
          id: true,
          type: true,
          failedPayments: true,
          successfulPayments: true,
          disputedPayments: true,
          lastUsedAt: true,
          createdAt: true,
        },
      });

      if (!paymentMethod) {
        throw new Error(
          "Payment method not found or doesn't belong to the user"
        );
      }

      const totalPayments =
        paymentMethod.failedPayments +
        paymentMethod.successfulPayments +
        paymentMethod.disputedPayments;
      const successRate =
        totalPayments > 0
          ? (paymentMethod.successfulPayments / totalPayments) * 100
          : 0;

      return {
        ...paymentMethod,
        totalPayments,
        successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
      };
    }),

  recalculateStats: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      const userId = ctx.session.user.id;

      // Verify payment method belongs to user
      const paymentMethod = await ctx.prisma.paymentMethod.findFirst({
        where: {
          id,
          userId,
          archivedAt: null,
        },
      });

      if (!paymentMethod) {
        throw new Error(
          "Payment method not found or doesn't belong to the user"
        );
      }

      // Get payment counts by status
      const [successfulCount, failedCount, disputedCount] = await Promise.all([
        ctx.prisma.payment.count({
          where: {
            paymentMethodId: id,
            status: "completed",
          },
        }),
        ctx.prisma.payment.count({
          where: {
            paymentMethodId: id,
            status: { in: ["failed", "cancelled"] },
          },
        }),
        ctx.prisma.payment.count({
          where: {
            paymentMethodId: id,
            status: {
              in: ["disputed", "disputed_accepted", "disputed_rejected"],
            },
          },
        }),
      ]);

      // Get last used date
      const lastPayment = await ctx.prisma.payment.findFirst({
        where: { paymentMethodId: id },
        orderBy: { date: "desc" },
        select: { date: true },
      });

      // Update payment method with recalculated stats
      const updatedMethod = await ctx.prisma.paymentMethod.update({
        where: { id },
        data: {
          successfulPayments: successfulCount,
          failedPayments: failedCount,
          disputedPayments: disputedCount,
          lastUsedAt: lastPayment?.date || null,
        },
      });

      return updatedMethod;
    }),
});
