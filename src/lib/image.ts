import sharp from "sharp";

const MAX_ANALYSIS_DIMENSION = 1568;
const THUMBNAIL_WIDTH = 400;

export async function prepareForAnalysis(
  buffer: Buffer
): Promise<{ base64: string; mediaType: "image/jpeg" }> {
  const resized = await sharp(buffer)
    .rotate() // apply EXIF orientation
    .resize(MAX_ANALYSIS_DIMENSION, MAX_ANALYSIS_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer();

  return { base64: resized.toString("base64"), mediaType: "image/jpeg" };
}

export async function prepareThumbnail(buffer: Buffer): Promise<string> {
  const resized = await sharp(buffer)
    .rotate()
    .resize(THUMBNAIL_WIDTH, null, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  return `data:image/jpeg;base64,${resized.toString("base64")}`;
}
