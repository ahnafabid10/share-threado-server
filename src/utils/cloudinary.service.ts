import { v2 as cloudinary } from "cloudinary";
import config from "../config";

cloudinary.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
});

/**
 * Extracts the Cloudinary public_id from a Cloudinary secure_url or full URL.
 * Example URLs:
 * - https://res.cloudinary.com/cloud/image/upload/v1570979139/sample.jpg -> "sample"
 * - https://res.cloudinary.com/cloud/image/upload/v123/posts/my_pic.png -> "posts/my_pic"
 * - https://res.cloudinary.com/cloud/image/upload/c_fill,w_500/v123/products/logo.webp -> "products/logo"
 */
export const getPublicIdFromUrl = (url?: string | null): string | null => {
  if (!url || typeof url !== "string" || !url.includes("cloudinary.com")) {
    return null;
  }

  try {
    const uploadIndex = url.indexOf("/upload/");
    if (uploadIndex === -1) return null;

    let pathAfterUpload = url.substring(uploadIndex + "/upload/".length);

    // Strip out transformation segments and version segments (e.g., c_fill,w_500/ or v1234567890/)
    const parts = pathAfterUpload.split("/");
    const cleanParts: string[] = [];

    for (const part of parts) {
      // Check if version segment e.g. v1709123456
      if (/^v\d+$/.test(part)) {
        continue;
      }
      // Check if transformation segment (contains comma or starts with common flag like c_, w_, h_, q_)
      if (
        part.includes(",") ||
        /^[a-z]{1,2}_/.test(part) ||
        part.startsWith("b_") ||
        part.startsWith("e_")
      ) {
        continue;
      }
      cleanParts.push(part);
    }

    if (cleanParts.length === 0) return null;

    // Remove file extension from the last part (e.g. image.jpg -> image)
    const fullPath = cleanParts.join("/");
    const lastDotIndex = fullPath.lastIndexOf(".");
    const publicId = lastDotIndex !== -1 ? fullPath.substring(0, lastDotIndex) : fullPath;

    return publicId || null;
  } catch (err) {
    console.error("[Cloudinary] Failed to parse public_id from URL:", url, err);
    return null;
  }
};

/**
 * Delete a single image from Cloudinary by its URL or public_id.
 */
export const deleteImageFromCloudinary = async (
  urlOrPublicId?: string | null
): Promise<any> => {
  if (!urlOrPublicId) return;

  if (!config.cloudinary.api_secret || !config.cloudinary.cloud_name) {
    console.warn(
      "[Cloudinary] Skipping deletion: CLOUDINARY_API_SECRET or CLOUDINARY_CLOUD_NAME not configured."
    );
    return;
  }

  const publicId = urlOrPublicId.includes("cloudinary.com")
    ? getPublicIdFromUrl(urlOrPublicId)
    : urlOrPublicId;

  if (!publicId) {
    return;
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
    });
    console.log(`[Cloudinary] Successfully deleted image public_id: "${publicId}"`, result);
    return result;
  } catch (error) {
    console.error(`[Cloudinary] Error deleting image "${publicId}":`, error);
  }
};

/**
 * Delete multiple images from Cloudinary in parallel.
 */
export const deleteMultipleImagesFromCloudinary = async (
  urlsOrPublicIds: (string | null | undefined)[]
): Promise<void> => {
  const validItems = urlsOrPublicIds.filter(Boolean) as string[];
  if (validItems.length === 0) return;

  await Promise.allSettled(
    validItems.map((item) => deleteImageFromCloudinary(item))
  );
};
