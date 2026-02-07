const express = require("express");
const router = express.Router();

const {
  createResume,
  getResumes,
} = require("../controllers/resume.controller");

/**
 * POST /api/resumes
 * Create + analyze resume
 */
router.post("/", createResume);

/**
 * GET /api/resumes
 * Fetch all resumes
 */
router.get("/", getResumes);

module.exports = router;
