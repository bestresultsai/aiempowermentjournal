import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NavBar from "../../components/NavBar";
import SessionPlayer from "../../components/cohort/SessionPlayer";
import HomeworkSubmission from "../../components/cohort/HomeworkSubmission";
import { BELT_COLORS } from "../../lib/mockCohort";
import { getSession, markSessionComplete, submitHomework } from "../../lib/cohortApi";

export default function SessionDetail() {
  const { slug, order } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState("overview");

  const { data, isLoading, error } = useQuery({
    queryKey: ["cohort", slug, "session", order],
    queryFn: () => getSession(slug, order),
  });

  const complete = useMutation({
    mutationFn: (completed) => markSessionComplete(slug, order, completed),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cohort", slug] }),
  });

  const homework = useMutation({
    mutationFn: (payload) => submitHomework(slug, order, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cohort", slug] }),
  });

  const belt = data?.session?.belt && BELT_COLORS[data.session.belt]
    ? BELT_COLORS[data.session.belt]
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      <NavBar />
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "20px 20px 60px" }}>
        <div style={{ marginBottom: 16 }}>
          <Link to={`/cohort/${slug}`} style={{ color: "#2563EB", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            ← Back to cohort
          </Link>
        </div>

        {isLoading && <div style={{ color: "#64748B" }}>Loading session…</div>}
        {error && (
          <div style={{ background: "#FEE2E2", color: "#991B1B", padding: 16, borderRadius: 12 }}>
            {error.message}
          </div>
        )}

        {data && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                {belt && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                      background: belt.hex,
                      color: belt.contrast,
                      padding: "3px 10px",
                      borderRadius: 999,
                      border: belt.needsBorder ? "1px solid rgba(15,23,42,0.10)" : "none",
                    }}
                  >
                    {data.session.belt} Belt
                  </span>
                )}
                <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: 0.4 }}>
                  {data.cohort.name.toUpperCase()} · SESSION {data.session.order}
                </span>
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", margin: "0 0 6px", lineHeight: 1.25 }}>
                {data.session.title}
              </h1>
              <div style={{ fontSize: 13, color: "#64748B" }}>
                {new Date(data.session.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                {" · "}
                {data.session.durationMinutes} min
              </div>
            </div>

            <SessionPlayer session={data.session} />

            <Tabs current={tab} onChange={setTab} session={data.session} />

            <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 22, marginBottom: 20 }}>
              {tab === "overview"  && <OverviewPanel session={data.session} />}
              {tab === "materials" && <MaterialsPanel session={data.session} />}
              {tab === "homework"  && (
                <HomeworkSubmission
                  session={data.session}
                  pending={homework.isPending}
                  onSubmit={(payload) => homework.mutate(payload)}
                />
              )}
            </div>

            <CompletionFooter
              session={data.session}
              onMark={(c) => complete.mutate(c)}
              pending={complete.isPending}
              onNext={() => {
                const next = data.cohort.sessions.find((s) => s.order === data.session.order + 1);
                if (next && next.unlocked) navigate(`/cohort/${slug}/session/${next.order}`);
                else navigate(`/cohort/${slug}`);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Tabs({ current, onChange, session }) {
  const tabs = [
    { id: "overview",  label: "Overview" },
    { id: "materials", label: "Materials" },
    {
      id: "homework",
      label: "Homework",
      badge: session?.homeworkSubmitted ? "✓" : (session?.homework?.prompt ? "•" : null),
    },
  ];
  return (
    <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #E2E8F0", marginBottom: 14 }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "10px 14px", fontSize: 13, fontWeight: 700,
            color: current === t.id ? "#2563EB" : "#64748B",
            borderBottom: current === t.id ? "2px solid #2563EB" : "2px solid transparent",
            marginBottom: -1,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          {t.label}
          {t.badge === "✓" && (
            <span style={{
              fontSize: 10, fontWeight: 800, background: "#ECFDF5",
              color: "#047857", padding: "2px 6px", borderRadius: 999,
              border: "1px solid #A7F3D0",
            }}>
              ✓
            </span>
          )}
          {t.badge === "•" && (
            <span style={{
              width: 6, height: 6, borderRadius: "50%", background: "#F97316",
              display: "inline-block",
            }} />
          )}
        </button>
      ))}
    </div>
  );
}

function OverviewPanel({ session }) {
  return (
    <>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: 0.4, marginBottom: 6 }}>
        WHAT THIS SESSION COVERS
      </div>
      <p style={{ fontSize: 15, color: "#334155", lineHeight: 1.65, margin: "0 0 18px" }}>
        {session.summary}
      </p>
      {session.objectives?.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: 0.4, marginBottom: 6 }}>
            BY THE END, YOU'LL
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, color: "#334155", fontSize: 14, lineHeight: 1.7 }}>
            {session.objectives.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function MaterialsPanel({ session }) {
  if (!session.materials?.length) {
    return <div style={{ color: "#64748B", fontSize: 14 }}>No materials posted yet.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {session.materials.map((m, i) => (
        <a
          key={i}
          href={m.url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px", border: "1px solid #E2E8F0", borderRadius: 10,
            textDecoration: "none", color: "#0F172A", background: "#F8FAFC",
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: "#EFF6FF",
            color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, flexShrink: 0,
          }}>
            {m.type === "pdf" ? "PDF" : m.type === "doc" ? "DOC" : "↓"}
          </div>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{m.label}</div>
          <div style={{ color: "#2563EB", fontSize: 12, fontWeight: 700 }}>Open →</div>
        </a>
      ))}
    </div>
  );
}

function CompletionFooter({ session, onMark, pending, onNext }) {
  return (
    <div
      style={{
        background: session.completed ? "#ECFDF5" : "#EFF6FF",
        border: `1px solid ${session.completed ? "#A7F3D0" : "#BFDBFE"}`,
        borderRadius: 14,
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div style={{ fontSize: 22 }}>{session.completed ? "✅" : "🎯"}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", marginBottom: 2 }}>
          {session.completed ? "Marked complete" : "Done with this session?"}
        </div>
        <div style={{ fontSize: 13, color: "#475569" }}>
          {session.completed
            ? "Nice work. Don't forget to submit your homework if you haven't already."
            : "Mark it complete to update your progress. You can always un-mark it later."}
        </div>
      </div>
      {session.completed ? (
        <>
          <button onClick={() => onMark(false)} disabled={pending} style={btnSecondary}>
            Un-mark
          </button>
          <button onClick={onNext} style={btnPrimary}>Next session →</button>
        </>
      ) : (
        <button onClick={() => onMark(true)} disabled={pending} style={btnPrimary}>
          {pending ? "Saving…" : "Mark complete"}
        </button>
      )}
    </div>
  );
}

const btnPrimary = {
  background: "#2563EB", color: "#fff", border: "none",
  padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
  cursor: "pointer", whiteSpace: "nowrap",
};

const btnSecondary = {
  background: "#fff", color: "#475569", border: "1px solid #CBD5E1",
  padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700,
  cursor: "pointer", whiteSpace: "nowrap",
};
