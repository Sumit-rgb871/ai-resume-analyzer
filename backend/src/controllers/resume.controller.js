const pool = require("../config/db");
const { analyzeWithAI } = require("../services/ai.service");
const { HfInference } = require("@huggingface/inference");

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
 */
exports.createResume = async (req, res) => {
  const { name, email, skills, experience, jobDescription } = req.body;

  if (!name || !email || !skills || experience === undefined) {
    return res.status(400).json({
      error: "Name, email, skills and experience are required",
    });
  }

  try {
    /* ---------- Resume text ---------- */
    const resumeText = `
      Name: ${name}
      Skills: ${skills}
      Experience: ${experience} years
    `;

    /* ---------- AI Sentiment Analysis ---------- */
    const aiResult = await analyzeWithAI(resumeText);

    /* ---------- SAFE SCORE CALCULATION ---------- */
    let score = 50;
    if (Array.isArray(aiResult) && aiResult[0]?.score) {
      score = Math.round(aiResult[0].score * 100);
    }
    score = Math.min(score, 100);

    /* ---------- JOB MATCHING (OPTIONAL) ---------- */
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

    /* ---------- AI FEEDBACK & SUGGESTIONS ---------- */
    const feedback = [];

    // Score-based feedback
    if (score >= 80) {
      feedback.push("Strong overall resume quality.");
    } else if (score >= 60) {
      feedback.push("Good resume, but there is room for improvement.");
    } else {
      feedback.push("Resume needs improvement in clarity and structure.");
    }

    // Skills feedback
    if (skills.split(",").length < 3) {
      feedback.push("Consider adding more relevant technical skills.");
    } else {
      feedback.push("Skills section looks well populated.");
    }

    // Experience feedback
    if (experience < 2) {
      feedback.push("Consider adding more project or internship experience.");
    }

    // Job match feedback
    if (jobMatch) {
      if (jobMatch.matchScore >= 75) {
        feedback.push("Resume aligns well with the job description.");
      } else {
        feedback.push(
          "Try tailoring your resume more closely to the job description."
        );
      }
    }

    /* ---------- SAVE TO DB ---------- */
    const result = await pool.query(
      `INSERT INTO resumes 
        (name, email, skills, experience, score, ai_result)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name,
        email,
        skills,
        experience,
        score,
        JSON.stringify(aiResult),
      ]
    );

    /* ---------- RESPONSE ---------- */
    res.status(201).json({
      message: "Resume analyzed successfully",
      data: result.rows[0],
      ai: aiResult,
      jobMatch,
      feedback, // ✅ NEW
    });
  } catch (error) {
    console.error("AI / DB error:", error);
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
