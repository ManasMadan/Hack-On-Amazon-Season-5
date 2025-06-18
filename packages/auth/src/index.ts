import { betterAuth, Session as BetterAuthSession, User } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@repo/database";
import { nextCookies } from "better-auth/next-js";
import { customSession } from "better-auth/plugins";

const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  trustedOrigins: [process.env.NEXT_PUBLIC_FRONTEND_URL as string],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  user: {
    additionalFields: {
      profileComplete: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      phoneNumber: { type: "string", required: false },
      phoneNumberVerified: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      emailVerified: { type: "boolean", required: false, defaultValue: false },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [
    nextCookies(),
    customSession(async ({ user, session }) => {
      const dbuser = await prisma.user.findFirst({
        where: { id: session.userId },
      });
      if (!dbuser) {
        return { user, session };
      }
      return {
        user: {
          ...user,
          profileComplete: dbuser.profileComplete,
          phoneNumber: dbuser.phoneNumber,
          phoneNumberVerified: dbuser.phoneNumberVerified,
        },
        session,
      };
    }),
  ],
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

export interface Session {
  user: User & {
    profileComplete: boolean;
    phoneNumber?: string | null;
    image: string;
    phoneNumberVerified: boolean;
    emailVerified: boolean;
  };
  session: BetterAuthSession;
}
