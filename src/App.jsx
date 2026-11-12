import { useState } from "react";
import TaskCard from "./components/TaskCard.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "";
const MAX_CHARS = 12000;

const TASKS = [
  {
    id: "reply",
    icon: "✉️",
    title: "Professional Email Reply",
    desc: "Craft a polished reply to an email you received.",
    label: "Paste the email you received",
    placeholder: "Paste the email you want to reply to...",
    button: "Generate Reply",
  },
  {
    id: "rewrite",
    icon: "✨",
    title: "Rewrite Message",
    desc: "Turn casual text into professional language.",
    label: "Enter your informal message",
    placeholder: "e.g. hey, cant make it to the meeting tmrw, something came up. can we move it?",
    button: "Rewrite Professionally",
  },
  {
    id: "summarize",
    icon: "📄",
    title: "Summarize Email",
    desc: "Condense long emails and keep what matters.",
    label: "Paste the email to summarize",
    placeholder: "Paste a long email or email thread here...",
    button: "Summarize Email",
  },
  {
    id: "followup",
    icon: "🔔",
    title: "Follow-up Message",
    desc: "Write a polite follow-up to a previous conversation.",
    label: "Describe or paste the previous conversation",
    placeholder: "e.g. I sent a proposal to Mr. Khan last Monday and haven't heard back...",
    button: "Generate Follow-up",
  },
];

export default function App() {
  const [taskId, setTaskId] = useState("reply");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const task = TASKS.find((t) => t.id === taskId);

  const selectTask = (id) => {
    if (id === taskId) return;
    setTaskId(id);
    setOutput("");
    setError("");
    setCopied(false);
  };

  const handleGenerate = async () => {
    if (loading) return;
    if (!input.trim()) {
      setError("Please enter some text before generating.");
      return;
    }
    setLoading(true);
    setError("");
    setOutput("");
    setCopied(false);

    try {
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: taskId, text: input }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setOutput(data.result);
    } catch (err) {
      if (err instanceof TypeError) {
        setError("Could not reach the server. Make sure the backend is running.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = output;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
    setError("");
    setCopied(false);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleGenerate();
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-logo" aria-hidden="true">✉️</span>
          <span className="brand-name">AI Email Assistant</span>
        </div>
        <span className="badge">Powered by OpenRouter</span>
      </header>

      <main className="container">
        <section className="hero">
          <h1>AI Email Assistant</h1>
          <p>Write, rewrite, summarize and follow up on emails in seconds.</p>
        </section>

        <section className="task-grid" aria-label="Choose a task">
          {TASKS.map((t) => (
            <TaskCard key={t.id} task={t} active={t.id === taskId} onSelect={selectTask} />
          ))}
        </section>

        <section className="workspace">
          <div className="panel">
            <div className="panel-head">
              <label htmlFor="input" className="panel-title">{task.label}</label>
              <span className={`counter ${input.length > MAX_CHARS ? "over" : ""}`}>
                {input.length}/{MAX_CHARS}
              </span>
            </div>
            <textarea
              id="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={task.placeholder}
              maxLength={MAX_CHARS}
              rows={12}
            />
            <div className="actions">
              <button className="btn primary" onClick={handleGenerate} disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner" aria-hidden="true" /> Generating...
                  </>
                ) : (
                  task.button
                )}
              </button>
              <button className="btn ghost" onClick={handleClear} disabled={loading}>
                Clear
              </button>
            </div>
            <p className="hint">Tip: press Ctrl + Enter to generate.</p>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">AI Response</h2>
              <button className="btn small" onClick={handleCopy} disabled={!output}>
                {copied ? "✓ Copied" : "Copy to Clipboard"}
              </button>
            </div>

            {error && (
              <div className="error" role="alert">
                <strong>Error:</strong> {error}
              </div>
            )}

            <div className="output" aria-live="polite">
              {loading ? (
                <div className="loading">
                  <div className="dots">
                    <span /><span /><span />
                  </div>
                  <p>The AI is writing your response...</p>
                </div>
              ) : output ? (
                <div className="output-text">{output}</div>
              ) : (
                <p className="placeholder">Your AI-generated result will appear here.</p>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">AI Email Assistant · Always review AI-generated text before sending.</footer>
    </div>
  );
}
