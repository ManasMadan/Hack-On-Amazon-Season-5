import { prisma } from "@repo/database";
import { v4 } from "uuid";

// TODO
const sendVerificationCode = async (
  identifier: string,
  type: "phone" | "email",
  prefix: "verify" | "reset"
) => {
  if (prefix === "reset") {
    const uid = v4();
    console.log(
      `RESET LINK for ${identifier}`,
      `${process.env.NEXT_PUBLIC_FRONTEND_URL}/auth/reset-password?code=${uid}`
    );
    await prisma.verification.create({
      data: {
        identifier: `${prefix}-${identifier}`,
        value: uid,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
  } else {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`VERIFICATION CODE for ${identifier}`, code);
    await prisma.verification.create({
      data: {
        identifier: `${prefix}-${identifier}`,
        value: code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
  }
};

export { sendVerificationCode };
