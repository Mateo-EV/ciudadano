import { UTApi } from "uploadthing/server";

export const utapi = new UTApi();

export async function uploadFileToUploadthing(
  file: File,
): Promise<{ url: string; key: string }> {
  const { error, data } = await utapi.uploadFiles(file);

  if (error) {
    console.error("Error uploading file to Uploadthing:", error);
    throw new Error(error.message);
  }

  return { url: data.ufsUrl, key: data.key };
}

export async function deleteFromUploadthing(key: string): Promise<void> {
  const { success } = await utapi.deleteFiles(key);

  if (!success) {
    console.error("Error deleting file from Uploadthing:");
    throw new Error("Failed to delete file from Uploadthing");
  }
}
