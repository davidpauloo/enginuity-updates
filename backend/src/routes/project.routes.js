import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';
import express from 'express';
import Project from '../models/project.model.js';
import asyncHandler from '../middleware/asyncHandler.js';
import mongoose from 'mongoose';
import User from '../models/user.model.js';
import upload from '../middleware/upload.js';

// Set up __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize router
const router = express.Router();

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

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
const getProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({})
    .populate('activities.assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json(projects);
});

// @desc    Get a single project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateObjectId(id, 'project ID');

  const project = await Project.findById(id)
    .populate('activities.assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .lean();

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }
  res.status(200).json(project);
});

// @desc    Update project details
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateObjectId(id, 'project ID');

  const {
    clientName,
    location,
    description,
    startDate,
    targetDeadline,
    budget,
    status,
    progress
  } = req.body;

  const project = await Project.findById(id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  if (clientName) project.clientName = clientName;
  if (location) project.location = location;
  if (description) project.description = description;
  if (startDate) project.startDate = new Date(startDate);
  if (targetDeadline) project.targetDeadline = new Date(targetDeadline);
  if (status) project.status = status;
  if (progress !== undefined) {
      if (typeof progress !== 'number' || progress < 0 || progress > 100) {
          res.status(400);
          throw new Error('Progress must be a number between 0 and 100.');
      }
      project.progress = progress;
  }
  if (budget) {
      if (budget.estimated !== undefined) {
          if (typeof budget.estimated !== 'number' || isNaN(budget.estimated)) {
              res.status(400);
              throw new Error('Budget estimated value must be a number.');
          }
          project.budget.estimated = budget.estimated;
      }
      if (budget.spent !== undefined) {
          if (typeof budget.spent !== 'number' || isNaN(budget.spent)) {
              res.status(400);
              throw new Error('Budget spent value must be a number.');
          }
          project.budget.spent = budget.spent;
      }
      if (budget.currency) project.budget.currency = budget.currency;
  }

  const updatedProject = await project.save();
  res.status(200).json(updatedProject);
});


// @desc    Add employee to project
// @route   POST /api/projects/:id/employees
// @access  Private
const addEmployeeToProject = asyncHandler(async (req, res) => {
  const { id: projectId } = req.params;
  validateObjectId(projectId, 'project ID');

  const { name, role, wagePerDay, startDate, endDate } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400);
      throw new Error('Employee name is required and must be a non-empty string.');
  }
  if (!role || typeof role !== 'string' || role.trim() === '') {
      res.status(400);
      throw new Error('Employee role is required and must be a non-empty string.');
  }
  if (wagePerDay === undefined || isNaN(parseFloat(wagePerDay)) || parseFloat(wagePerDay) < 0) {
      res.status(400);
      throw new Error('Wage per day is required and must be a non-negative number.');
  }
  if (!startDate || isNaN(new Date(startDate).getTime())) {
      res.status(400);
      throw new Error('Employee start date is required and must be a valid date.');
  }
  if (endDate && isNaN(new Date(endDate).getTime())) {
      res.status(400);
      throw new Error('Employee end date must be a valid date if provided.');
  }
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      res.status(400);
      throw new Error('Employee start date cannot be after end date.');
  }

  const project = await Project.findById(projectId);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  const isAlreadyAssigned = project.employees.some(emp =>
    emp.name.toLowerCase() === name.toLowerCase() && emp.role.toLowerCase() === role.toLowerCase()
  );
  if (isAlreadyAssigned) {
    res.status(409);
    throw new Error(`An employee named "${name}" with role "${role}" is already assigned to this project.`);
  }

  project.employees.push({
    name: name.trim(),
    role: role.trim(),
    wagePerDay: parseFloat(wagePerDay),
    startDate: new Date(startDate),
    endDate: endDate ? new Date(endDate) : null
  });

  const updatedProject = await project.save();

  res.status(201).json({
    message: 'Employee added to project successfully',
    project: updatedProject
  });
});

// @desc    Remove employee from project
// @route   DELETE /api/projects/:id/employees/:employeeId
// @access  Private
const removeEmployeeFromProject = asyncHandler(async (req, res) => {
  const { id: projectId, employeeId } = req.params;
  validateObjectId(projectId, 'project ID');
  validateObjectId(employeeId, 'employee ID');

  const project = await Project.findById(projectId);
  if (!project) {
    res.status(404);
    throw new Error('Project not found.');
  }

  const initialLength = project.employees.length;
  project.employees.pull({ _id: employeeId });

  if (project.employees.length === initialLength) {
      res.status(404);
      throw new Error('Employee not found in this project.');
  }

  const updatedProject = await project.save();

  res.status(200).json({
    message: 'Employee removed from project successfully',
    project: updatedProject
  });
});

// @desc    Add activity to project
// @route   POST /api/projects/:id/activities
// @access  Private
const addActivityToProject = asyncHandler(async (req, res) => {
  const { id: projectId } = req.params;
  validateObjectId(projectId, 'project ID');

  const { name, description, startDate, endDate } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400);
      throw new Error('Activity name is required and must be a non-empty string.');
  }
  if (!startDate || isNaN(new Date(startDate).getTime())) {
      res.status(400);
      throw new Error('Activity start date is required and must be a valid date.');
  }
  if (!endDate || isNaN(new Date(endDate).getTime())) {
      res.status(400);
      throw new Error('Activity end date is required and must be a valid date.');
  }
  if (new Date(startDate) > new Date(endDate)) {
      res.status(400);
      throw new Error('Activity start date cannot be after end date.');
  }

  const project = await Project.findById(projectId);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  const newActivity = {
    name: name.trim(),
    description: description ? description.trim() : undefined,
    startDate: new Date(startDate),
    dueDate: new Date(endDate),
    status: 'pending'
  };

  project.activities.push(newActivity);
  await project.save();

  // Return just the new activity as the frontend expects
  res.status(201).json(newActivity);
});

// @desc    Update activity (status or other fields)
// @route   PATCH /api/projects/:id/activities/:activityId
// @access  Private
const updateActivity = asyncHandler(async (req, res) => { // Renamed from updateActivityStatus
  const { id: projectId, activityId } = req.params;
  validateObjectId(projectId, 'project ID');
  validateObjectId(activityId, 'activity ID');

  const { status, title, description, assignedTo, startDate, dueDate } = req.body;

  const project = await Project.findById(projectId);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  const activity = project.activities.id(activityId);
  if (!activity) {
    res.status(404);
    throw new Error('Activity not found in this project.');
  }

  if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
          res.status(400);
          throw new Error('Activity title must be a non-empty string.');
      }
      activity.title = title.trim();
  }
  if (description !== undefined) {
      activity.description = description ? description.trim() : undefined; // Set to undefined if empty string
  }
  if (startDate !== undefined) {
      if (isNaN(new Date(startDate).getTime())) {
          res.status(400);
          throw new Error('Invalid start date format.');
      }
      activity.startDate = new Date(startDate);
  }
  if (dueDate !== undefined) {
      if (isNaN(new Date(dueDate).getTime())) {
          res.status(400);
          throw new Error('Invalid due date format.');
      }
      activity.dueDate = new Date(dueDate);
  }
  if (activity.startDate && activity.dueDate && activity.startDate > activity.dueDate) {
      res.status(400);
      throw new Error('Activity start date cannot be after due date.');
  }

  if (assignedTo !== undefined) {
      if (assignedTo && !mongoose.Types.ObjectId.isValid(assignedTo)) {
          res.status(400);
          throw new Error('Invalid assigned user ID format.');
      }
      if (assignedTo) {
          const userExists = await User.findById(assignedTo);
          if (!userExists) {
              res.status(404);
              throw new Error('Assigned user not found.');
          }
      }
      activity.assignedTo = assignedTo || null;
  }

  if (status !== undefined) {
      const allowedStatuses = ['pending', 'in-progress', 'completed'];
      if (!allowedStatuses.includes(status)) {
          res.status(400);
          throw new Error(`Invalid status: "${status}". Allowed statuses are: ${allowedStatuses.join(', ')}`);
      }
      activity.status = status;
      if (status === 'completed' && !activity.completedAt) {
          activity.completedAt = new Date();
      } else if (status !== 'completed' && activity.completedAt) {
          activity.completedAt = undefined;
      }
  }

  const updatedProject = await project.save();

  res.status(200).json({
    message: 'Activity updated successfully',
    project: updatedProject
  });
});

// @desc    Upload document to project
// @route   POST /api/projects/:id/documents
// @access  Private
const uploadDocumentToProject = asyncHandler(async (req, res) => {
  const { id: projectId } = req.params;
  validateObjectId(projectId, 'project ID');

  const file = req.file;

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
  const { id: projectId, documentId } = req.params; // Use 'id' for consistency
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

// Define routes
router.post('/', createProject);
router.get('/', getProjects);
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.post('/:id/employees', addEmployeeToProject);
router.post('/:id/activities', addActivityToProject);
router.delete('/:id/employees/:employeeId', removeEmployeeFromProject);
router.patch('/:id/activities/:activityId', updateActivity);
router.post('/:id/documents', upload.single('document'), uploadDocumentToProject);
router.delete('/:id/documents/:documentId', deleteDocumentFromProject);
router.delete('/:id', deleteProject);

export default router;