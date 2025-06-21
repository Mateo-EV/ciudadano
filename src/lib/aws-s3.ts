import { env } from "@/env";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY,
    secretAccessKey: env.AWS_SECRET_KEY,
  },
});

function generateFileLink(key: string) {
  return `https://${env.AWS_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}

export async function uploadToS3(
  file: File,
): Promise<{ url: string; key: string }> {
  const Key = crypto.randomUUID();

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const command = new PutObjectCommand({
    Bucket: env.AWS_BUCKET_NAME,
    Key,
    Body: buffer,
    ContentType: file.type,
  });

  try {
    await s3Client.send(command);

    return {
      url: generateFileLink(Key),
      key: Key,
    };
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw error;
  }
}

export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: env.AWS_BUCKET_NAME,
    Key: key,
  });

  try {
    await s3Client.send(command);
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw error;
  }
}

export function getFileKeyFromUrl(url: string): string {
  const regex = new RegExp(
    `https://${env.AWS_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/(.*)`,
  );
  const match = url.match(regex);

  if (!match || match.length < 2) {
    throw new Error("Invalid S3 URL format");
  }

  return match[1]!;
}
