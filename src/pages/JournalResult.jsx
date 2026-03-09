import { useLocation, Link, Navigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { calcTimeSaved, calcPercentSaved, calcAnnualTimeSaved, calcAnnualValue, formatCurrency, formatHours } from "../lib/calculations";

export default function JournalResult() {
  const { state } = useLocation();

  if (!state) return <Navigate to="/journal" />;

  const hoursWithout = parseFloat(state.hoursWithoutAI);
  const hoursWith = parseFloat(state.hoursWithAI);
  const timeSaved = calcTimeSaved(hoursWithout, hoursWith);
  const percentSaved = calcPercentSaved(hoursWithout, hoursWith);
  const annualTime = calcAnnualTimeSaved(hoursWithout, hoursWith, state.frequency);
  const annualValue = calcAnnualValue(hoursWithout, hoursWith, state.frequency);

  const qualColor = state.qualityOutcome === "Better than original" ? "#059669"
    : state.qualityOutcome === "Equal to original" ? "#2563EB" : "#DC2626";

  return (
    <>
      <NavBar />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🎉</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: "0 0 6px" }}>
            Entry Submitted!
          </h1>
          <p style={{ fontSize: 14, color: "#64748B" }}>
            Here's the impact of <strong>{state.projectName}</strong>
          </p>
        </div>

        {/* Impact Card */}
        <div style={{
          background: "linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)",
          borderRadius: 16, padding: "24px 20px", color: "#fff", marginBottom: 16,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 500, marginBottom: 4 }}>Time Saved</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{timeSaved.toFixed(1)}h</div>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 500, marginBottom: 4 }}>Efficiency Gain</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{percentSaved.toFixed(0)}%</div>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 500, marginBottom: 4 }}>Annual Time Saved</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{formatHours(annualTime)}h</div>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 500, marginBottom: 4 }}>Annual Value</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{formatCurrency(annualValue)}</div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div style={{
          background: "#fff", borderRadius: 12, padding: 20,
          border: "1px solid #E2E8F0", marginBottom: 16,
        }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={{
              padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: "#D1FAE5", color: qualColor,
            }}>
              Quality: {state.qualityOutcome}
            </span>
            <span style={{
              padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: "#EDE9FE", color: "#7C3AED",
            }}>
              {state.scope}
            </span>
            <span style={{
              padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: "#F1F5F9", color: "#64748B",
            }}>
              {state.frequency}
            </span>
          </div>

          {state.innovationTitle && (
            <div style={{
              background: "#FEF3C7", borderRadius: 8, padding: 14,
              border: "1px solid #FDE68A",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#B45309", marginBottom: 4 }}>
                🚀 Innovation: {state.innovationTitle}
              </div>
              {state.innovationDescription && (
                <div style={{ fontSize: 12, color: "#92400E" }}>{state.innovationDescription}</div>
              )}
            </div>
          )}
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/journal" style={{
            flex: 1, textAlign: "center", textDecoration: "none",
            background: "#2563EB", color: "#fff", padding: "12px 0",
            borderRadius: 10, fontWeight: 700, fontSize: 14,
          }}>
            Submit Another
          </Link>
          <Link to="/dashboard" style={{
            flex: 1, textAlign: "center", textDecoration: "none",
            background: "#fff", color: "#2563EB", padding: "12px 0",
            borderRadius: 10, fontWeight: 700, fontSize: 14,
            border: "2px solid #BFDBFE",
          }}>
            View Dashboard
          </Link>
        </div>
      </div>
    </>
  );
}
