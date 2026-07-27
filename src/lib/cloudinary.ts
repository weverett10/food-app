import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default cloudinary;

export const THUMBNAIL_FOLDER = "food-tracker/thumbnails";

export async function uploadThumbnail(
  base64DataUri: string
): Promise<{ secureUrl: string; publicId: string }> {
  const result = await cloudinary.uploader.upload(base64DataUri, {
    folder: THUMBNAIL_FOLDER,
  });
  return { secureUrl: result.secure_url, publicId: result.public_id };
}

export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}
