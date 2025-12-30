const { useState, useRef } = React;

// Welcome Page Component
function WelcomePage({ onGetStarted }) {
  return (
    <div className="welcome-page">
      <div className="welcome-content">
        <div className="welcome-logo">
          <h1 className="welcome-title">CV AI</h1>
          <div className="logo-icon">📄✨</div>
        </div>
        
        <div className="welcome-summary">
          <h2>Transform Your Resume</h2>
          <p className="summary-text">
            CV AI is a web-based system that converts Arabic CVs into professional, ATS-optimized English resumes.
            It improves CV structure, clarity, and readability to help candidates pass automated screening systems.
          </p>
          <p className="author-text">Made by Sultan Alotaibi</p>
        </div>

        <div className="welcome-features">
          <div className="feature-item">
            <span className="feature-icon">🌐</span>
            <span>Arabic to English Translation</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🎯</span>
            <span>ATS-Optimized Format</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <span>AI-Powered Enhancement</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📋</span>
            <span>Job Description Matching</span>
          </div>
        </div>

        <button onClick={onGetStarted} className="btn-welcome">
          Get Started
        </button>
      </div>
    </div>
  );
}

// Main App Component
function MainApp() {
  const [generatedCvText, setGeneratedCvText] = useState("");
  const [fileSelected, setFileSelected] = useState(false);
  const [fileName, setFileName] = useState("");
  const [resultMessage, setResultMessage] = useState("Upload your CV to get started.");
  const [showTips, setShowTips] = useState(false);
  const [tips, setTips] = useState([]);
  const [showMissingSection, setShowMissingSection] = useState(false);
  const [showJobDescription, setShowJobDescription] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [basicInfo, setBasicInfo] = useState({});
  const [extractedText, setExtractedText] = useState("");
  const [cvData, setCvData] = useState(null);
  const [jobDescription, setJobDescription] = useState("");

  const fileInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const jobDescInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFileSelected(true);
      setFileName(e.target.files[0].name);
    } else {
      setFileSelected(false);
      setFileName("");
    }
  };

  const generateCvWithAI = async (finalData) => {
    setResultMessage("Sending data to AI model...");
    setShowTips(false);

    try {
      const aiResponse = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalData),
      });

      const aiData = await aiResponse.json();

      if (!aiData.success) {
        setResultMessage("[Error] " + (aiData.message || "Failed to generate CV."));
        setShowTips(false);
        return;
      }

      setGeneratedCvText(aiData.generatedCv || "");

      if (!aiData.generatedCv) {
        setResultMessage("AI did not return any CV text. Please try again.");
        setShowTips(false);
        return;
      }

      if (Array.isArray(aiData.tips) && aiData.tips.length > 0) {
        setTips(aiData.tips);
        setShowTips(true);
      } else {
        setShowTips(false);
      }

      setResultMessage(
        "Your optimized English CV is ready! Click the button below to download it as PDF."
      );
    } catch (err) {
      console.error("AI request error:", err);
      setResultMessage("[Error] Connection error with AI API.");
      setShowTips(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!fileInputRef.current?.files[0]) {
      alert("Please choose a PDF file first");
      return;
    }

    const formData = new FormData();
    formData.append("cvfile", fileInputRef.current.files[0]);

    setResultMessage("Uploading and processing your CV...");
    setGeneratedCvText("");
    setShowTips(false);
    setShowMissingSection(false);
    setShowJobDescription(false);

    try {
      const response = await fetch("/api/cv", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setResultMessage(data.message || "Something went wrong.");
        return;
      }

      const basicInfoData = data.basicInfo || {};
      const missingFieldsData = data.missingFields || [];

      setBasicInfo(basicInfoData);
      setMissingFields(missingFieldsData);
      setExtractedText(data.extractedText);

      setResultMessage(
        "We read your CV. Please review and complete the information below."
      );
      setShowMissingSection(true);
    } catch (err) {
      console.log("Request error:", err);
      setResultMessage("Connection error while sending your CV.");
    }
  };

  const handleMissingInfoSubmit = (e) => {
    e.preventDefault();

    const name = nameInputRef.current?.value.trim() || basicInfo.name;
    if (!name) {
      alert("Name is required. Please enter your name.");
      return;
    }

    const finalData = {
      extractedText: extractedText,
      name: name,
      email: emailInputRef.current?.value.trim() || basicInfo.email || "",
      phone: phoneInputRef.current?.value.trim() || basicInfo.phone || "",
    };

    setCvData(finalData);
    setShowMissingSection(false);
    setShowJobDescription(true);
    setJobDescription("");
  };

  const handleContinueWithJobDesc = () => {
    if (!cvData) {
      alert("Please complete the previous step first.");
      return;
    }

    const jobDesc = jobDescInputRef.current?.value.trim() || "";
    if (!jobDesc) {
      alert("Please enter a job description to continue.");
      return;
    }

    const finalData = {
      ...cvData,
      jobDescription: jobDesc,
    };

    setShowJobDescription(false);
    generateCvWithAI(finalData);
  };

  const handleContinueWithoutJobDesc = () => {
    if (!cvData) {
      alert("Please complete the previous step first.");
      return;
    }

    setShowJobDescription(false);
    generateCvWithAI(cvData);
  };

  const handleDownload = () => {
    if (!generatedCvText) {
      alert("No generated CV to download yet.");
      return;
    }

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const leftMargin = 40;
    const topMargin = 50;
    const maxWidth = 515;
    const lineHeight = 16;

    let y = topMargin;

    const firstLine = generatedCvText.split("\n")[0].trim();

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(20);
    doc.text(firstLine, leftMargin, y);
    y += 30;

    const withoutFirstLine = generatedCvText.split("\n").slice(1).join("\n");

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(12);

    const lines = doc.splitTextToSize(withoutFirstLine, maxWidth);

    lines.forEach((line) => {
      if (y > 800 - topMargin) {
        doc.addPage();
        y = topMargin;
      }
      doc.text(line, leftMargin, y);
      y += lineHeight;
    });

    doc.save("cv_generated.pdf");
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>CV AI</h1>
        <p>Convert your Arabic CV into a professional, ATS-optimized English CV.</p>
      </header>

      <main className="app-main">
        <section className="card card-upload">
          <h2>1. Upload your CV</h2>
          <p className="card-subtitle">
            Upload your CV in PDF format. The system will read it and detect your basic info.
          </p>

          <form onSubmit={handleFormSubmit} className="cv-form">
            <label
              htmlFor="cvfile"
              className={`file-label ${fileSelected ? "selected" : ""}`}
            >
              <span id="file-label-text">
                {fileSelected ? `Selected: ${fileName}` : "Choose PDF file"}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                id="cvfile"
                name="cvfile"
                accept=".pdf"
                required
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </label>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <label className="consent">
                <input type="checkbox" id="consent-checkbox" required />
                I agree to send my CV data to the AI system for resume generation.
              </label>

              <span className="tip" tabIndex="0" aria-label="Privacy info">
                ?
                <span className="tip-box">
                  Only the CV text is sent to the AI to generate your resume. No data is stored.
                </span>
              </span>
            </div>

            <button type="submit" className="btn primary">
              Upload & Improve CV
            </button>
          </form>
        </section>

        {showMissingSection && (
          <section className="card card-missing">
            <h2>2. Complete your information</h2>
            <p className="card-subtitle">
              Please review and complete the information below. Adding a job description will help us tailor your CV better.
            </p>
            <form onSubmit={handleMissingInfoSubmit} className="user-info-form">
              <div className="form-group">
                <label htmlFor="user-name">
                  Name <span className="required">*</span>
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  id="user-name"
                  defaultValue={basicInfo.name || ""}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="user-email">
                  Email{" "}
                  {missingFields.includes("email") && (
                    <span className="optional">(optional)</span>
                  )}
                </label>
                <input
                  ref={emailInputRef}
                  type="email"
                  id="user-email"
                  defaultValue={basicInfo.email || ""}
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="user-phone">
                  Phone{" "}
                  {missingFields.includes("phone") && (
                    <span className="optional">(optional)</span>
                  )}
                </label>
                <input
                  ref={phoneInputRef}
                  type="text"
                  id="user-phone"
                  defaultValue={basicInfo.phone || ""}
                  placeholder="+966 5XX XXX XXX"
                />
              </div>

              <button type="submit" className="btn primary">
                Continue to Job Description
              </button>
            </form>
          </section>
        )}

        {showJobDescription && (
          <section className="card card-job-description">
            <h2>3. Add Job Description (Optional but Recommended)</h2>
            <p className="card-subtitle">
              Paste the job description you're applying for. This helps us tailor your CV to match the job requirements and improve your chances.
            </p>
            <textarea
              ref={jobDescInputRef}
              className="job-description-textarea"
              placeholder="Paste the job description here... (e.g., requirements, responsibilities, skills needed)"
              rows="6"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            ></textarea>
            <button onClick={handleContinueWithJobDesc} className="btn primary">
              Continue with Job Description
            </button>
            <button onClick={handleContinueWithoutJobDesc} className="btn secondary">
              Continue without Job Description
            </button>
          </section>
        )}

        <section className="card card-result">
          <h2>4. Result</h2>
          <p className="status-text">{resultMessage}</p>

          <button
            onClick={handleDownload}
            className="btn secondary"
            disabled={!generatedCvText}
          >
            Download CV as PDF
          </button>

          {showTips && (
            <div className="tips-box">
              <h3>Improvement Tips</h3>
              <ul id="tips-list">
                {tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// Main App Component
function App() {
  const [showWelcome, setShowWelcome] = useState(true);

  const handleGetStarted = () => {
    setShowWelcome(false);
    window.scrollTo(0, 0);
  };

  if (showWelcome) {
    return <WelcomePage onGetStarted={handleGetStarted} />;
  }

  return <MainApp />;
}

// Render the app
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

