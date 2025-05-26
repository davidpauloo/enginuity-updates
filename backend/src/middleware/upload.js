// middleware/upload.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Setup directory
const uploadDir = path.join('uploads', 'project_documents');
fs.mkdirSync(uploadDir, { recursive: true });

// Setup multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

export default upload;
