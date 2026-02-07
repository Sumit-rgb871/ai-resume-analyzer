const pool = require("../config/db");
const pdfParse = require("pdf-parse");
const { analyzeWithAI } = require("../services/ai.service");
const { HfInference } = require("@huggingface/inference");

const hf = new HfInference(process.env.HF_API_KEY);

function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

/**
 * POST /api/resumes
 */
exports.createResume = async (req, res) => {
  try {
    const { name, email, experience, jobDescription } = req.body;

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

    // ✅ Extract PDF text
    const pdfData = await pdfParse(req.file.buffer);
    const resumeText = pdfData.text;

    if (!resumeText || resumeText.trim().length < 30) {
      return res.status(400).json({
        error: "Could not extract text from PDF",
      });
    }

    // ✅ AI Sentiment
    const aiResult = await analyzeWithAI(resumeText);

    // ✅ Score
    let score = 50;
    if (Array.isArray(aiResult) && aiResult[0]?.score) {
      score = Math.round(aiResult[0].score * 100);
    }
    score = Math.min(score, 100);

    // ✅ Job matching
    let jobMatch = null;
    if (jobDescription && jobDescription.trim().length > 0) {
      const resumeEmbedding = await hf.featureExtraction({
        model: "sentence-transformers/all-MiniLM-L6-v2",
        inputs: resumeText,
      });

      const jobEmbedding = await hf.featureExtraction({
        model: "sentence-transformers/all-MiniLM-L6-v2",
        inputs: jobDescription,
      });

      const similarity = cosineSimilarity(resumeEmbedding, jobEmbedding);

      jobMatch = {
        matchScore: Math.round(similarity * 100),
      };
    }

    // ✅ Feedback
    const feedback = [];

    if (score >= 80) feedback.push("Strong overall resume quality.");
    else if (score >= 60) feedback.push("Good resume, but can be improved.");
    else feedback.push("Resume needs improvement in structure and clarity.");

    if (experience < 2)
      feedback.push("Consider adding more projects or internship experience.");

    if (jobMatch) {
      if (jobMatch.matchScore >= 75)
        feedback.push("Resume matches well with the job description.");
      else feedback.push("Tailor your resume more closely to the job role.");
    }

    // ✅ Save to DB
    const result = await pool.query(
      `INSERT INTO resumes (name, email, skills, experience, score, ai_result)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name,
        email,
        resumeText.substring(0, 500), // store first 500 chars as "skills"
        Number(experience),
        score,
        JSON.stringify(aiResult),
      ]
    );

    res.status(201).json({
      message: "Resume analyzed successfully",
      data: result.rows[0],
      ai: aiResult,
      jobMatch,
      feedback,
    });
  } catch (error) {
    console.error("PDF/AI error:", error);
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
