// src/controllers/project.controller.js

// REMOVE THESE IMPORTS FROM HERE IF THEY ARE ONLY FOR MULTER SETUP
// import { fileURLToPath } from 'url';
// import { dirname } from 'path';
// import fs from 'fs'; // KEEP this if used for fs.unlinkSync later in the file
// import path from 'path'; // KEEP this if used for path.extname or other path ops later
// REMOVE THIS: import multer from 'multer';

import Project from '../models/project.model.js';
import asyncHandler from '../middleware/asyncHandler.js';
import mongoose from 'mongoose';
import User from '../models/user.model.js'; // Keep this if you still use it for `createdBy` or `activities.assignedTo`

// Set up __dirname for ES Modules (Keep if needed for other non-multer path logic)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// REMOVE ALL MULTER CONFIGURATION BLOCKS FROM HERE
// Including: UPLOADS_BASE_DIR, PROJECT_DOCUMENTS_DIR, fs.mkdirSync calls, storage, upload

// Helper function for ID validation
const validateObjectId = (id, paramName = 'ID') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${paramName} format`);
  }
};

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
const createProject = asyncHandler(async (req, res) => {
  const {
    clientName,
    location,
    description,
    startDate,
    targetDeadline,
    budget,
    status
  } = req.body;

  // FIX: Make sure targetDeadline is correctly validated as required.
  // The '!!' operator converts to boolean, so `!!targetDeadline` means "if targetDeadline is truthy".
  // If it's a required field, you want `!targetDeadline` (if targetDeadline is falsy/missing).
  if (!clientName || !location || !startDate || !targetDeadline) {
    res.status(400);
    throw new Error('Please provide all required project fields: Client Name, Location, Start Date, Target Deadline.');
  }
  if (isNaN(new Date(startDate).getTime()) || isNaN(new Date(targetDeadline).getTime())) {
    res.status(400);
    throw new Error('Invalid date format for Start Date or Target Deadline.');
  }
  if (budget && isNaN(parseFloat(budget.estimated))) {
      res.status(400);
      throw new Error('Budget estimated value must be a number.');
  }

  const project = new Project({
    clientName,
    location,
    description,
    startDate: new Date(startDate),
    targetDeadline: new Date(targetDeadline),
    budget: budget ? {
        estimated: parseFloat(budget.estimated),
        currency: budget.currency || 'USD'
    } : undefined,
    status: status || 'planning',
    createdBy: req.user._id,
  });

  const createdProject = await project.save();
  res.status(201).json(createdProject);
});

// @desc    Add activity to project
// @route   POST /api/projects/:id/activities
// @access  Private
const addActivityToProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { name, description, startDate, dueDate } = req.body;

  // Validate project ID
  validateObjectId(projectId, 'project ID');

  // Find the project
  const project = await Project.findById(projectId);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  // Validate required fields
  if (!name || !startDate || !dueDate) {
    res.status(400);
    throw new Error('Name, Start Date, and Due Date are required for an activity');
  }

  // Validate date formats
  if (isNaN(new Date(startDate).getTime()) || isNaN(new Date(dueDate).getTime())) {
    res.status(400);
    throw new Error('Invalid date format for Start Date or Due Date');
  }

  // Create new activity object
  const newActivity = {
    name: name.trim(),
    description: description ? description.trim() : '',
    startDate: new Date(startDate),
    dueDate: new Date(dueDate),
    status: 'pending',
    createdAt: new Date()
  };

  // Add activity to project
  project.activities.push(newActivity);
  
  // Save the project
  const updatedProject = await project.save();

  // Validate the save operation
  if (!updatedProject || !Array.isArray(updatedProject.activities)) {
    res.status(500);
    throw new Error('Error saving project with new activity');
  }

  // Return success response
  res.status(201).json({
    message: 'Activity added successfully',
    project: updatedProject
  });
});

// @desc    Add employee to project
// @route   POST /api/projects/:id/employees
// @access  Private
const addEmployeeToProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { name, role, wagePerDay, startDate, endDate } = req.body;

  // Validate project ID
  validateObjectId(projectId, 'project ID');

  // Find the project
  const project = await Project.findById(projectId);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  // Validate required fields
  if (!name || !role || !wagePerDay || !startDate) {
    res.status(400);
    throw new Error('Name, Role, Wage per Day, and Start Date are required for an employee');
  }

  // Validate wage is a positive number
  const wage = parseFloat(wagePerDay);
  if (isNaN(wage) || wage < 0) {
    res.status(400);
    throw new Error('Wage per Day must be a positive number');
  }

  // Validate date formats
  if (isNaN(new Date(startDate).getTime()) || (endDate && isNaN(new Date(endDate).getTime()))) {
    res.status(400);
    throw new Error('Invalid date format for Start Date or End Date');
  }

  // Create new employee object
  const newEmployee = {
    name: name.trim(),
    role: role.trim(),
    wagePerDay: wage,
    startDate: new Date(startDate),
    endDate: endDate ? new Date(endDate) : undefined,
    assignedAt: new Date()
  };

  // Add employee to project
  project.employees.push(newEmployee);
  
  // Save the project
  const updatedProject = await project.save();

  // Validate the save operation
  if (!updatedProject || !Array.isArray(updatedProject.employees)) {
    res.status(500);
    throw new Error('Error saving project with new employee');
  }

  // Return success response
  res.status(201).json({
    message: 'Employee added successfully',
    project: updatedProject
  });
});

// ... (keep getProjects, getProjectById, updateProject, addEmployeeToProject, removeEmployeeFromProject, updateActivity functions as they are) ...

// @desc    Upload document to project
// @route   POST /api/projects/:id/documents
// @access  Private
const uploadDocumentToProject = asyncHandler(async (req, res) => {
  const { id: projectId } = req.params;
  validateObjectId(projectId, 'project ID');

  const file = req.file; // This 'req.file' is provided by Multer from the routes file

  if (!file) {
    res.status(400);
    throw new Error('No file uploaded.');
  }

  const project = await Project.findById(projectId);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  project.documents.push({
    fileName: file.originalname,
    filePath: file.path,
    fileType: file.mimetype,
    uploadedAt: new Date()
  });

  const updatedProject = await project.save();

  res.status(201).json({
    message: 'Document uploaded successfully',
    project: updatedProject
  });
});

// @desc    Delete document from project
// @route   DELETE /api/projects/:id/documents/:documentId
// @access  Private
const deleteDocumentFromProject = asyncHandler(async (req, res) => {
  const { id: projectId, documentId } = req.params;
  validateObjectId(projectId, 'project ID');
  validateObjectId(documentId, 'document ID');

  const project = await Project.findById(projectId);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  const document = project.documents.id(documentId);
  if (!document) {
    res.status(404);
    throw new Error('Document not found in this project.');
  }

  // KEEP fs.unlinkSync here as it's a file system operation needed by the controller
  try {
    if (fs.existsSync(document.filePath)) {
        fs.unlinkSync(document.filePath);
    } else {
        console.warn(`File not found on disk for document ID: ${documentId}, path: ${document.filePath}`);
    }
  } catch (err) {
    console.error('Error deleting file from filesystem:', err);
  }

  project.documents.pull({ _id: documentId });

  const updatedProject = await project.save();

  res.status(200).json({
    message: 'Document deleted successfully',
    project: updatedProject
  });
});

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = asyncHandler(async (req, res) => {
  const { id: projectId } = req.params;
  validateObjectId(projectId, 'project ID');

  const project = await Project.findById(projectId);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  // KEEP fs.unlinkSync here for deleting associated files
  project.documents.forEach(doc => {
    try {
      if (doc.filePath && fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }
    } catch (err) {
      console.error(`Error deleting file ${doc.filePath} during project deletion:`, err);
    }
  });

  await Project.deleteOne({ _id: projectId });

  res.status(200).json({
    message: 'Project and all associated data deleted successfully'
  });
});


// Exporting functions
export {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  addEmployeeToProject,
  removeEmployeeFromProject,
  addActivityToProject,
  updateActivity,
  uploadDocumentToProject,
  deleteDocumentFromProject,
  deleteProject
};