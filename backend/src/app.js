const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// health check
app.get("/", (req, res) => {
  res.json({ message: "AI Resume Analyzer Backend is running" });
});

// 👉 CONNECT ROUTE HERE
const resumeRoutes = require("./routes/resume.routes");
app.use("/api/resumes", resumeRoutes);

module.exports = app;
