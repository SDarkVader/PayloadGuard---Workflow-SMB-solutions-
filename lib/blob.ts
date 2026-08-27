import { randomUUID } from "crypto";
import { put } from "@vercel/blob";

export async function uploadPhoto(file: File): Promise<{ url: string }> {
  const extension = file.type === "image/png" ? "png" : "jpg";
  const blob = await put(`enquiry-photos/${randomUUID()}.${extension}`, file, {
    access: "public",
  });
  return { url: blob.url };
}
