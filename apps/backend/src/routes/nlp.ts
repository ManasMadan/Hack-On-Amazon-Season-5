import { z } from "zod";
import { router, protectedProcedure } from "@/trpc";
import { TRPCError } from "@trpc/server";

export const nlpRouter = router({
  parsePaymentCommand: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1, "Command cannot be empty"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Simple regex-based parsing for payment commands
        const text = input.text.toLowerCase().trim();

        // Extract amount (any number in the text)
        const amountMatch = text.match(/\b(\d+(?:\.\d{1,2})?)\b/);
        const amount = amountMatch ? parseFloat(amountMatch[1]!) : null;

        // Extract recipient name
        let recipient: string | null = null;

        // Pattern: "pay 500 to kavish" or "send 100 to john"
        const toPattern =
          /(?:pay|send|transfer)\s+(?:\d+(?:\.\d{1,2})?)\s+to\s+([a-zA-Z]+)/;
        const toMatch = text.match(toPattern);
        if (toMatch) {
          recipient = toMatch[1]!;
        } else {
          // Pattern: "pay kavish 500" or "send john 100"
          const nameAmountPattern =
            /(?:pay|send|transfer)\s+([a-zA-Z]+)\s+(\d+(?:\.\d{1,2})?)/;
          const nameAmountMatch = text.match(nameAmountPattern);
          if (nameAmountMatch) {
            recipient = nameAmountMatch[1]!;
          }
        }

        // Check if it's a payment command
        const isPaymentCommand = /\b(pay|send|transfer)\b/.test(text);

        if (!isPaymentCommand) {
          return {
            success: false,
            error: "Not a payment command",
            amount: null,
            recipient: null,
          };
        }

        if (!amount || !recipient) {
          return {
            success: false,
            error: "Could not extract amount or recipient from command",
            amount,
            recipient,
          };
        }

        return {
          success: true,
          error: null,
          amount,
          recipient,
        };
      } catch (error) {
        console.error("Payment command parsing error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to parse payment command",
        });
      }
    }),
});
