import { v2 as cloudinary } from 'cloudinary';
import { config } from 'dotenv';

config(); // Load environment variables

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload helper
export const uploadToCloudinary = (fileBuffer, folder = 'misc', fileName = '') => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: fileName ? fileName.split('.')[0] : undefined,
        resource_type: 'auto', // Automatically handle image, PDF, DOCX, etc.
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    ).end(fileBuffer);
  });
};

export default cloudinary;
