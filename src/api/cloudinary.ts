import { v2 as cloudinary } from "cloudinary";

let isCloudinaryConfigured = false;

/**
 * Lazily configures and returns the Cloudinary SDK client.
 * This prevents crashes on startup if the environment variables are not yet configured.
 */
export const getCloudinary = () => {
  if (!isCloudinaryConfigured) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Missing Cloudinary configuration. Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your settings.");
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    isCloudinaryConfigured = true;
  }
  return cloudinary;
};

/**
 * Uploads a file buffer directly to Cloudinary and returns its secure URL.
 * 
 * @param buffer - The file Buffer from Multer memory storage
 * @param folder - The Cloudinary folder pathway (e.g. reports/userId/reportId)
 * @param publicId - Optional public ID filename to give the asset
 */
export const uploadBufferToCloudinary = (
  buffer: Buffer,
  folder: string,
  publicId?: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const cloud = getCloudinary();
      
      const stream = cloud.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: "auto",
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload stream callback error:", error);
            reject(new Error(`Cloudinary upload failed: ${error.message}`));
          } else if (result && result.secure_url) {
            resolve(result.secure_url);
          } else {
            reject(new Error("Cloudinary upload did not return a secure URL"));
          }
        }
      );
      
      stream.end(buffer);
    } catch (err: any) {
      console.error("Error setting up Cloudinary upload stream:", err);
      reject(err);
    }
  });
};
