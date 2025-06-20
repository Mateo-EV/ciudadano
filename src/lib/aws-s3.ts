import { env } from "@/env";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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

  const command = new PutObjectCommand({
    Bucket: env.AWS_BUCKET_NAME,
    Key,
    Body: file,
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
