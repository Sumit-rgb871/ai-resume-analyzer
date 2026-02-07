const pool = require("../config/db");
const pdfParse = require("pdf-parse");
const { analyzeWithAI } = require("../services/ai.service");
const { HfInference } = require("@huggingface/inference");

const hf = new HfInference(process.env.HF_API_KEY);

/* ---------- Utility: cosine similarity ---------- */
function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));

  if (magA === 0 || magB === 0) return 0;

  return dot / (magA * magB);
}

/**
 * POST /api/resumes
 * PDF Upload + AI Analysis
 */
exports.createResume = async (req, res) => {
  try {
    const { name, email, experience, jobDescription } = req.body;

    // ✅ Basic validation
    if (!name || !email || experience === undefined) {
      return res.status(400).json({
        error: "Name, email and experience are required",
      });
    }

    // ✅ PDF required
    if (!req.file) {
      return res.status(400).json({
        error: "Resume PDF file is required",
      });
    }

    // ✅ Debug: check HF key
    console.log("HF key present:", !!process.env.HF_API_KEY);

    // ✅ Extract PDF text
    const pdfData = await pdfParse(req.file.buffer);
    let resumeText = pdfData.text || "";

    // ✅ Prevent huge text from crashing HF
    resumeText = resumeText.replace(/\s+/g, " ").trim(); // clean spaces
    const trimmedResumeText = resumeText.substring(0, 2000); // IMPORTANT

    if (!trimmedResumeText || trimmedResumeText.length < 30) {
      return res.status(400).json({
        error: "Could not extract readable text from PDF",
      });
    }

    /* ---------- AI Sentiment Analysis ---------- */
    let aiResult = null;

    try {
      aiResult = await analyzeWithAI(trimmedResumeText);
    } catch (err) {
      console.error("Sentiment AI failed:", err?.message || err);
      aiResult = null;
    }

    /* ---------- SCORE CALCULATION ---------- */
    let score = 50;

    if (Array.isArray(aiResult) && aiResult[0]?.score) {
      score = Math.round(aiResult[0].score * 100);
    }

    score = Math.min(score, 100);

    /* ---------- JOB MATCHING (OPTIONAL + SAFE) ---------- */
    let jobMatch = null;

    // ⚠️ This is unstable sometimes on free HF
    if (jobDescription && jobDescription.trim().length > 0) {
      try {
        const resumeEmbedding = await hf.featureExtraction({
          model: "sentence-transformers/all-MiniLM-L6-v2",
          inputs: trimmedResumeText.substring(0, 1000), // even smaller for embeddings
        });

        const jobEmbedding = await hf.featureExtraction({
          model: "sentence-transformers/all-MiniLM-L6-v2",
          inputs: jobDescription.substring(0, 1000),
        });

        const similarity = cosineSimilarity(resumeEmbedding, jobEmbedding);

        jobMatch = {
          matchScore: Math.round(similarity * 100),
        };
      } catch (err) {
        console.error("Job matching failed:", err?.message || err);
        jobMatch = null; // do not crash
      }
    }

    /* ---------- FEEDBACK ---------- */
    const feedback = [];

    if (score >= 80) feedback.push("Strong overall resume quality.");
    else if (score >= 60) feedback.push("Good resume, but can be improved.");
    else feedback.push("Resume needs improvement in structure and clarity.");

    if (Number(experience) < 2) {
      feedback.push("Consider adding more projects or internship experience.");
    }

    if (jobMatch) {
      if (jobMatch.matchScore >= 75) {
        feedback.push("Resume matches well with the job description.");
      } else {
        feedback.push("Tailor your resume more closely to the job role.");
      }
    }

    /* ---------- SAVE TO DB ---------- */
    const result = await pool.query(
      `INSERT INTO resumes (name, email, skills, experience, score, ai_result)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name,
        email,
        trimmedResumeText.substring(0, 500), // store first 500 chars
        Number(experience),
        score,
        aiResult ? JSON.stringify(aiResult) : null,
      ]
    );

    /* ---------- RESPONSE ---------- */
    return res.status(201).json({
      message: "Resume analyzed successfully",
      data: result.rows[0],
      ai: aiResult,
      jobMatch,
      feedback,
    });
  } catch (error) {
    // ✅ This will show the REAL issue in Render logs
    console.error("PDF/AI error FULL:", error);
    console.error("PDF/AI error message:", error.message);
    console.error("PDF/AI error response:", error.response?.data);

    return res.status(500).json({
      error: "AI analysis failed",
      details: error.message,
    });
  }
};

/**
 * GET /api/resumes
 */
exports.getResumes = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM resumes ORDER BY created_at DESC"
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch resumes" });
  }
};
