const axios = require("axios");

const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODEL = "facebook/bart-large-mnli";

async function analyzeWithAI(resumeText) {
  const response = await axios.post(
    `https://api-inference.huggingface.co/models/${HF_MODEL}`,
    {
      inputs: resumeText,
      parameters: {
        candidate_labels: [
          "JavaScript",
          "React",
          "Node.js",
          "SQL",
          "Java",
          "Python",
          "Backend Developer",
          "Frontend Developer",
          "Full Stack Developer",
        ],
      },
    },
    {
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
      },
    }
  );

  return response.data;
}

module.exports = { analyzeWithAI };
