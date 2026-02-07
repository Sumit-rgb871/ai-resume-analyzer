import { useState } from "react";

// ✅ Backend URL (Render)
const API_BASE_URL =
  process.env.REACT_APP_BACKEND_URL ||
  "https://ai-resume-analyzer-backend-5xg8.onrender.com";

function ResumeForm({ onResumeAdded }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    experience: "",
    jobDescription: "",
  });

  const [resumeFile, setResumeFile] = useState(null);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleFileChange = (e) => {
    setResumeFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      // ✅ MUST use FormData for PDF upload
      const payload = new FormData();
      payload.append("name", formData.name);
      payload.append("email", formData.email);
      payload.append("experience", formData.experience);
      payload.append("jobDescription", formData.jobDescription);

      // ✅ PDF must be attached with same key as multer: upload.single("resume")
      if (resumeFile) {
        payload.append("resume", resumeFile);
      }

      const response = await fetch(`${API_BASE_URL}/api/resumes`, {
        method: "POST",
        body: payload, // ❌ no JSON.stringify
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit resume");
      }

      setResult(data);

      if (onResumeAdded) onResumeAdded();

      // reset
      setFormData({
        name: "",
        email: "",
        experience: "",
        jobDescription: "",
      });
      setResumeFile(null);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* FORM CARD */}
      <div style={styles.card}>
        <h1 style={styles.title}>AI Resume Analyzer</h1>
        <p style={styles.subtitle}>
          Upload resume PDF + get score, feedback & job match
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <input
            style={styles.input}
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <input
            style={styles.input}
            type="number"
            name="experience"
            placeholder="Experience (years)"
            value={formData.experience}
            onChange={handleChange}
            required
          />

          {/* ✅ PDF Upload */}
          <input
            style={styles.input}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            required
          />

          <textarea
            style={styles.textarea}
            name="jobDescription"
            placeholder="Paste Job Description (optional)"
            value={formData.jobDescription}
            onChange={handleChange}
          />

          <button style={styles.button} disabled={loading}>
            {loading ? "Analyzing..." : "Analyze Resume"}
          </button>
        </form>
      </div>

      {/* RESULT CARD */}
      {result && !result.error && (
        <div style={{ ...styles.card, marginTop: "30px" }}>
          <h2>Analysis Result</h2>

          <p>
            <strong>Name:</strong> {result.data?.name}
          </p>
          <p>
            <strong>Email:</strong> {result.data?.email}
          </p>
          <p>
            <strong>Experience:</strong> {result.data?.experience} years
          </p>

          {/* Resume Score */}
          <h3 style={{ marginTop: "20px" }}>Resume Score</h3>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${result.data?.score || 0}%`,
              }}
            />
          </div>

          <p
            style={{
              color:
                result.data?.score >= 75
                  ? "green"
                  : result.data?.score >= 50
                  ? "orange"
                  : "red",
              fontWeight: "bold",
            }}
          >
            {result.data?.score}%
          </p>

          {/* AI INSIGHTS */}
          <h3 style={{ marginTop: "20px" }}>AI Insights</h3>
          {Array.isArray(result.ai) && result.ai.length > 0 ? (
            <ul>
              {result.ai.map((item, i) => (
                <li key={i}>
                  {item.label} – {(item.score * 100).toFixed(2)}%
                </li>
              ))}
            </ul>
          ) : (
            <p>AI data not available</p>
          )}

          {/* JOB MATCH */}
          {result.jobMatch && (
            <>
              <h3 style={{ marginTop: "20px" }}>Job Match</h3>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${result.jobMatch.matchScore}%`,
                    backgroundColor: "#4CAF50",
                  }}
                />
              </div>
              <p>{result.jobMatch.matchScore}% Match</p>
            </>
          )}

          {/* FEEDBACK */}
          {Array.isArray(result.feedback) && result.feedback.length > 0 && (
            <>
              <h3 style={{ marginTop: "20px" }}>
                AI Feedback & Suggestions
              </h3>
              <ul>
                {result.feedback.map((tip, index) => (
                  <li key={index}>💡 {tip}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {result?.error && (
        <p style={{ color: "red", marginTop: "20px" }}>{result.error}</p>
      )}
    </div>
  );
}

/* ---------- STYLES ---------- */
const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f6f8",
    padding: "40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: "600px",
    background: "#fff",
    padding: "30px",
    borderRadius: "10px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
  },
  title: {
    textAlign: "center",
    marginBottom: "5px",
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: "20px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  input: {
    padding: "10px",
    fontSize: "14px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  textarea: {
    padding: "10px",
    fontSize: "14px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    minHeight: "80px",
  },
  button: {
    padding: "12px",
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  progressBar: {
    height: "10px",
    background: "#ddd",
    borderRadius: "5px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "#007bff",
  },
};

export default ResumeForm;
