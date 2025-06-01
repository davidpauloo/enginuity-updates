// backend/src/middleware/upload.js
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import { fileURLToPath } from 'url';
import path from 'path';

// Not strictly needed for CloudinaryStorage but good to keep for consistency
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Cloudinary (essential for both storage instances)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- Storage and Multer instance for General Documents (and default export) ---
const documentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'project_documents', // Your existing folder for general documents
    allowed_formats: ['jpeg', 'jpg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'],
    resource_type: 'auto' // Important for non-image files
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-doc-${uniqueSuffix}`); // Added '-doc-' for clarity
  }
});

const documentFileFilter = (req, file, cb) => {
    const allowedMimes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
    const extname = allowedMimes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images, PDFs, and common documents are allowed!'), false);
    }
};

const uploadDocument = multer({ // Defined as a const
  storage: documentStorage,
  limits: {
      fileSize: 1024 * 1024 * 10 // 10MB file size limit for documents
  },
  fileFilter: documentFileFilter
});

// --- NEW: Storage and Multer instance for Cover Photos ---
const coverPhotoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'project_covers', // NEW DEDICATED FOLDER for cover photos
    allowed_formats: ['jpeg', 'jpg', 'png', 'webp'], // Typically only image formats for covers
    resource_type: 'image' // Ensure it's treated as an image
  },
  filename: (req, file, cb) => {
    // A more predictable name for covers using project ID if available
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Use req.params.projectId if available, otherwise 'new' (for new project creation, if you add that route later)
    const projectIdPart = req.params.projectId || 'new';
    cb(null, `cover-${projectIdPart}-${uniqueSuffix}`);
  }
});

const coverPhotoFileFilter = (req, file, cb) => {
    const allowedMimes = /jpeg|jpg|png|webp/; // Only image types for covers
    const extname = allowedMimes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Invalid image file. Only JPG, PNG, and WebP are allowed for cover photos!'), false);
    }
};

export const uploadCoverPhoto = multer({ // Exported as a named export
  storage: coverPhotoStorage,
  limits: {
      fileSize: 1024 * 1024 * 5 // 5MB file size limit for cover photos (adjust as needed)
  },
  fileFilter: coverPhotoFileFilter
});

// --- Default Export ---
// This maintains the 'default' export for backward compatibility with existing routes
// that might still be importing 'upload' without curly braces.
export default uploadDocument; // Exporting the document upload instance as default