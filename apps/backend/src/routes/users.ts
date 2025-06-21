import { z } from "zod";
import { router, protectedProcedure } from "@/trpc";
import { TRPCError } from "@trpc/server";

export const usersRouter = router({
  findUserByEmailOrPhone: protectedProcedure
    .input(
      z
        .object({
          email: z.string().optional(),
          phone: z.string().optional(),
        })
        .refine((data) => (data.email ? !data.phone : !!data.phone), {
          message: "Provide either email or phone, not both",
          path: ["email"],
        })
    )
    .mutation(async ({ ctx, input }) => {
      const { email, phone } = input;
      const currentUserId = ctx.session.user.id;

      // Build where clause
      const whereClause = email ? { email } : { phoneNumber: phone };

      const user = await ctx.prisma.user.findFirst({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          image: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Prevent users from finding themselves
      if (user.id === currentUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot send payment to yourself",
        });
      }

      return user;
    }),

  searchUsers: protectedProcedure
    .input(
      z.object({
        query: z.string().min(2, "Search query must be at least 2 characters"),
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { query, limit } = input;
      const currentUserId = ctx.session.user.id;

      const users = await ctx.prisma.user.findMany({
        where: {
          AND: [
            {
              id: {
                not: currentUserId, // Exclude current user
              },
            },
            {
              OR: [
                {
                  name: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  email: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  phoneNumber: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              ],
            },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          image: true,
        },
        take: limit,
        orderBy: {
          name: "asc",
        },
      });

      return users;
    }),
});
