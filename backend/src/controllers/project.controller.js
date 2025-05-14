import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import Project from '../models/project.model.js';
import asyncHandler from '../middleware/asyncHandler.js';
import mongoose from 'mongoose';

// Set up __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'project_documents'); // Absolute path
    fs.existsSync(uploadDir) || fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});

// Multer upload configuration
const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('File type not allowed.'));
  }
});

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
const createProject = asyncHandler(async (req, res) => {
  const { clientName, location, description, startDate, targetDeadline } = req.body;

  if (!clientName || !location || !startDate || !targetDeadline) {
    res.status(400);
    throw new Error('Please provide all required project fields');
  }

  const project = new Project({
    clientName,
    location,
    description,
    startDate,
    targetDeadline,
    createdBy: req.user._id,
  });

  const createdProject = await project.save();
  res.status(201).json(createdProject);
});

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
const getProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({}).sort({ createdAt: -1 });
  res.status(200).json(projects);
});

// @desc    Get a single project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid project ID format');
  }

  const project = await Project.findById(req.params.id);
  if (project) {
    res.status(200).json(project);
  } else {
    res.status(404);
    throw new Error('Project not found');
  }
});

// @desc    Upload a document to a project
// @route   POST /api/projects/:id/documents
// @access  Private
const uploadDocumentToProject = asyncHandler(async (req, res) => {
  const { id: projectId } = req.params;

  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded. Please select a file.');
  }

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    res.status(400);
    throw new Error('Invalid project ID format for document upload.');
  }

  const project = await Project.findById(projectId);
  if (!project) {
    res.status(404);
    throw new Error('Project not found to upload document to.');
  }

  const filePathForDb = `uploads/project_documents/${req.file.filename}`;
  const fileUrlForClient = `/uploads/project_documents/${req.file.filename}`;

  const newDocument = {
    fileName: req.file.originalname,
    filePath: fileUrlForClient,
    fileType: req.file.mimetype,
  };

  project.documents.push(newDocument);
  const updatedProject = await project.save();

  res.status(201).json({
    message: 'Document uploaded successfully',
    project: updatedProject
  });
});

// @desc    Delete a document from a project
// @route   DELETE /api/projects/:projectId/documents/:documentId
// @access  Private
const deleteDocumentFromProject = asyncHandler(async (req, res) => {
  const { projectId, documentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(documentId)) {
    res.status(400);
    throw new Error('Invalid project or document ID.');
  }

  const project = await Project.findById(projectId);
  if (!project) {
    res.status(404);
    throw new Error('Project not found.');
  }

  const document = project.documents.id(documentId);
  if (!document) {
    res.status(404);
    throw new Error('Document not found in the project.');
  }

  const filePath = path.join(__dirname, '..', '..', document.filePath);
  console.log('Attempting to delete file at:', filePath);  // Debugging log

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);  // Delete the file
    console.log('File deleted successfully');
  } else {
    console.log('File does not exist at the specified path');
  }

  project.documents.pull(documentId); // Correctly remove the document from the project
  const updatedProject = await project.save();

  res.status(200).json({
    message: 'Document deleted successfully.',
    project: updatedProject,
  });
});

// @desc    Delete a project and its documents
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid project ID.');
  }

  const project = await Project.findById(id);
  if (!project) {
    res.status(404);
    throw new Error('Project not found.');
  }

  // Delete associated files
  for (const doc of project.documents) {
    const filePath = path.join(__dirname, '..', '..', doc.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await project.deleteOne();

  res.status(200).json({ message: 'Project and associated documents deleted successfully.' });
});

// Export all controller functions
export {
  createProject,
  getProjects,
  getProjectById,
  uploadDocumentToProject,
  deleteDocumentFromProject,
  deleteProject
};
