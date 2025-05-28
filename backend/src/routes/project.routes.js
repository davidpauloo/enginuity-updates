// backend/src/routes/project.routes.js (CLEANED UP)
import express from 'express';
import Project from '../models/project.model.js';
import mongoose from 'mongoose';

const router = express.Router();

// This is the route for fetching all projects - it MUST be present.
router.get('/', async (req, res) => {
    try {
        console.log("----- HIT: GET /api/projects route -----"); // Add this console log for debugging
        const projects = await Project.find({});
        console.log("Projects found:", projects.length); // Add this console log
        return res.status(200).json(projects);
    } catch (err) {
        console.error('ERROR in GET /api/projects route:', err);
        return res.status(500).json({ message: 'Server error fetching all projects', error: err.message });
    }
});

// GET a single project by ID
router.get('/:projectId', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.projectId)) {
            return res.status(400).json({ message: 'Invalid Project ID format' });
        }
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        res.status(200).json(project);
    } catch (err) {
        console.error('Error fetching project:', err);
        res.status(500).json({ message: 'Server error fetching project details', error: err.message });
    }
});

// POST to create a new project
router.post('/', async (req, res) => {
    try {
        console.log("----- HIT: POST /api/projects route (Create Project) -----"); // Debugging log
        const {
            clientName,
            location,
            description,
            startDate,
            targetDeadline,
            // If you have fields like 'documents' or 'employees' directly in the initial form,
            // ensure they are handled (e.g., initialized as empty arrays or validated).
            // For file uploads, you'll need multer middleware, which is not integrated here.
        } = req.body;

        // Basic validation (add more as needed based on your Project model schema)
        if (!clientName || !location || !startDate || !targetDeadline) {
            return res.status(400).json({ message: 'Client name, location, start date, and target deadline are required for a new project.' });
        }

        // Validate dates
        const parsedStartDate = new Date(startDate);
        const parsedTargetDeadline = new Date(targetDeadline);

        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedTargetDeadline.getTime())) {
            return res.status(400).json({ message: 'Invalid date format for start date or target deadline.' });
        }
        if (parsedStartDate > parsedTargetDeadline) {
            return res.status(400).json({ message: 'Start date cannot be after target deadline.' });
        }

        const newProject = new Project({
            clientName,
            location,
            description,
            startDate: parsedStartDate,
            targetDeadline: parsedTargetDeadline,
            progress: 0, // Default for new projects
            documents: [], // Initialize as empty array
            employees: [], // Initialize as empty array
            activities: [], // Initialize as empty array
            status: 'pending', // Default status for a new project
        });

        const savedProject = await newProject.save();
        console.log("New project created successfully:", savedProject._id); // Debugging log
        res.status(201).json(savedProject); // 201 Created
    } catch (err) {
        console.error('Error creating new project:', err);
        // Handle Mongoose validation errors specifically
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', '), error: err.message });
        }
        res.status(500).json({ message: 'Server error creating project', error: err.message });
    }
});


// POST to add a new employee to a project
router.post('/:projectId/employees', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.projectId)) {
            return res.status(400).json({ message: 'Invalid Project ID format' });
        }

        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const { name, role, wagePerDay, startDate, dueDate } = req.body;

        if (!name || !role || !wagePerDay || !startDate) {
            return res.status(400).json({ message: 'Employee name, role, wage per day, and start date are required.' });
        }
        if (isNaN(parseFloat(wagePerDay)) || parseFloat(wagePerDay) < 0) {
            return res.status(400).json({ message: 'Wage per day must be a non-negative number.' });
        }
        if (isNaN(new Date(startDate).getTime())) {
            return res.status(400).json({ message: 'Invalid employee start date format.' });
        }
        if (dueDate && isNaN(new Date(dueDate).getTime())) {
            return res.status(400).json({ message: 'Invalid employee end date format.' });
        }
        if (dueDate && new Date(startDate) > new Date(dueDate)) {
            return res.status(400).json({ message: 'Employee start date cannot be after end date.' });
        }

        const newEmployee = {
            name,
            role,
            wagePerDay: parseFloat(wagePerDay),
            startDate: new Date(startDate),
            dueDate: dueDate ? new Date(dueDate) : null,
        };

        project.employees.push(newEmployee);
        await project.save();

        res.status(201).json(project);
    } catch (err) {
        console.error('Error adding employee to project:', err);
        res.status(500).json({ message: 'Server error adding employee', error: err.message });
    }
});

// DELETE an employee from a project
router.delete('/:projectId/employees/:employeeId', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.projectId) || !mongoose.isValidObjectId(req.params.employeeId)) {
            return res.status(400).json({ message: 'Invalid ID format for project or employee.' });
        }

        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        const initialEmployeeCount = project.employees.length;
        project.employees = project.employees.filter(emp => emp._id.toString() !== req.params.employeeId);

        if (project.employees.length === initialEmployeeCount) {
            return res.status(404).json({ message: 'Employee not found in this project.' });
        }

        await project.save();
        res.status(200).json(project);
    } catch (err) {
        console.error('Error removing employee:', err);
        res.status(500).json({ message: 'Server error removing employee', error: err.message });
    }
});

// POST to add a new activity to a project
router.post('/:projectId/activities', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.projectId)) {
            return res.status(400).json({ message: 'Invalid Project ID format' });
        }

        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const { name, description, startDate, dueDate, status = 'pending' } = req.body;

        if (!name || !startDate || !dueDate) {
            return res.status(400).json({ message: 'Activity name, start date, and target end date are required.' });
        }
        if (isNaN(new Date(startDate).getTime()) || isNaN(new Date(dueDate).getTime())) {
            return res.status(400).json({ message: 'Invalid date format for activity start or end date.' });
        }
        if (new Date(startDate) > new Date(dueDate)) {
            return res.status(400).json({ message: 'Activity start date cannot be after target end date.' });
        }
        if (!['pending', 'completed'].includes(status)) {
            return res.status(400).json({ message: 'Invalid activity status.' });
        }

        const newActivity = {
            name,
            description,
            startDate: new Date(startDate),
            dueDate: new Date(dueDate),
            status
        };

        project.activities.push(newActivity);
        await project.save();

        res.status(201).json(project);
    } catch (err) {
        console.error('Error adding activity to project:', err);
        res.status(500).json({ message: 'Server error adding activity', error: err.message });
    }
});

// PATCH to update an activity status
router.patch('/:projectId/activities/:activityId', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.projectId) || !mongoose.isValidObjectId(req.params.activityId)) {
            return res.status(400).json({ message: 'Invalid ID format for project or activity.' });
        }

        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        const activity = project.activities.id(req.params.activityId);
        if (!activity) {
            return res.status(404).json({ message: 'Activity not found in this project.' });
        }

        const { status } = req.body;

        if (!status || !['pending', 'completed'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status provided. Must be "pending" or "completed".' });
        }

        activity.status = status;
        if (status === 'completed' && !activity.completedAt) {
            activity.completedAt = new Date();
        } else if (status === 'pending') {
            activity.completedAt = undefined;
        }

        await project.save();

        res.status(200).json(project);
    } catch (err) {
        console.error('Error updating activity status:', err);
        res.status(500).json({ message: 'Server error updating activity status', error: err.message });
    }
});

// DELETE a document from a project
router.delete('/:projectId/documents/:documentId', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.projectId) || !mongoose.isValidObjectId(req.params.documentId)) {
            return res.status(400).json({ message: 'Invalid ID format for project or document.' });
        }
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        const initialDocumentCount = project.documents.length;
        project.documents = project.documents.filter(doc => doc._id.toString() !== req.params.documentId);

        if (project.documents.length === initialDocumentCount) {
            return res.status(404).json({ message: 'Document not found in this project.' });
        }

        await project.save();
        res.status(200).json({ message: 'Document deleted successfully', project });
    } catch (err) {
        console.error('Error deleting document:', err);
        res.status(500).json({ message: 'Server error deleting document', error: err.message });
    }
});

export default router;