import imageCompression from "browser-image-compression";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1, // Compress to max 1MB
  maxWidthOrHeight: 1920, // Max dimension
  useWebWorker: true,
  fileType: "image/jpeg" as const,
};

export async function compressImage(file: File): Promise<File> {
  // Skip compression if file is already small enough
  if (file.size <= 1 * 1024 * 1024) {
    return file;
  }

  try {
    const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
    return compressed;
  } catch (error) {
    console.warn("Image compression failed, using original:", error);
    return file;
  }
}
