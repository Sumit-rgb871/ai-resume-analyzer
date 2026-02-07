const express = require("express");
const cors = require("cors");
require("dotenv").config();

const resumeRoutes = require("./routes/resume.routes");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Health route
app.get("/", (req, res) => {
  res.send("AI Resume Analyzer Backend is running 🚀");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/resumes", resumeRoutes);

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
