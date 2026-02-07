const express = require("express");
const router = express.Router();
const multer = require("multer");

const { createResume, getResumes } = require("../controllers/resume.controller");

// store file in memory (not in disk)
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * POST /api/resumes
 * Upload PDF + analyze
 */
router.post("/", upload.single("resume"), createResume);

/**
 * GET /api/resumes
 * Fetch all resumes
 */
router.get("/", getResumes);

module.exports = router;
