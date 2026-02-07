const express = require("express");
const cors = require("cors");
require("dotenv").config();

const resumeRoutes = require("./routes/resume.routes");

const app = express();

/* ✅ CORS FIX for Vercel + Localhost */
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "https://ai-resume-analyzer-three-sigma.vercel.app",
    "https://ai-resume-analyzer-2isxybazd-sumits-projects-c8bb3a02.vercel.app",
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // ✅ IMPORTANT for preflight
app.use(express.json());

/* ✅ Health routes */
app.get("/", (req, res) => {
  res.send("AI Resume Analyzer Backend is running 🚀");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* ✅ Main routes */
app.use("/api/resumes", resumeRoutes);

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
