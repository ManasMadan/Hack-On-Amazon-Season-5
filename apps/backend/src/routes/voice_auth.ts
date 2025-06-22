import { z } from "zod";
import { router, protectedProcedure } from "@/trpc";
import { TRPCError } from "@trpc/server";
import { v4 } from "uuid";
import { Client } from "minio";

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ROOT_USER,
  secretKey: process.env.MINIO_ROOT_PASSWORD,
});

const BUCKET_NAME = process.env.MINIO_VOICE_BUCKET_NAME || "voice-auth";
const VOICE_AUTH_API_URL = process.env.VOICE_AUTH_API_URL || "http://localhost:3533";

async function ensureBucketExists() {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME);
      await minioClient.setBucketPolicy(
        BUCKET_NAME,
        JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { AWS: ["*"] },
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
            },
          ],
        })
      );
    }
  } catch (error) {
    console.error("Error ensuring bucket exists:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to initialize storage",
    });
  }
}

async function uploadAudioToMinio(userId: string, audioBase64: string, filename: string): Promise<string> {
  await ensureBucketExists();

  const extension = filename ? filename.split(".").pop() : "wav";
  const uniqueFilename = `audio/${userId}/${v4()}.${extension}`;

  try {
    const buffer = Buffer.from(audioBase64, "base64");
    await minioClient.putObject(BUCKET_NAME, uniqueFilename, buffer);
    return uniqueFilename;
  } catch (error) {
    console.error("Error uploading audio:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to upload audio file",
    });
  }
}

async function deleteAudioFromMinio(minioPath: string): Promise<void> {
  try {
    await minioClient.removeObject(BUCKET_NAME, minioPath);
  } catch (error) {
    console.error("Error deleting audio:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to delete audio file",
    });
  }
}

async function callVoiceAuthAPI(endpoint: string, method: string, body?: any) {
  try {
    const response = await fetch(`${VOICE_AUTH_API_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new TRPCError({
        code: response.status === 404 ? "NOT_FOUND" : 
              response.status === 400 ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR",
        message: errorData.detail || `API request failed with status ${response.status}`,
      });
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    console.error("Voice Auth API Error:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to communicate with voice authentication service",
    });
  }
}

export const voiceAuthRouter = router({
  // Add voice sample
  addVoiceSample: protectedProcedure
    .input(
      z.object({
        audioBase64: z.string().min(1, "Audio data is required"),
        filename: z.string().min(1, "Filename is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { audioBase64, filename } = input;
      const userId = ctx.session.user.id;

      try {
        // Upload audio to MinIO
        const minioPath = await uploadAudioToMinio(userId, audioBase64, filename);

        // Register with voice auth API
        const result = await callVoiceAuthAPI("/user", "POST", {
          user_id: userId,
          minio_path: minioPath,
        });

        return {
          success: true,
          message: "Voice sample added successfully",
          minioPath,
          apiResponse: result,
        };
      } catch (error) {
        // If API call fails but file was uploaded, clean up
        if (error instanceof TRPCError && error.message.includes("voice authentication")) {
          // Try to delete the uploaded file
          try {
            await deleteAudioFromMinio(input.filename);
          } catch (cleanupError) {
            console.error("Failed to cleanup uploaded file:", cleanupError);
          }
        }
        throw error;
      }
    }),

  // List all voice samples
  listVoiceSamples: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      try {
        const result = await callVoiceAuthAPI(`/user?user_id=${encodeURIComponent(userId)}`, "GET");
        
        return {
          samples: result.minio_paths || [],
          count: result.minio_paths?.length || 0,
        };
      } catch (error) {
        // If user not found, return empty array instead of throwing error
        if (error instanceof TRPCError && error.code === "NOT_FOUND") {
          return {
            samples: [],
            count: 0,
          };
        }
        throw error;
      }
    }),

  // Delete voice sample
  deleteVoiceSample: protectedProcedure
    .input(
      z.object({
        minioPath: z.string().min(1, "MinIO path is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { minioPath } = input;
      const userId = ctx.session.user.id;

      try {
        // Delete from voice auth API first
        await callVoiceAuthAPI("/user", "DELETE", {
          user_id: userId,
          minio_path: minioPath,
        });

        // Delete from MinIO
        await deleteAudioFromMinio(minioPath);

        return {
          success: true,
          message: "Voice sample deleted successfully",
          minioPath,
        };
      } catch (error) {
        // If API deletion fails, still try to clean up MinIO file
        if (error instanceof TRPCError && error.message.includes("voice authentication")) {
          try {
            await deleteAudioFromMinio(minioPath);
          } catch (cleanupError) {
            console.error("Failed to cleanup MinIO file:", cleanupError);
          }
        }
        throw error;
      }
    }),

  // Test/authenticate with voice sample
  testVoiceAuthentication: protectedProcedure
    .input(
      z.object({
        audioBase64: z.string().min(1, "Audio data is required"),
        filename: z.string().min(1, "Filename is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { audioBase64, filename } = input;
      const userId = ctx.session.user.id;

      try {
        // Upload test audio to MinIO (temporary)
        const minioPath = await uploadAudioToMinio(userId, audioBase64, filename);

        try {
          // Test authentication with voice auth API
          const result = await callVoiceAuthAPI("/user/authenticate", "POST", {
            user_id: userId,
            minio_path: minioPath,
          });

          return {
            authenticated: result.authenticated,
            reason: result.reason || null,
            confidence: result.confidence || null,
            message: result.authenticated 
              ? "Voice authentication successful" 
              : `Voice authentication failed${result.reason ? `: ${result.reason}` : ""}`,
          };
        } finally {
          // Clean up temporary test file
          try {
            await deleteAudioFromMinio(minioPath);
          } catch (cleanupError) {
            console.error("Failed to cleanup test audio file:", cleanupError);
          }
        }
      } catch (error) {
        throw error;
      }
    }),

  // Get public URL for audio file (for playback/download)
  getAudioUrl: protectedProcedure
    .input(
      z.object({
        minioPath: z.string().min(1, "MinIO path is required"),
      })
    )
    .query(({ input }) => {
      const { minioPath } = input;
      
      return {
        audioUrl: `${process.env.MINIO_ENDPOINT || "http://localhost:9000"}/${BUCKET_NAME}/${minioPath}`,
      };
    }),

  // Get voice authentication statistics
  getVoiceAuthStats: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      try {
        const samplesResult = await callVoiceAuthAPI(`/user?user_id=${encodeURIComponent(userId)}`, "GET");
        
        return {
          totalSamples: samplesResult.minio_paths?.length || 0,
          isRegistered: (samplesResult.minio_paths?.length || 0) > 0,
          canAuthenticate: (samplesResult.minio_paths?.length || 0) > 0,
        };
      } catch (error) {
        // If user not found, return default stats
        if (error instanceof TRPCError && error.code === "NOT_FOUND") {
          return {
            totalSamples: 0,
            isRegistered: false,
            canAuthenticate: false,
          };
        }
        throw error;
      }
    }),
});