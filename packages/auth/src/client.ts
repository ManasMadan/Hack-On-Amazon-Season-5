import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001",
});

const { signIn } = authClient;

export const clientGoogleSignIn = async () => {
  try {
    await signIn.social({
      provider: "google",
      callbackURL: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/auth`,
    });
  } catch (error) {
    console.error("Google Sign-In Error:", error);
  }
};
