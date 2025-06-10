import express from 'express';
import multer from 'multer';
import { analyzeWithCloudConvert } from '../controllers/cloudConvert.controller.js';

const router = express.Router();

const upload = multer({ dest: 'uploads/' });

router.post('/analyze', upload.single('file'), analyzeWithCloudConvert);

export default router;