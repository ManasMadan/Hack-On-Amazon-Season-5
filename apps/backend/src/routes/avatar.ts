import { z } from "zod";
import { router, publicProcedure } from "@/trpc";
import { v4 } from "uuid";
import { Client } from "minio";

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ROOT_USER,
  secretKey: process.env.MINIO_ROOT_PASSWORD,
});

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || "profile-pictures";

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
    throw new Error("Failed to initialize storage");
  }
}

export const avatarRouter = router({
  uploadImage: publicProcedure
    .input(
      z.object({
        arrayBuffer: z.any(),
        filename: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { arrayBuffer, filename } = input;
      const extension = filename ? filename.split(".").pop() : "file";

      const uniqueFilename = `${v4()}.${extension}`;

      await ensureBucketExists();

      try {
        const buffer =
          arrayBuffer instanceof Uint8Array
            ? Buffer.from(arrayBuffer)
            : Buffer.from(new Uint8Array(arrayBuffer.data || arrayBuffer));
        await minioClient.putObject(BUCKET_NAME, uniqueFilename, buffer);

        return {
          fileKey: `/${uniqueFilename}`,
        };
      } catch (error) {
        console.error("Error uploading image:", error);
        throw Error("Failed to upload image");
      }
    }),

  // Get a public URL for an existing file
  getPublicUrl: publicProcedure
    .input(z.object({ fileKey: z.string() }))
    .query(({ input }) => {
      const { fileKey } = input;

      return {
        mediaUrl: `${process.env.MINIO_ENDPOINT || "http://localhost:9000"}/${BUCKET_NAME}/${fileKey}`,
      };
    }),
});
