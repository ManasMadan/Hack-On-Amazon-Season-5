import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@repo/database";
import { nextCookies } from "better-auth/next-js";

const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  trustedOrigins: [process.env.NEXT_PUBLIC_FRONTEND_URL as string],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [nextCookies()],
  secret: process.env.NEXT_PUBLIC_BETTER_AUTH_SECRET as string,
  advanced: {
    useSecureCookies: isProduction,
    disableCSRFCheck: false,
    crossSubDomainCookies: {
      enabled: isProduction,
      domain: isProduction ? ".mmadan.in" : undefined,
    },
    defaultCookieAttributes: {
      httpOnly: true,
      secure: isProduction,
      domain: isProduction ? ".mmadan.in" : undefined,
      sameSite: "Lax",
    },
  },
});
