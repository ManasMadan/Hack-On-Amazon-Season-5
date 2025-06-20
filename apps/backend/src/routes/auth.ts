import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "@/trpc";
import { sendVerificationCode } from "@/utils/verify";
import { auth } from "@repo/auth";

export const authRouter = router({
  completeProfile: protectedProcedure
    .input(
      z.object({
        phone: z.string().min(10, { message: "Phone number must be valid" }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { phone } = input;
        await ctx.prisma.user.update({
          where: { id: ctx.session.user.id },
          data: {
            phoneNumber: phone,
            phoneNumberVerified: false,
            profileComplete: true,
          },
        });
        return { message: "Profile updated successfully" };
      } catch (error) {
        console.error("Error updating profile:", error);
        throw new Error("Failed to update profile");
      }
    }),

  sendVerificationCode: protectedProcedure
    .input(
      z.object({
        forcesend: z.boolean().default(false).optional(),
        type: z.enum(["phone", "email"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { forcesend, type } = input;
        const identifier =
          type === "phone"
            ? ctx.session.user.phoneNumber
            : ctx.session.user.email;
        const isVerified =
          type === "phone"
            ? ctx.session.user.phoneNumberVerified
            : ctx.session.user.emailVerified;
        if (!identifier) {
          throw new Error(`${type} not found in session`);
        }
        if (isVerified) {
          throw new Error(`${type} already verified`);
        }
        if (forcesend) {
          await ctx.prisma.verification.deleteMany({
            where: { identifier: `verify-${identifier}` },
          });
          await sendVerificationCode(identifier, type, "verify");
          return { message: `Verification code sent to ${identifier}` };
        }

        const hasVerificationCode = await ctx.prisma.verification.findFirst({
          where: { identifier: `verify-${identifier}` },
        });
        if (hasVerificationCode) {
          return { message: `Verification code already exists` };
        }

        await sendVerificationCode(identifier, type, "verify");
        return { message: `Verification code sent to ${identifier}` };
      } catch (error) {
        console.error("Error sending verification code:", error);
        throw new Error("Failed to send verification code");
      }
    }),

  verifyVerificationCode: protectedProcedure
    .input(
      z.object({
        otp: z
          .string()
          .min(6, { message: "OTP must be valid" })
          .nonempty({ message: "OTP is required" }),
        type: z.enum(["phone", "email"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { otp, type } = input;
        const identifier =
          type === "phone"
            ? ctx.session.user.phoneNumber
            : ctx.session.user.email;
        if (!identifier) {
          throw new Error(`${type} not found in session`);
        }
        const verificationCode = await ctx.prisma.verification.findFirst({
          where: { identifier: `verify-${identifier}` },
        });
        if (!verificationCode) {
          throw new Error("Verification code not found");
        }
        if (verificationCode.expiresAt < new Date()) {
          throw new Error("Verification code expired");
        }
        if (verificationCode.value !== otp) {
          throw new Error("Invalid verification code");
        }
        const data =
          type === "phone"
            ? { phoneNumberVerified: true }
            : { emailVerified: true };
        await ctx.prisma.$transaction([
          ctx.prisma.verification.delete({
            where: { identifier: `verify-${identifier}` },
          }),
          ctx.prisma.user.update({
            where: { id: ctx.session.user.id },
            data: data,
          }),
        ]);
        return { message: `${type} verified successfully` };
      } catch (error) {
        console.error("Error verifying code:", error);
        throw new Error("Failed to verify code");
      }
    }),

  sendResetPasswordLink: publicProcedure
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
      try {
        const { email, phone } = input;
        const identifier = (email || phone) as string;
        const type = email ? "email" : "phone";

        await ctx.prisma.verification.deleteMany({
          where: { identifier: `reset-${identifier}` },
        });

        await sendVerificationCode(identifier, type, "reset");
        return { message: `Reset code sent to ${identifier}` };
      } catch (error) {
        console.error("Error sending reset code:", error);
        throw new Error("Failed to send reset code");
      }
    }),

  updatePasswordFromResetLink: publicProcedure
    .input(
      z
        .object({
          code: z.string().uuid({ message: "Invalid reset code" }),
          password: z
            .string()
            .min(6, { message: "Password must be at least 6 characters long" })
            .regex(/[a-zA-Z0-9]/, { message: "Password must be alphanumeric" }),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          path: ["confirmPassword"],
          message: "Passwords do not match",
        })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { code, password } = input;
        const resetCode = await ctx.prisma.verification.findFirst({
          where: { value: code },
        });

        if (!resetCode) {
          throw new Error("Reset code not found");
        }
        if (resetCode.expiresAt < new Date()) {
          throw new Error("Reset code expired");
        }
        await ctx.prisma.verification.delete({
          where: { id: resetCode.id },
        });

        const authCtx = await auth.$context;
        const hash = await authCtx.password.hash(password);

        const identifier = resetCode.identifier.replace("reset-", "");

        const user = await ctx.prisma.user.findFirst({
          where: { OR: [{ email: identifier }, { phoneNumber: identifier }] },
          select: { id: true },
        });
        if (!user) {
          throw new Error("Password reset failed");
        }
        const accounts = await ctx.prisma.account.findFirst({
          where: { userId: user.id, providerId: "credential" },
        });
        if (!accounts) {
          throw new Error(`Password reset failed: user linked using OAuth`);
        }
        await ctx.prisma.account.update({
          where: { id: accounts.id },
          data: { password: hash },
        });

        return { message: "Reset code verified successfully" };
      } catch (error: any) {
        console.error("Error verifying reset code:", error);
        throw new Error(error.message || "Failed to verify reset code");
      }
    }),
});
