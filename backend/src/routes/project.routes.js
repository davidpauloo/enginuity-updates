import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import {
  createProject,
  getProjects,
  getProjectById,
  uploadDocumentToProject,
  deleteDocumentFromProject,
} from '../controllers/project.controller.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// ✅ Configure diskStorage (NOT memoryStorage)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join('uploads', 'project_documents');
    fs.existsSync(uploadDir) || fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Invalid file type'));
  }
 });
 
// DELETE /api/items/:id
router.delete('/:id', async (req, res) => {
    try {
      const deletedItem = await Item.findByIdAndDelete(req.params.id);
      if (!deletedItem) {
        return res.status(404).json({ message: 'Item not found' });
      }
      res.json({ message: 'Item deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });
  
// Routes
router.post('/', protectRoute, createProject);
router.get('/', protectRoute, getProjects);
router.get('/:id', protectRoute, getProjectById);
router.post('/:id/documents', protectRoute, upload.single('document'), uploadDocumentToProject);
router.delete('/:projectId/documents/:documentId',protectRoute,deleteDocumentFromProject);

export default router;
