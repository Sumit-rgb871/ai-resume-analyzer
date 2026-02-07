const express = require("express");
const router = express.Router();

const upload = require("../middlewares/upload");

const {
  createResume,
  getResumes,
} = require("../controllers/resume.controller");

// ✅ Upload PDF + analyze
router.post("/", upload.single("resume"), createResume);

// Fetch all resumes
router.get("/", getResumes);

module.exports = router;
