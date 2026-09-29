import { useState, useRef, useEffect } from "react";
import "./App.css";

const API = "http://localhost:8000";

export default function App() {
  const [fileName, setFileName] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(""); // "", "uploading", "done", "error"
  const [statusMsg, setStatusMsg] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const [chat, setChat] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  const uploadFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setUploadStatus("uploading");
    setStatusMsg("Uploading and indexing...");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(`${API}/upload`, { method: "POST", body: form });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUploadStatus("done");
      setStatusMsg(data.message);
    } catch {
      setUploadStatus("error");
      setStatusMsg("Upload failed. Is the backend running?");
    }
  };

  const handleFileInput = (e) => uploadFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    uploadFile(e.dataTransfer.files[0]);
  };

  const ask = async () => {
    const q = question.trim();
    if (!q || loading) return;

    setChat((c) => [...c, { role: "user", text: q }]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setChat((c) => [...c, { role: "bot", text: data.answer }]);
    } catch {
      setChat((c) => [
        ...c,
        { role: "bot", text: "Something went wrong reaching the server. Please try again." },
      ]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>📚 Student Notes Assistant</h1>
        <p>Upload your notes, then ask questions grounded in what you uploaded.</p>
      </header>

      <section
        className={`dropzone ${dragActive ? "active" : ""} ${uploadStatus}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.docx"
          onChange={handleFileInput}
          hidden
        />
        {!fileName && (
          <>
            <span className="dropzone-icon">📄</span>
            <p><strong>Click to upload</strong> or drag a file here</p>
            <p className="hint">PDF, DOCX, or TXT</p>
          </>
        )}
        {fileName && (
          <div className="file-info">
            <span className={`status-dot ${uploadStatus}`} />
            <span className="file-name">{fileName}</span>
            <span className="status-text">
              {uploadStatus === "uploading" && "Indexing..."}
              {uploadStatus === "done" && "Ready"}
              {uploadStatus === "error" && "Failed"}
            </span>
          </div>
        )}
      </section>
      {statusMsg && <p className={`status-msg ${uploadStatus}`}>{statusMsg}</p>}

      <section className="chat-window">
        {chat.length === 0 && (
          <div className="empty-state">
            Upload a file, then ask a question about it to get started.
          </div>
        )}
        {chat.map((m, i) => (
          <div key={i} className={`bubble-row ${m.role}`}>
            <div className={`bubble ${m.role}`}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div className="bubble-row bot">
            <div className="bubble bot typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </section>

      <div className="input-row">
        <textarea
          rows={1}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            uploadStatus === "done" ? "Ask about your notes..." : "Upload a file first..."
          }
          disabled={uploadStatus !== "done"}
        />
        <button onClick={ask} disabled={uploadStatus !== "done" || loading || !question.trim()}>
          Ask
        </button>
      </div>
    </div>
  );
}