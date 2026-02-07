import { useState } from "react";
import ResumeForm from "./components/ResumeForm";
import ResumeList from "./components/ResumeList";

function App() {
  const [resumes, setResumes] = useState([]);

  const handleResumeAdded = (newResume) => {
    // add new resume to top instantly
    setResumes((prev) => [newResume, ...prev]);
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <ResumeForm onResumeAdded={handleResumeAdded} />
      <ResumeList resumes={resumes} />
    </div>
  );
}

export default App;
