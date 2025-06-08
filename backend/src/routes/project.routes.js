// backend/src/routes/project.routes.js
import express from 'express';
import Project from '../models/project.model.js';
import mongoose from 'mongoose';
// IMPORTS MODIFIED:
// 'upload' (for documents) is now the default export from upload.js
import upload from '../middleware/upload.js';
// 'uploadCoverPhoto' is a named export from upload.js
import { uploadCoverPhoto } from '../middleware/upload.js';
import { v2 as cloudinary } from 'cloudinary'; // Import Cloudinary to delete files
import multer from 'multer'; // Import multer to catch MulterError for image upload

const router = express.Router();

// This is the route for fetching all projects
router.get('/', async (req, res) => {
    try {
        console.log("----- HIT: GET /api/projects route -----");
        const projects = await Project.find({});
        console.log("Projects found:", projects.length);
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
        console.log("----- HIT: POST /api/projects route (Create Project) -----");
        const {
            clientName,
            location,
            description,
            startDate,
            targetDeadline,
        } = req.body;

        if (!clientName || !location || !startDate || !targetDeadline) {
            return res.status(400).json({ message: 'Client name, location, start date, and target deadline are required for a new project.' });
        }

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
            progress: 0,
            documents: [],
            employees: [],
            activities: [],
            status: 'pending',
            // imageUrl will be empty by default or updated later
        });

        const savedProject = await newProject.save();
        console.log("New project created successfully:", savedProject._id);
        res.status(201).json(savedProject);
    } catch (err) {
        console.error('Error creating new project:', err);
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
        console.log("----- HIT: PATCH /api/projects/:projectId/activities/:activityId route -----");
        console.log("Request Params:", req.params);
        console.log("Request Body:", req.body);

        if (!mongoose.isValidObjectId(req.params.projectId) || !mongoose.isValidObjectId(req.params.activityId)) {
            console.log("Validation failed: Invalid ID format.");
            return res.status(400).json({ message: 'Invalid ID format for project or activity.' });
        }

        const project = await Project.findById(req.params.projectId);
        if (!project) {
            console.log("Project not found for ID:", req.params.projectId);
            return res.status(404).json({ message: 'Project not found.' });
        }
        console.log("Project found (clientName):", project.clientName);

        const activity = project.activities.id(req.params.activityId);
        if (!activity) {
            console.log("Activity not found within project for ID:", req.params.activityId);
            return res.status(404).json({ message: 'Activity not found in this project.' });
        }
        console.log("Activity found (name):", activity.name);

        const { status } = req.body;

        if (!status || !['pending', 'completed'].includes(status)) {
            console.log("Validation failed: Invalid status provided.");
            return res.status(400).json({ message: 'Invalid status provided. Must be "pending" or "completed".' });
        }
        console.log("Updating activity status to:", status);

        activity.status = status;
        if (status === 'completed' && !activity.completedAt) {
            activity.completedAt = new Date();
            console.log("Activity marked as completed at:", activity.completedAt);
        } else if (status === 'pending') {
            activity.completedAt = undefined;
            console.log("Activity set back to pending, completedAt cleared.");
        }

        await project.save();
        console.log("Project saved successfully after activity update.");

        res.status(200).json(project);
    } catch (err) {
        console.error('CRITICAL ERROR in PATCH /api/projects/:projectId/activities/:activityId:', err);
        if (err instanceof multer.MulterError) {
             return res.status(400).json({ message: `Multer error during activity update: ${err.message}` });
        }
        res.status(500).json({ message: 'Server error updating activity status', error: err.message, stack: err.stack });
    }
});


// POST to upload a new document to a project
// Make sure the 'name' attribute of your file input is 'document' in the frontend
router.post('/:projectId/documents', upload.single('document'), async (req, res) => {
    try {
        console.log("----- HIT: POST /api/projects/:projectId/documents route (Upload Document) -----");
        console.log("Request Params:", req.params);
        console.log("Uploaded File (req.file):", req.file); // Log the file details from Cloudinary

        if (!mongoose.isValidObjectId(req.params.projectId)) {
            return res.status(400).json({ message: 'Invalid Project ID format' });
        }

        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded or file type not allowed.' });
        }

        const documentUrl = req.file.path; // Cloudinary stores the secure URL in req.file.path

        const newDocument = {
            name: req.file.originalname,
            url: documentUrl,
        };

        project.documents.push(newDocument);
        await project.save();

        console.log("Document uploaded to Cloudinary and saved to DB:", newDocument);
        res.status(201).json({ message: 'Document uploaded successfully', document: newDocument, project });
    } catch (err) {
        console.error('CRITICAL ERROR uploading document:', err);
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `File upload error: ${err.message}` });
        }
        res.status(500).json({ message: 'Server error uploading document', error: err.message, stack: err.stack });
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
        const documentToDelete = project.documents.find(doc => doc._id.toString() === req.params.documentId);

        project.documents = project.documents.filter(doc => doc._id.toString() !== req.params.documentId);

        if (project.documents.length === initialDocumentCount) {
            return res.status(404).json({ message: 'Document not found in this project.' });
        }

        await project.save();

        // **IMPORTANT:** Delete the actual file from Cloudinary
        if (documentToDelete && documentToDelete.url) {
            try {
                const urlParts = documentToDelete.url.split('/');
                const filenameWithExtension = urlParts[urlParts.length - 1];
                const filenameWithoutExtension = filenameWithExtension.split('.')[0];
                const publicId = `project_documents/${filenameWithoutExtension}`; // Match the folder in upload.js for documents

                await cloudinary.uploader.destroy(publicId);
                console.log('File deleted from Cloudinary:', publicId);
            } catch (cloudinaryErr) {
                console.error('Error deleting file from Cloudinary:', cloudinaryErr);
            }
        }

        res.status(200).json({ message: 'Document deleted successfully', project });
    } catch (err) {
        console.error('Error deleting document:', err);
        res.status(500).json({ message: 'Server error deleting document', error: err.message });
    }
});


// NEW: PATCH route to update a project's cover photo (imageUrl)
// 'coverPhoto' here must match the 'name' attribute of your file input in the frontend form
router.patch('/:projectId/imageUrl', uploadCoverPhoto.single('coverPhoto'), async (req, res) => {
    try {
        console.log("----- HIT: PATCH /api/projects/:projectId/imageUrl route (Update Cover Photo) -----");
        console.log("Request Params:", req.params);
        console.log("Uploaded File (req.file):", req.file); // Contains Cloudinary details

        if (!mongoose.isValidObjectId(req.params.projectId)) {
            return res.status(400).json({ message: 'Invalid Project ID format' });
        }

        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No cover photo uploaded or file type not allowed.' });
        }

        const newImageUrl = req.file.path; // Cloudinary stores the secure URL in req.file.path

        // --- Optional: Delete old image from Cloudinary if it exists ---
        if (project.imageUrl) {
            try {
                const urlParts = project.imageUrl.split('/');
                const filenameWithExtension = urlParts[urlParts.length - 1];
                const filenameWithoutExtension = filenameWithExtension.split('.')[0];
                const folder = 'project_covers'; // IMPORTANT: This MUST match the folder in upload.js for cover photos
                const publicId = `${folder}/${filenameWithoutExtension}`;

                console.log(`Attempting to delete old Cloudinary image: ${publicId}`);
                await cloudinary.uploader.destroy(publicId);
                console.log('Old cover photo deleted from Cloudinary:', publicId);
            } catch (cloudinaryErr) {
                console.warn('Could not delete old cover photo from Cloudinary (might not exist or error):', cloudinaryErr);
            }
        }
        // -------------------------------------------------------------

        project.imageUrl = newImageUrl; // Update the project's imageUrl field
        await project.save();

        console.log("Project cover photo updated successfully:", newImageUrl);
        res.status(200).json({
            message: 'Cover photo updated successfully',
            imageUrl: newImageUrl,
            project // Send back the updated project object
        });

    } catch (err) {
        console.error('CRITICAL ERROR updating cover photo:', err);
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `File upload error: ${err.message}` });
        }
        res.status(500).json({ message: 'Server error updating cover photo', error: err.message, stack: err.stack });
    }
});

// Route to view a document (inline)
router.get('/:projectId/documents/:documentId/view', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.projectId) || !mongoose.isValidObjectId(req.params.documentId)) {
            return res.status(400).json({ message: 'Invalid ID format for project or document.' });
        }

        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        const document = project.documents.find(doc => doc._id.toString() === req.params.documentId);
        if (!document) {
            return res.status(404).json({ message: 'Document not found in this project.' });
        }

        // For viewing, we'll use Cloudinary's inline transformation
        // This will force the browser to display the file instead of downloading it
        const cloudinaryUrl = document.url.replace('/upload/', '/upload/fl_force_strip,fl_attachment:inline/');
        
        // Set appropriate headers for viewing
        res.setHeader('Content-Type', getContentType(document.name));
        res.setHeader('Content-Disposition', 'inline');
        res.redirect(cloudinaryUrl);
    } catch (err) {
        console.error('Error viewing document:', err);
        res.status(500).json({ message: 'Server error viewing document', error: err.message });
    }
});

// Route to download a document
router.get('/:projectId/documents/:documentId/download', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.projectId) || !mongoose.isValidObjectId(req.params.documentId)) {
            return res.status(400).json({ message: 'Invalid ID format for project or document.' });
        }

        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        const document = project.documents.find(doc => doc._id.toString() === req.params.documentId);
        if (!document) {
            return res.status(404).json({ message: 'Document not found in this project.' });
        }

        // For downloading, we'll use Cloudinary's attachment transformation
        const cloudinaryUrl = document.url.replace('/upload/', '/upload/fl_force_strip,fl_attachment:attachment/');
        
        // Set appropriate headers for downloading
        res.setHeader('Content-Type', getContentType(document.name));
        res.setHeader('Content-Disposition', `attachment; filename="${document.name}"`);
        res.redirect(cloudinaryUrl);
    } catch (err) {
        console.error('Error downloading document:', err);
        res.status(500).json({ message: 'Server error downloading document', error: err.message });
    }
});

// Helper function to determine content type based on file extension
function getContentType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const contentTypes = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'txt': 'text/plain'
    };
    return contentTypes[ext] || 'application/octet-stream';
}

export default router;