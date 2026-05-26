import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import NavBar from "../../components/NavBar";
import CohortHero from "../../components/cohort/CohortHero";
import ProgressRing from "../../components/cohort/ProgressRing";
import SessionRow from "../../components/cohort/SessionRow";
import { getCohortBySlug } from "../../lib/cohortApi";

export default function CohortLanding() {
  const { slug } = useParams();
  const { data: cohort, isLoading, error } = useQuery({
    queryKey: ["cohort", slug],
    queryFn: () => getCohortBySlug(slug),
  });

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      <NavBar />
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px 60px" }}>
        {isLoading && <SkeletonHero />}
        {error && <ErrorPanel message={error.message} />}
        {cohort && (
          <>
            <CohortHero cohort={cohort} />

            <div
              style={{
                display: "flex",
                gap: 16,
                alignItems: "center",
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 14,
                padding: "18px 20px",
                marginBottom: 24,
              }}
            >
              <ProgressRing
                completed={cohort.progress.completed}
                total={cohort.progress.total}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#64748B", marginBottom: 4 }}>
                  Your Progress
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>
                  {cohort.progress.completed === 0
                    ? "Ready to begin"
                    : cohort.progress.completed === cohort.progress.total
                      ? "Program complete 🎉"
                      : `${cohort.progress.completed} of ${cohort.progress.total} sessions complete`}
                </div>
                <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>
                  Open a session to watch the recording, grab materials, and mark it complete.
                </div>
              </div>
              <Link
                to="/journal"
                style={{
                  background: "#2563EB",
                  color: "#fff",
                  padding: "10px 18px",
                  borderRadius: 10,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                Log a Journal Entry
              </Link>
            </div>

            {cohort.ndaRequired && (
              <div
                style={{
                  background: "#FEF3C7",
                  border: "1px solid #FCD34D",
                  borderRadius: 12,
                  padding: "12px 16px",
                  fontSize: 13,
                  color: "#854D0E",
                  marginBottom: 24,
                  lineHeight: 1.5,
                }}
              >
                <strong>NDA Reminder.</strong> All program content, recordings, and materials
                are restricted by the NDA you signed. Please do not share outside your cohort.
              </div>
            )}

            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", margin: "8px 0 16px" }}>
              Your AI Empowerment Journey
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cohort.sessions.map((s) => (
                <SessionRow key={s.order} session={s} cohortSlug={cohort.slug} />
              ))}
            </div>

            <div
              style={{
                marginTop: 32,
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 14,
                padding: "20px 22px",
                display: "flex",
                gap: 16,
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 28 }}>🎯</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>
                  AI Coaching Opportunities
                </div>
                <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>
                  {cohort.coachingNote}
                </div>
              </div>
              <button
                style={{
                  background: "#fff",
                  color: "#2563EB",
                  border: "1.5px solid #BFDBFE",
                  padding: "10px 18px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                onClick={() => alert("Coaching booking — coming in a later phase.")}
              >
                Book Coaching
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SkeletonHero() {
  return (
    <div
      style={{
        height: 220,
        background: "#E2E8F0",
        borderRadius: 16,
        marginBottom: 24,
        animation: "pulse 1.4s ease-in-out infinite",
      }}
    />
  );
}

function ErrorPanel({ message }) {
  return (
    <div
      style={{
        background: "#FEE2E2",
        border: "1px solid #FCA5A5",
        color: "#991B1B",
        padding: "16px 18px",
        borderRadius: 12,
        fontSize: 14,
      }}
    >
      <strong>Couldn't load cohort.</strong> {message}
    </div>
  );
}
