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
  updateDefaultStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        isDefault: z.boolean(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, isDefault, userId } = input;

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
});
