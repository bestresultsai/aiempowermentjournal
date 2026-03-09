import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { getCohorts, submitJournalEntry, lookupParticipant } from "../lib/api";

const FREQUENCIES = [
  "Daily", "Multiple times a week", "Once a week", "Multiple times a month",
  "Once a month", "Multiple times a quarter", "Once a quarter",
  "Multiple times a year", "Once a year", "Less than once a year",
];

const SCOPES = ["Individual", "Department-wide", "Organization-wide"];
const QUALITY_OPTIONS = ["Better than original", "Equal to original", "Not as good as original"];

export default function Journal() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cohortParam = searchParams.get("cohort") || "";

  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Participant lookup state
  const [emailInput, setEmailInput] = useState("");
  const [lookupStatus, setLookupStatus] = useState("idle"); // idle, looking, found, not_found
  const [participant, setParticipant] = useState(null);
  const [lookupTimer, setLookupTimer] = useState(null);

  const [form, setForm] = useState({
    cohort: cohortParam,
    projectName: "",
    description: "",
    scope: "Individual",
    frequency: "Once a week",
    hoursWithoutAI: "",
    hoursWithAI: "",
    qualityOutcome: "Better than original",
    innovationTitle: "",
    innovationDescription: "",
  });

  useEffect(() => {
    getCohorts()
      .then(setCohorts)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Debounced email lookup
  const doLookup = useCallback(async (email) => {
    if (!email || !email.includes("@")) {
      setLookupStatus("idle");
      setParticipant(null);
      return;
    }
    setLookupStatus("looking");
    try {
      const result = await lookupParticipant(email);
      if (result.found) {
        setParticipant(result.participant);
        setLookupStatus("found");
        // Auto-set cohort if participant has only one
        if (result.participant.cohorts?.length === 1 && !form.cohort) {
          setForm(f => ({ ...f, cohort: result.participant.cohorts[0] }));
        }
      } else {
        setParticipant(null);
        setLookupStatus("not_found");
      }
    } catch {
      setParticipant(null);
      setLookupStatus("not_found");
    }
  }, [form.cohort]);

  function handleEmailChange(value) {
    setEmailInput(value);
    // Clear previous timer
    if (lookupTimer) clearTimeout(lookupTimer);
    // Set new debounced lookup (600ms after user stops typing)
    const timer = setTimeout(() => doLookup(value.trim()), 600);
    setLookupTimer(timer);
  }

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!emailInput.trim() || !form.projectName || !form.hoursWithoutAI || !form.hoursWithAI) {
      setError("Please fill in all required fields.");
      return;
    }
    if (lookupStatus !== "found") {
      setError("We couldn't find a participant with that email. Please check and try again, or contact your trainer.");
      return;
    }
    if (!form.cohort) {
      setError("Please select your cohort.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await submitJournalEntry({
        participantName: participant.name,
        participantEmail: participant.email,
        organization: participant.organization,
        cohort: form.cohort,
        projectName: form.projectName,
        description: form.description,
        scope: form.scope,
        frequency: form.frequency,
        hoursWithoutAI: form.hoursWithoutAI,
        hoursWithAI: form.hoursWithAI,
        qualityOutcome: form.qualityOutcome,
        innovationTitle: form.innovationTitle,
        innovationDescription: form.innovationDescription,
      });
      navigate("/journal/result", {
        state: {
          ...form,
          participantEmail: participant.email,
          participantName: participant.name,
          organization: participant.organization,
        },
      });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid #E2E8F0", fontSize: 14, outline: "none",
    boxSizing: "border-box", fontFamily: "inherit",
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 };
  const sectionStyle = {
    background: "#fff", borderRadius: 12, padding: "20px", marginBottom: 16,
    border: "1px solid #E2E8F0",
  };

  if (loading) {
    return (
      <>
        <NavBar />
        <div style={{ textAlign: "center", padding: 60, color: "#64748B" }}>Loading form data...</div>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px 40px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>
          AI Journal Entry
        </h1>
        <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
          Document how you used AI and measure your impact.
        </p>

        {error && (
          <div style={{
            background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8,
            padding: 12, color: "#DC2626", fontSize: 13, marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Your Details */}
          <div style={sectionStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#2563EB", margin: "0 0 16px" }}>
              Your Details
            </h3>

            {/* Email input with live lookup */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Your Email Address *</label>
              <div style={{ position: "relative" }}>
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => handleEmailChange(e.target.value)}
                  placeholder="you@company.com"
                  required
                  style={{
                    ...inputStyle,
                    borderColor: lookupStatus === "found" ? "#059669" :
                      lookupStatus === "not_found" ? "#DC2626" : "#E2E8F0",
                    paddingRight: 36,
                  }}
                />
                {/* Status indicator */}
                <div style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  fontSize: 16,
                }}>
                  {lookupStatus === "looking" && (
                    <span style={{ color: "#94A3B8", fontSize: 12 }}>...</span>
                  )}
                  {lookupStatus === "found" && "✅"}
                  {lookupStatus === "not_found" && "❌"}
                </div>
              </div>

              {/* Participant info card */}
              {lookupStatus === "found" && participant && (
                <div style={{
                  marginTop: 8, background: "#F0FDF4", border: "1px solid #BBF7D0",
                  borderRadius: 8, padding: "10px 14px",
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#059669" }}>
                    {participant.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    {participant.organization}
                    {participant.cohorts?.length > 0 && (
                      <> • Cohort{participant.cohorts.length > 1 ? "s" : ""}: {participant.cohorts.join(", ")}</>
                    )}
                  </div>
                </div>
              )}

              {lookupStatus === "not_found" && (
                <div style={{
                  marginTop: 8, background: "#FEF2F2", border: "1px solid #FECACA",
                  borderRadius: 8, padding: "10px 14px",
                }}>
                  <div style={{ fontSize: 12, color: "#DC2626" }}>
                    We couldn't find this email in our records. Please double-check your email or contact your trainer.
                  </div>
                </div>
              )}
            </div>

            {/* Cohort selector — auto-selected if participant has one, or choose if multiple */}
            <div>
              <label style={labelStyle}>Cohort *</label>
              {participant && participant.cohorts?.length > 1 ? (
                <select value={form.cohort} onChange={e => update("cohort", e.target.value)} style={inputStyle} required>
                  <option value="">Select your cohort...</option>
                  {participant.cohorts.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : participant && participant.cohorts?.length === 1 ? (
                <div style={{
                  ...inputStyle, background: "#F8FAFC", color: "#0F172A",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ fontSize: 12, color: "#059669" }}>✓</span>
                  {participant.cohorts[0]}
                </div>
              ) : (
                <select value={form.cohort} onChange={e => update("cohort", e.target.value)} style={inputStyle} required>
                  <option value="">Enter your email first to see your cohort</option>
                  {cohorts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Section 2: Project Details */}
          <div style={sectionStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#2563EB", margin: "0 0 16px" }}>
              Project Details
            </h3>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Project / Deliverable Name *</label>
              <input type="text" value={form.projectName} onChange={e => update("projectName", e.target.value)}
                placeholder="e.g., Quarterly Board Presentation" style={inputStyle} required />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Description</label>
              <textarea value={form.description} onChange={e => update("description", e.target.value)}
                placeholder="Describe what you created using AI..."
                style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Scope *</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {SCOPES.map(s => (
                  <button key={s} type="button" onClick={() => update("scope", s)}
                    style={{
                      padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                      border: form.scope === s ? "2px solid #2563EB" : "1px solid #E2E8F0",
                      background: form.scope === s ? "#EFF6FF" : "#fff",
                      color: form.scope === s ? "#2563EB" : "#64748B",
                      cursor: "pointer",
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Frequency *</label>
              <select value={form.frequency} onChange={e => update("frequency", e.target.value)} style={inputStyle}>
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          {/* Section 3: AI Impact */}
          <div style={sectionStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#2563EB", margin: "0 0 16px" }}>
              AI Impact Measurement
            </h3>
            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Hours Without AI *</label>
                <input type="number" min="0" step="0.5" value={form.hoursWithoutAI}
                  onChange={e => update("hoursWithoutAI", e.target.value)}
                  placeholder="e.g., 8" style={inputStyle} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Hours With AI *</label>
                <input type="number" min="0" step="0.5" value={form.hoursWithAI}
                  onChange={e => update("hoursWithAI", e.target.value)}
                  placeholder="e.g., 2" style={inputStyle} required />
              </div>
            </div>
            {form.hoursWithoutAI && form.hoursWithAI && (
              <div style={{
                background: "#EFF6FF", borderRadius: 8, padding: "10px 14px",
                display: "flex", gap: 16, marginBottom: 14,
              }}>
                <span style={{ fontSize: 12, color: "#2563EB", fontWeight: 600 }}>
                  Time Saved: {(form.hoursWithoutAI - form.hoursWithAI).toFixed(1)}h
                </span>
                <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>
                  Efficiency: {((form.hoursWithoutAI - form.hoursWithAI) / form.hoursWithoutAI * 100).toFixed(0)}%
                </span>
              </div>
            )}
            <div>
              <label style={labelStyle}>Quality Outcome *</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {QUALITY_OPTIONS.map(q => (
                  <button key={q} type="button" onClick={() => update("qualityOutcome", q)}
                    style={{
                      padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                      border: form.qualityOutcome === q ? "2px solid #059669" : "1px solid #E2E8F0",
                      background: form.qualityOutcome === q ? "#D1FAE5" : "#fff",
                      color: form.qualityOutcome === q ? "#059669" : "#64748B",
                      cursor: "pointer",
                    }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Innovation */}
          <div style={sectionStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#B45309", margin: "0 0 4px" }}>
              Innovation (Optional)
            </h3>
            <p style={{ fontSize: 11, color: "#94A3B8", margin: "0 0 14px" }}>
              Did AI enable something entirely new that wasn't possible before?
            </p>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Innovation Title</label>
              <input type="text" value={form.innovationTitle} onChange={e => update("innovationTitle", e.target.value)}
                placeholder="e.g., Auto-generated Trend Analysis" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Innovation Description</label>
              <textarea value={form.innovationDescription} onChange={e => update("innovationDescription", e.target.value)}
                placeholder="Describe what new capability AI made possible..."
                style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} />
            </div>
          </div>

          <button type="submit" disabled={submitting || lookupStatus !== "found"} style={{
            width: "100%", padding: "14px 0", borderRadius: 10,
            background: submitting ? "#93C5FD" : lookupStatus !== "found" ? "#CBD5E1" : "#2563EB",
            color: "#fff", border: "none", fontSize: 15, fontWeight: 700,
            cursor: (submitting || lookupStatus !== "found") ? "not-allowed" : "pointer",
            boxShadow: lookupStatus === "found" ? "0 4px 14px rgba(37,99,235,0.3)" : "none",
          }}>
            {submitting ? "Submitting to Notion..." :
             lookupStatus !== "found" ? "Enter your email to continue" :
             "Submit Journal Entry"}
          </button>
        </form>
      </div>
    </>
  );
}
