import express from "express";
import { createQuotation, getQuotations } from "../controllers/quotation.controller.js";

const router = express.Router();

router.post("/", createQuotation);
router.get("/", getQuotations);

export default router;
