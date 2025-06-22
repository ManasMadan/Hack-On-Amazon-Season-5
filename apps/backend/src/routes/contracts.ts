import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "@/trpc";
import { TRPCError } from "@trpc/server";
import {
  connectToDisputeResolver,
  getProviderAndSigner,
} from "@/utils/contractHelpers";

// Get the pre-deployed contract address from environment
const getContractAddress = () => {
  const address = process.env.DISPUTE_RESOLVER_ADDRESS;
  if (!address) {
    throw new Error(
      "DISPUTE_RESOLVER_ADDRESS not set. Contract needs to be deployed first."
    );
  }
  return address;
};

// Helper function to connect to the pre-deployed contract
const connectToContract = async () => {
  const contractAddress = getContractAddress();
  const { provider, signer } = getProviderAndSigner();
  return await connectToDisputeResolver(contractAddress, provider, signer);
};

export const contractsRouter = router({
  // Get contract and blockchain configuration info
  getInfo: publicProcedure.query(async () => {
    try {
      const { networkConfig } = getProviderAndSigner();
      const contractAddress = getContractAddress();

      return {
        contractAddress,
        network: networkConfig.network,
        chainId: networkConfig.chainId,
        rpcUrl: networkConfig.rpcUrl.replace(/\/[^\/]+$/, "/***"), // Hide API keys
        gasPrice: process.env.GAS_PRICE,
        gasLimit: process.env.GAS_LIMIT,
        isReady: true,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get contract configuration",
        cause: error,
      });
    }
  }),

  // Submit evidence for a payment dispute
  submitEvidence: protectedProcedure
    .input(
      z.object({
        paymentId: z.string().min(1, "Payment ID is required"),
        ipfsHash: z.string().min(1, "IPFS hash is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { paymentId, ipfsHash } = input;

        // Verify the payment exists and user has permission
        const payment = await ctx.prisma.payment.findFirst({
          where: {
            id: paymentId,
            OR: [{ fromUserId: ctx.user.id }, { toUserId: ctx.user.id }],
          },
        });

        if (!payment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "Payment not found or you don't have permission to submit evidence",
          });
        }

        const contract = await connectToContract();
        const tx = await contract.submitEvidence(paymentId, ipfsHash);
        await tx.wait();

        console.log("Evidence submitted:", {
          paymentId,
          submittedBy: ctx.user.id,
          ipfsHash,
          transactionHash: tx.hash,
        });

        return {
          success: true,
          transactionHash: tx.hash,
          paymentId,
          ipfsHash,
        };
      } catch (error) {
        console.error("Submit evidence error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to submit evidence",
          cause: error,
        });
      }
    }),

  // Vote on whether a payment is fraudulent
  voteOnDispute: protectedProcedure
    .input(
      z.object({
        paymentId: z.string().min(1, "Payment ID is required"),
        isFraud: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { paymentId, isFraud } = input;

        // Verify the payment exists
        const payment = await ctx.prisma.payment.findUnique({
          where: { id: paymentId },
        });

        if (!payment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Payment not found",
          });
        }

        const contract = await connectToContract();
        const tx = await contract.vote(paymentId, isFraud);
        await tx.wait();

        console.log("Vote submitted:", {
          paymentId,
          votedBy: ctx.user.id,
          isFraud,
          transactionHash: tx.hash,
        });

        return {
          success: true,
          transactionHash: tx.hash,
          paymentId,
          vote: isFraud ? "fraud" : "legitimate",
        };
      } catch (error) {
        console.error("Vote on dispute error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to submit vote",
          cause: error,
        });
      }
    }),

  // Resolve a dispute
  resolveDispute: protectedProcedure
    .input(
      z.object({
        paymentId: z.string().min(1, "Payment ID is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { paymentId } = input;

        // Verify the payment exists and user has permission
        const payment = await ctx.prisma.payment.findFirst({
          where: {
            id: paymentId,
            OR: [{ fromUserId: ctx.user.id }, { toUserId: ctx.user.id }],
          },
        });

        if (!payment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "Payment not found or you don't have permission to resolve this dispute",
          });
        }

        const contract = await connectToContract();
        const tx = await contract.resolveDispute(paymentId);
        await tx.wait();

        console.log("Dispute resolved:", {
          paymentId,
          resolvedBy: ctx.user.id,
          transactionHash: tx.hash,
        });

        return {
          success: true,
          transactionHash: tx.hash,
          paymentId,
          status: "resolved",
        };
      } catch (error) {
        console.error("Resolve dispute error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to resolve dispute",
          cause: error,
        });
      }
    }),

  // Get evidence for a dispute
  getEvidence: publicProcedure
    .input(
      z.object({
        paymentId: z.string().min(1, "Payment ID is required"),
      })
    )
    .query(async ({ input }) => {
      try {
        const { paymentId } = input;

        const contract = await connectToContract();
        const evidence = await contract.getEvidence(paymentId);

        return {
          paymentId,
          evidenceHashes: evidence,
          count: evidence.length,
        };
      } catch (error) {
        console.error("Get evidence error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get evidence",
          cause: error,
        });
      }
    }),

  // Get dispute details
  getDispute: publicProcedure
    .input(
      z.object({
        paymentId: z.string().min(1, "Payment ID is required"),
      })
    )
    .query(async ({ input }) => {
      try {
        const { paymentId } = input;

        const contract = await connectToContract();
        const dispute = await contract.getDispute(paymentId);

        return {
          paymentId: dispute.paymentId,
          evidenceHashes: dispute.evidenceHashes,
          isResolved: dispute.isResolved,
          isFraud: dispute.isFraud,
          evidenceCount: dispute.evidenceHashes.length,
        };
      } catch (error) {
        console.error("Get dispute error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get dispute details",
          cause: error,
        });
      }
    }),

  // Test contract connection
  testConnection: publicProcedure.query(async () => {
    try {
      const { networkConfig } = getProviderAndSigner();
      const contractAddress = getContractAddress();
      const contract = await connectToContract();

      // Try to get the contract address to verify connection
      const address = contract.getAddress();

      return {
        success: true,
        contractAddress: address,
        network: networkConfig.network,
        chainId: networkConfig.chainId,
        message: `Successfully connected to contract on ${networkConfig.network}`,
      };
    } catch (error) {
      console.error("Test connection error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Failed to connect to contract. Check if blockchain service is running.",
        cause: error,
      });
    }
  }),
});
