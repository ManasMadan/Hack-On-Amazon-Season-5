import { z } from "zod";
import { router, protectedProcedure } from "@/trpc";
import { Prisma, PaymentStatus } from "@repo/database/types";
import { TRPCError } from "@trpc/server";

export const paymentsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        toUserId: z.string(),
        paymentMethodId: z.string().uuid(),
        amount: z.number().positive().max(1000000), // Max amount limit
        description: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { toUserId, paymentMethodId, amount, description } = input;
      const fromUserId = ctx.session.user.id;

      // Prevent self-payment
      if (fromUserId === toUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot send payment to yourself",
        });
      }

      // Verify the payment method belongs to the authenticated user and is not archived
      const paymentMethod = await ctx.prisma.paymentMethod.findFirst({
        where: {
          id: paymentMethodId,
          userId: fromUserId,
          archivedAt: null,
        },
      });

      if (!paymentMethod) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment method not found or archived",
        });
      }

      // Verify the recipient user exists
      const toUser = await ctx.prisma.user.findUnique({
        where: { id: toUserId },
        select: { id: true }, // Only select id for security
      });

      if (!toUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recipient user not found",
        });
      }

      // Create the payment and update payment method stats in a transaction
      const result = await ctx.prisma.$transaction(async (prisma) => {
        // Create the payment
        const payment = await prisma.payment.create({
          data: {
            fromUserId,
            toUserId,
            paymentMethodId,
            amount,
            description,
            status: PaymentStatus.pending,
          },
          include: {
            to: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            paymentMethod: {
              select: {
                id: true,
                type: true,
              },
            },
          },
        });

        // Update payment method lastUsedAt
        await prisma.paymentMethod.update({
          where: { id: paymentMethodId },
          data: { lastUsedAt: new Date() },
        });

        // Create initial timeline entry
        await prisma.paymentTimeline.create({
          data: {
            paymentId: payment.id,
            status: PaymentStatus.pending,
            description: "Payment created",
            notes: "Payment has been initiated",
          },
        });

        return payment;
      });

      return result;
    }),

  listSentPayments: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        status: z.nativeEnum(PaymentStatus).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, offset, status } = input;
      const userId = ctx.session.user.id;

      const whereClause: Prisma.PaymentWhereInput = {
        fromUserId: userId,
        ...(status && { status }),
      };

      const payments = await ctx.prisma.payment.findMany({
        where: whereClause,
        include: {
          to: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          paymentMethod: {
            select: {
              id: true,
              type: true,
            },
          },
        },
        orderBy: { date: "desc" },
        take: limit,
        skip: offset,
      });

      const total = await ctx.prisma.payment.count({
        where: whereClause,
      });

      return {
        payments,
        total,
        hasMore: offset + limit < total,
      };
    }),

  listReceivedPayments: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        status: z.nativeEnum(PaymentStatus).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, offset, status } = input;
      const userId = ctx.session.user.id;

      const whereClause: Prisma.PaymentWhereInput = {
        toUserId: userId,
        ...(status && { status }),
      };

      const payments = await ctx.prisma.payment.findMany({
        where: whereClause,
        include: {
          from: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          paymentMethod: {
            select: {
              id: true,
              type: true,
            },
          },
        },
        orderBy: { date: "desc" },
        take: limit,
        skip: offset,
      });

      const total = await ctx.prisma.payment.count({
        where: whereClause,
      });

      return {
        payments,
        total,
        hasMore: offset + limit < total,
      };
    }),

  listAllPayments: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        status: z.nativeEnum(PaymentStatus).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, offset, status } = input;
      const userId = ctx.session.user.id;

      const whereClause: Prisma.PaymentWhereInput = {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
        ...(status && { status }),
      };

      const payments = await ctx.prisma.payment.findMany({
        where: whereClause,
        include: {
          from: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          to: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          paymentMethod: {
            select: {
              id: true,
              type: true,
            },
          },
        },
        orderBy: { date: "desc" },
        take: limit,
        skip: offset,
      });

      const total = await ctx.prisma.payment.count({
        where: whereClause,
      });

      return {
        payments,
        total,
        hasMore: offset + limit < total,
      };
    }),

  getPayment: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { id } = input;
      const userId = ctx.session.user.id;

      const payment = await ctx.prisma.payment.findUnique({
        where: { id },
        include: {
          from: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          to: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          paymentMethod: {
            select: {
              id: true,
              type: true,
              details: true,
            },
          },
          timeline: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      // Ensure user is either sender or recipient
      if (payment.fromUserId !== userId && payment.toUserId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this payment",
        });
      }

      return payment;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.nativeEnum(PaymentStatus),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, status, notes } = input;
      const userId = ctx.session.user.id;

      // First verify the payment exists and user has access
      const existingPayment = await ctx.prisma.payment.findUnique({
        where: { id },
        select: {
          id: true,
          fromUserId: true,
          toUserId: true,
          status: true,
          paymentMethodId: true,
        },
      });

      if (!existingPayment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      // Only sender can update payment status (e.g., cancel pending payments)
      // Recipients might need different permissions based on business logic
      if (existingPayment.fromUserId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this payment",
        });
      }

      // Business logic: only allow certain status transitions
      const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
        [PaymentStatus.pending]: [
          PaymentStatus.cancelled,
          PaymentStatus.completed,
        ],
        [PaymentStatus.completed]: [
          PaymentStatus.disputed,
          PaymentStatus.refunded,
        ],
        [PaymentStatus.failed]: [],
        [PaymentStatus.disputed]: [
          PaymentStatus.disputed_rejected,
          PaymentStatus.disputed_accepted,
        ],
        [PaymentStatus.cancelled]: [],
        [PaymentStatus.disputed_rejected]: [],
        [PaymentStatus.disputed_accepted]: [PaymentStatus.refunded],
        [PaymentStatus.refunded]: [],
      };

      if (!validTransitions[existingPayment.status]?.includes(status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot change payment status from ${existingPayment.status} to ${status}`,
        });
      }

      const result = await ctx.prisma.$transaction(async (prisma) => {
        // Update payment status
        const updatedPayment = await prisma.payment.update({
          where: { id },
          data: { status },
          include: {
            from: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            to: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            paymentMethod: {
              select: {
                id: true,
                type: true,
                details: true,
              },
            },
            timeline: {
              orderBy: { createdAt: "asc" },
            },
          },
        });

        // Update payment method statistics based on status change
        const paymentMethodId = existingPayment.paymentMethodId;
        const previousStatus = existingPayment.status;

        // Define which statuses count as what type
        const successStatuses: PaymentStatus[] = [PaymentStatus.completed];
        const failureStatuses: PaymentStatus[] = [
          PaymentStatus.failed,
          PaymentStatus.cancelled,
        ];
        const disputeStatuses: PaymentStatus[] = [
          PaymentStatus.disputed,
          PaymentStatus.disputed_accepted,
          PaymentStatus.disputed_rejected,
        ];

        // Prepare increment/decrement operations
        let successfulIncrement = 0;
        let failedIncrement = 0;
        let disputedIncrement = 0;

        // Handle transitions from previous status (decrement if needed)
        if (successStatuses.includes(previousStatus)) {
          successfulIncrement -= 1;
        } else if (failureStatuses.includes(previousStatus)) {
          failedIncrement -= 1;
        } else if (disputeStatuses.includes(previousStatus)) {
          disputedIncrement -= 1;
        }

        // Handle transitions to new status (increment if needed)
        if (successStatuses.includes(status)) {
          successfulIncrement += 1;
        } else if (failureStatuses.includes(status)) {
          failedIncrement += 1;
        } else if (disputeStatuses.includes(status)) {
          disputedIncrement += 1;
        }

        // Update payment method stats if there are changes
        if (
          successfulIncrement !== 0 ||
          failedIncrement !== 0 ||
          disputedIncrement !== 0
        ) {
          await prisma.paymentMethod.update({
            where: { id: paymentMethodId },
            data: {
              successfulPayments: { increment: successfulIncrement },
              failedPayments: { increment: failedIncrement },
              disputedPayments: { increment: disputedIncrement },
            },
          });
        }

        // Create timeline entry for status change
        const statusDescriptions = {
          [PaymentStatus.pending]: "Payment is pending",
          [PaymentStatus.completed]: "Payment completed successfully",
          [PaymentStatus.failed]: "Payment failed",
          [PaymentStatus.cancelled]: "Payment was cancelled",
          [PaymentStatus.disputed]: "Payment is under dispute",
          [PaymentStatus.disputed_accepted]: "Dispute was accepted",
          [PaymentStatus.disputed_rejected]: "Dispute was rejected",
          [PaymentStatus.refunded]: "Payment was refunded",
        };

        await prisma.paymentTimeline.create({
          data: {
            paymentId: id,
            status,
            description: statusDescriptions[status],
            notes: notes || undefined,
          },
        });

        return updatedPayment;
      });

      return result;
    }),

  getPaymentStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [sentStats, receivedStats] = await Promise.all([
      ctx.prisma.payment.aggregate({
        where: { fromUserId: userId },
        _sum: { amount: true },
        _count: { id: true },
      }),
      ctx.prisma.payment.aggregate({
        where: { toUserId: userId },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    return {
      totalSent: sentStats._sum.amount || 0,
      totalSentCount: sentStats._count.id || 0,
      totalReceived: receivedStats._sum.amount || 0,
      totalReceivedCount: receivedStats._count.id || 0,
    };
  }),
});
