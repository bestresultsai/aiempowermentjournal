import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import MetricCard from "../components/MetricCard";
import QualityBars from "../components/QualityBars";
import EntriesTable from "../components/EntriesTable";
import { calcAggregateMetrics, formatCurrency, formatHours, formatPercent } from "../lib/calculations";
import { MOCK_COHORT } from "../lib/mockCohort";
import { getCohortBySlug } from "../lib/cohortApi";
import { useQuery } from "@tanstack/react-query";

// Mock-mode: every cohort name maps to the same prototype cohort.
// Live mode: look up the cohort slug from Notion by name (Cohort.Slug).
// (Not currently reachable — the fetch below is gated to `!!primarySlug`
// and we only set primarySlug from real user entries now.)
function cohortNameToSlug(_name) {
  return MOCK_COHORT.slug;
}

export default function IndividualDashboard({ entries, allEntries, cohorts, email }) {
  const [tab, setTab] = useState("mine"); // mine | cohort
  const participantName = entries[0]?.participantName || email;

  const myCohortNames = useMemo(
    () => [...new Set(entries.map((e) => e.cohort).filter(Boolean))],
    [entries]
  );

  const cohortEntries = useMemo(() => {
    if (!myCohortNames.length) return [];
    return allEntries.filter((e) => myCohortNames.includes(e.cohort));
  }, [allEntries, myCohortNames]);

  const displayEntries = tab === "mine" ? entries : cohortEntries;
  const metrics = calcAggregateMetrics(displayEntries);

  // Resolve the first cohort's slug → fetch live progress info for the card.
  // Was falling back to MOCK_COHORT.name when the user had no entries yet
  // — which meant a fresh user with an empty journal saw seed cohort data
  // (IAHE / Purple Belt) instead of an empty state. Now we simply skip
  // the fetch until a real entry gives us a real cohort name.
  const primaryCohortName = myCohortNames[0] || null;
  const primarySlug = primaryCohortName ? cohortNameToSlug(primaryCohortName) : null;
  const { data: cohortData } = useQuery({
    queryKey: ["cohort", primarySlug],
    queryFn: () => getCohortBySlug(primarySlug),
    enabled: !!primarySlug,
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 40px" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)",
          borderRadius: 14,
          padding: "20px 24px",
          color: "#fff",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 500, marginBottom: 4 }}>
          BestResults.AI Platform
        </div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Welcome back, {participantName}</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
          {entries.length} journal entr{entries.length !== 1 ? "ies" : "y"} submitted
        </div>
      </div>

      {/* Cohort card + Quick actions */}
      {cohortData && (
        <CohortCard cohort={cohortData} />
      )}

      <QuickActions cohortSlug={cohortData?.slug || primarySlug} />

      {/* Tab toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#F1F5F9", borderRadius: 10, padding: 4 }}>
        {[
          { key: "mine", label: "My Entries" },
          { key: "cohort", label: "Cohort Aggregate" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 8, fontSize: 13,
              fontWeight: 600, border: "none", cursor: "pointer",
              background: tab === t.key ? "#fff" : "transparent",
              color: tab === t.key ? "#2563EB" : "#64748B",
              boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Metrics */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <MetricCard label="Total Entries" value={metrics.totalEntries} icon="📝" />
        <MetricCard label="Time Saved" value={`${formatHours(metrics.totalTimeSaved)}h`} icon="⏱️" />
        <MetricCard label="Avg Efficiency" value={formatPercent(metrics.avgEfficiency)} icon="📈" color="#7C3AED" bgColor="#EDE9FE" />
        <MetricCard label="Annual Value" value={formatCurrency(metrics.totalAnnualValue)} icon="💰" color="#059669" bgColor="#D1FAE5" />
      </div>

      {/* Quality + Cohorts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
          <QualityBars distribution={metrics.qualityDistribution} />
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: "0 0 12px" }}>
            {tab === "mine" ? "My Cohorts" : "Cohort Participants"}
          </h3>
          {tab === "mine"
            ? myCohortNames.map((c) => (
                <div key={c} style={{ padding: "8px 0", borderBottom: "1px solid #F1F5F9", fontSize: 13, fontWeight: 500, color: "#0F172A" }}>
                  {c}
                </div>
              ))
            : [...new Set(cohortEntries.map((e) => e.participantName))].map((name) => (
                <div
                  key={name}
                  style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{name}</span>
                  <span style={{ fontSize: 12, color: "#64748B" }}>
                    {cohortEntries.filter((e) => e.participantName === name).length} entries
                  </span>
                </div>
              ))}
        </div>
      </div>

      {/* Entries Table */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: "0 0 14px" }}>
          {tab === "mine" ? "My" : "Cohort"} Entries ({displayEntries.length})
        </h3>
        <EntriesTable entries={displayEntries} />
      </div>
    </div>
  );
}

// --- Cohort card (linked) -------------------------------------------------

function CohortCard({ cohort }) {
  const today = new Date();
  // Find the "current" session = first not-yet-completed AND unlocked session.
  // If none, find the next-upcoming. If none, the last one.
  const sessions = cohort.sessions || [];
  const nextSession =
    sessions.find((s) => s.unlocked && !s.completed) ||
    sessions.find((s) => !s.unlocked && new Date(s.date) > today) ||
    sessions[sessions.length - 1];

  const completed = cohort.progress?.completed ?? 0;
  const total = cohort.progress?.total ?? sessions.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  return (
    <Link
      to={`/cohort/${cohort.slug}`}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          border: "1px solid #E2E8F0",
          borderRadius: 14,
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          transition: "transform 0.1s, box-shadow 0.1s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 8px 22px rgba(15,23,42,0.08)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: 0.4, marginBottom: 4 }}>
            MY COHORT · {cohort.programCode}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#0F172A", marginBottom: 6 }}>
            {cohort.name}
          </div>
          {nextSession && (
            <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
              <strong style={{ color: "#0F172A" }}>
                {nextSession.completed ? "Up next:" : "Continue with:"}
              </strong>{" "}
              {nextSession.title}
            </div>
          )}
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 8, background: "#F1F5F9", borderRadius: 999, overflow: "hidden", maxWidth: 320 }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: "#2563EB",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>
              {completed}/{total} · {pct}%
            </div>
          </div>
        </div>
        <div style={{ color: "#2563EB", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
          Open cohort →
        </div>
      </div>
    </Link>
  );
}

// --- Quick actions row ----------------------------------------------------

function QuickActions({ cohortSlug }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 12,
        marginBottom: 20,
      }}
    >
      <Link
        to="/journal/new"
        style={{
          background: "#2563EB",
          color: "#fff",
          padding: "14px 16px",
          borderRadius: 12,
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 22 }}>📝</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Log a Journal Entry</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            Capture an AI win you had this week.
          </div>
        </div>
      </Link>
      {cohortSlug && (
        <Link
          to={`/cohort/${cohortSlug}`}
          style={{
            background: "#fff",
            color: "#0F172A",
            padding: "14px 16px",
            borderRadius: 12,
            textDecoration: "none",
            border: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 22 }}>🥋</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Open My Cohort</div>
            <div style={{ fontSize: 12, color: "#64748B" }}>
              Sessions, materials, and homework.
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}
