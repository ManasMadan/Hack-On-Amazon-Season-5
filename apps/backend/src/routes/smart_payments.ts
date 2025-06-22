import { z } from "zod";
import { router, protectedProcedure } from "@/trpc";
import { Prisma } from "@repo/database/types";

// Type definitions for the AI service response
type AIPaymentMethodProbs = {
  bank: number;
  credit_card: number;
  debit_card: number;
  upi_id: number;
};

type AIServiceResponse = {
  best_payment_method: string;
  note: string;
  probs: AIPaymentMethodProbs;
  score: number;
  timestamp: string;
};

const SUCCESS_RATE_RATIO = 0.4;
const AI_PROB_RATIO = 1 - SUCCESS_RATE_RATIO;

export const smartPaymentRouter = router({
  getSmartPaymentMethod: protectedProcedure.query(async ({ ctx }) => {
    const aiServiceUrl =
      process.env.SMART_ROUTING_API || "http://localhost:5001";
    const userId = ctx.session.user.id;

    try {
      // Fetch user's active payment methods with stats
      const userPaymentMethods = await ctx.prisma.paymentMethod.findMany({
        where: {
          userId,
          archivedAt: null,
        },
        orderBy: { createdAt: "desc" },
      });

      if (userPaymentMethods.length === 0) {
        return {
          rankedPaymentMethods: [],
          aiResponse: null,
          message: "No payment methods found for user",
        };
      }

      // Fetch AI predictions
      let aiResponse: AIServiceResponse;
      try {
        const response = await fetch(aiServiceUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          throw new Error(
            `AI service responded with status: ${response.status}`
          );
        }

        aiResponse = await response.json();
      } catch (error) {
        console.error("Error fetching AI predictions:", error);
        // Fallback to equal probabilities if AI service fails
        aiResponse = {
          best_payment_method: "upi_id",
          note: "AI service unavailable, using fallback scores",
          probs: {
            bank: 0.25,
            credit_card: 0.25,
            debit_card: 0.25,
            upi_id: 0.25,
          },
          score: 0.25,
          timestamp: new Date().toISOString(),
        };
      }

      // Calculate final scores for each user payment method
      const rankedPaymentMethods = userPaymentMethods
        .map((paymentMethod) => {
          // Calculate success rate from database
          const totalPayments =
            paymentMethod.successfulPayments +
            paymentMethod.failedPayments +
            paymentMethod.disputedPayments;

          const successRate =
            totalPayments > 0
              ? paymentMethod.successfulPayments / totalPayments
              : 0;

          // Get AI probability for this payment method type
          const aiProbability = aiResponse.probs[paymentMethod.type] || 0;

          // Calculate final score: 40% success rate + 60% AI probability
          const finalScore =
            successRate * SUCCESS_RATE_RATIO + aiProbability * AI_PROB_RATIO;

          return {
            paymentMethod,
            finalScore: Math.round(finalScore * 10000) / 100, // Convert to percentage with 2 decimals
          };
        })
        // Sort by final score descending (best first)
        .sort((a, b) => b.finalScore - a.finalScore);

      return {
        bestPaymentMethod: rankedPaymentMethods[0]?.paymentMethod,
      };
    } catch (error) {
      console.error("Error in smart payment method ranking:", error);
      throw new Error("Failed to calculate smart payment method ranking");
    }
  }),
});
