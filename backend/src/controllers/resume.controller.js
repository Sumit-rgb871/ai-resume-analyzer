const pool = require("../config/db");
const { analyzeWithAI } = require("../services/ai.service");
const { HfInference } = require("@huggingface/inference");
const pdfParse = require("pdf-parse");

const hf = new HfInference(process.env.HF_API_KEY);

/* ---------- Utility: cosine similarity ---------- */
function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

/**
 * POST /api/resumes
 * Upload PDF + Analyze
 */
exports.createResume = async (req, res) => {
  const { name, email, experience, jobDescription } = req.body;

  // NOTE: skills is optional now (because PDF will contain it)
  const skills = req.body.skills || "";

  if (!name || !email || experience === undefined) {
    return res.status(400).json({
      error: "Name, email and experience are required",
    });
  }

  try {
    /* ---------- 1) Extract resume text ---------- */
    let resumeText = "";

    // ✅ If PDF uploaded
    if (req.file) {
      const pdfData = await pdfParse(req.file.buffer);
      resumeText = pdfData.text;
    } else {
      // fallback: manual text mode
      resumeText = `
        Name: ${name}
        Skills: ${skills}
        Experience: ${experience} years
      `;
    }

    // safety check
    if (!resumeText || resumeText.trim().length < 30) {
      return res.status(400).json({
        error: "Resume text is too small. Please upload a valid PDF.",
      });
    }

    /* ---------- 2) AI Sentiment Analysis ---------- */
    const aiResult = await analyzeWithAI(resumeText);

    /* ---------- 3) Score calculation ---------- */
    let score = 50;
    if (Array.isArray(aiResult) && aiResult[0]?.score) {
      score = Math.round(aiResult[0].score * 100);
    }
    score = Math.min(score, 100);

    /* ---------- 4) Job matching (optional) ---------- */
    let jobMatch = null;

    if (jobDescription && jobDescription.trim().length > 0) {
      const resumeEmbedding = await hf.featureExtraction({
        model: "sentence-transformers/all-MiniLM-L6-v2",
        inputs: resumeText.substring(0, 2000), // ✅ limit length (important)
      });

      const jobEmbedding = await hf.featureExtraction({
        model: "sentence-transformers/all-MiniLM-L6-v2",
        inputs: jobDescription.substring(0, 2000),
      });

      const similarity = cosineSimilarity(resumeEmbedding, jobEmbedding);

      jobMatch = {
        matchScore: Math.round(similarity * 100),
      };
    }

    /* ---------- 5) Feedback ---------- */
    const feedback = [];

    if (score >= 80) {
      feedback.push("Strong overall resume quality.");
    } else if (score >= 60) {
      feedback.push("Good resume, but there is room for improvement.");
    } else {
      feedback.push("Resume needs improvement in clarity and structure.");
    }

    // skills feedback (if manual input used)
    if (skills && skills.split(",").length < 3) {
      feedback.push("Consider adding more relevant technical skills.");
    }

    if (Number(experience) < 2) {
      feedback.push("Consider adding more project or internship experience.");
    }

    if (jobMatch) {
      if (jobMatch.matchScore >= 75) {
        feedback.push("Resume aligns well with the job description.");
      } else {
        feedback.push("Try tailoring your resume more closely to the job description.");
      }
    }

    /* ---------- 6) SAVE TO DB ---------- */
    // ✅ IMPORTANT: You should add a column resume_text in DB
    // If you don’t have it yet, remove resume_text from query.

    const result = await pool.query(
      `INSERT INTO resumes 
        (name, email, skills, experience, score, ai_result, resume_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name,
        email,
        skills,
        experience,
        score,
        JSON.stringify(aiResult),
        resumeText,
      ]
    );

    /* ---------- 7) RESPONSE ---------- */
    res.status(201).json({
      message: "Resume analyzed successfully",
      data: result.rows[0],
      ai: aiResult,
      jobMatch,
      feedback,
    });
  } catch (error) {
    console.error("AI / PDF / DB error:", error);
    res.status(500).json({ error: "AI analysis failed" });
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
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch resumes" });
  }
};
