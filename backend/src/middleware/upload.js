// backend/src/middleware/upload.js
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary";
import path from "path";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Document storage (raw files allowed)
const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "project_documents",
    allowed_formats: [
      "jpeg","jpg","png","gif","pdf","doc","docx","xls","xlsx","txt","csv","zip","ppt","pptx","rar","7z",
    ],
    resource_type: "raw",
    access_mode: "public",
    type: "upload",
    public_id: (req, file) => {
      const base = (file.originalname || "file").replace(/\.[^/.]+$/, "");
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      return `${base}-${unique}`;
    },
  },
});

// Server-side MIME filter for documents
const documentFileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|csv|zip|ppt|pptx|rar|7z/;
  const extname = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowed.test(file.mimetype);
  if (extname && mimetype) cb(null, true);
  else cb(new Error("Invalid file type."), false);
};

// Multer instance for documents (default export)
const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: documentFileFilter,
});

// Avatar storage configuration
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "user_avatars",
    allowed_formats: ["jpeg", "jpg", "png", "webp"],
    resource_type: "image",
    access_mode: "public",
    type: "upload",
    public_id: (req, file) => {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const uid = req.user?._id || "guest";
      return `avatar-${uid}-${unique}`;
    },
  },
});

// Avatar file filter
const avatarFileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const extname = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowed.test(file.mimetype);
  if (extname && mimetype) cb(null, true);
  else cb(new Error("Invalid avatar file."), false);
};

// Named export for avatars
export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: avatarFileFilter,
});

// Cover photo storage configuration
const coverPhotoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "project_covers",
    allowed_formats: ["jpeg", "jpg", "png", "webp"],
    resource_type: "image",
    access_mode: "public",
    type: "upload",
    public_id: (req, file) => {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const pid = req.params.projectId || "new";
      return `cover-${pid}-${unique}`;
    },
  },
});

// Cover photo file filter
const coverPhotoFileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const extname = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowed.test(file.mimetype);
  if (extname && mimetype) cb(null, true);
  else cb(new Error("Invalid image file."), false);
};

// Named export for cover photos
export const uploadCoverPhoto = multer({
  storage: coverPhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: coverPhotoFileFilter,
});

// Default export must be the document uploader used as upload.single("file")
export default uploadDocument;