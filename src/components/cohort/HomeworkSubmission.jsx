import { useState, useEffect } from "react";

// Lets a participant submit (or re-submit) the homework for a session.
// `session.homework`        = { prompt, dueDate, submissionType }
// `session.homeworkSubmission` = { response, link, submittedAt } | null
export default function HomeworkSubmission({ session, onSubmit, pending }) {
  const hw = session?.homework;
  const existing = session?.homeworkSubmission;

  const [response, setResponse] = useState(existing?.response || "");
  const [link, setLink] = useState(existing?.link || "");
  const [editing, setEditing] = useState(!existing);

  // Refresh when navigating between sessions
  useEffect(() => {
    setResponse(existing?.response || "");
    setLink(existing?.link || "");
    setEditing(!existing);
  }, [session?.order, existing]);

  if (!hw?.prompt) {
    return (
      <div style={{ fontSize: 14, color: "#64748B" }}>
        No homework for this session.
      </div>
    );
  }

  const due = hw.dueDate ? new Date(hw.dueDate) : null;
  const dueLabel = due
    ? due.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" })
    : null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!response.trim() && !link.trim()) return;
    onSubmit({ response: response.trim(), link: link.trim() });
    setEditing(false);
  }

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: 0.4, marginBottom: 6 }}>
        ASSIGNMENT
      </div>
      <p style={{ fontSize: 15, color: "#334155", lineHeight: 1.65, margin: "0 0 6px" }}>
        {hw.prompt}
      </p>
      {dueLabel && (
        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 18 }}>
          Due {dueLabel}
        </div>
      )}

      {existing && !editing && <SubmittedView submission={existing} onEdit={() => setEditing(true)} />}

      {(editing || !existing) && (
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Your response</label>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Type your answer here, or paste a link below if your work lives elsewhere."
            rows={6}
            style={textareaStyle}
          />

          <label style={{ ...labelStyle, marginTop: 14 }}>Optional link (Google Doc, Notion, file)</label>
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://docs.google.com/..."
            style={inputStyle}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
            <button
              type="submit"
              disabled={pending || (!response.trim() && !link.trim())}
              style={{
                ...btnPrimary,
                opacity: pending || (!response.trim() && !link.trim()) ? 0.5 : 1,
                cursor: pending ? "wait" : "pointer",
              }}
            >
              {pending ? "Submitting…" : existing ? "Update submission" : "Submit homework"}
            </button>
            {existing && (
              <button type="button" onClick={() => setEditing(false)} style={btnSecondary}>
                Cancel
              </button>
            )}
            <div style={{ fontSize: 12, color: "#64748B", marginLeft: "auto" }}>
              Either field is fine — text, link, or both.
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

function SubmittedView({ submission, onEdit }) {
  const ts = submission.submittedAt ? new Date(submission.submittedAt) : null;
  const tsLabel = ts
    ? ts.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : "";

  return (
    <div
      style={{
        background: "#ECFDF5",
        border: "1px solid #A7F3D0",
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 18 }}>✅</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#065F46" }}>Homework submitted</div>
        <div style={{ fontSize: 12, color: "#047857", marginLeft: "auto" }}>{tsLabel}</div>
      </div>
      {submission.response && (
        <p style={{ fontSize: 14, color: "#0F172A", whiteSpace: "pre-wrap", margin: "0 0 10px", lineHeight: 1.55 }}>
          {submission.response}
        </p>
      )}
      {submission.link && (
        <a
          href={submission.link}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-block",
            fontSize: 13,
            fontWeight: 700,
            color: "#1D4ED8",
            textDecoration: "none",
            background: "#DBEAFE",
            padding: "6px 10px",
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          Open link →
        </a>
      )}
      <button
        type="button"
        onClick={onEdit}
        style={{
          background: "none",
          border: "none",
          color: "#047857",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          padding: 0,
        }}
      >
        Edit submission
      </button>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "#475569",
  letterSpacing: 0.3,
  marginBottom: 6,
};

const textareaStyle = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "inherit",
  border: "1px solid #CBD5E1",
  borderRadius: 10,
  background: "#F8FAFC",
  color: "#0F172A",
  resize: "vertical",
  lineHeight: 1.55,
  boxSizing: "border-box",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "inherit",
  border: "1px solid #CBD5E1",
  borderRadius: 10,
  background: "#F8FAFC",
  color: "#0F172A",
  boxSizing: "border-box",
};

const btnPrimary = {
  background: "#2563EB",
  color: "#fff",
  border: "none",
  padding: "10px 18px",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
};

const btnSecondary = {
  background: "#fff",
  color: "#475569",
  border: "1px solid #CBD5E1",
  padding: "10px 14px",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
