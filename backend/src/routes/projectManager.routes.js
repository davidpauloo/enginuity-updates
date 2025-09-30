import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
// Match the actual filename and include .js
import {
  getPmAssignments,
  getPmAssignmentsIncludingExtras,
} from "../controllers/projectManager.controller.js"; 
const router = express.Router();

router.get("/assignments", protectRoute, getPmAssignments);
router.get("/assignments/all", protectRoute, getPmAssignmentsIncludingExtras);

export default router;
