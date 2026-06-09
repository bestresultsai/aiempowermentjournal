import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Mail, Building2, BookCheck, Check, Clock, GraduationCap,
  ExternalLink, NotebookPen, Sparkles, Lightbulb, Target, Lock, Save, Crown,
  AlertTriangle, X, Download, MessageSquare, Paperclip, Zap, Camera, MapPin, Globe,
} from "lucide-react";
import { formatLocation } from "../../lib/locationToTimeZone";
import { useAuth } from "../../context/AuthContext";
import { getAccessibleCohortSlugs } from "../../lib/adminRoles";
import { getAllCohortsForAdmin } from "../../lib/cohortAdmin";
import { MOCK_SESSIONS, BELT_COLORS } from "../../lib/mockCohort";
import { getSessionsCountForCohort } from "../../lib/programs";
import Modal from "../../components/admin/Modal";
import JournalEntryDetail from "../../components/admin/JournalEntryDetail";
import SubmissionDetail from "../../components/admin/SubmissionDetail";
import { getProductionMethod, leveragePerWeek } from "../../lib/journalConstants";
import {
  getParticipantById,
  getSubmissionsForParticipant,
  getJournalEntriesForParticipant,
  getFacilitatorNote,
  setFacilitatorNote,
  setParticipantCapabilities,
  setParticipantHeadshot,
  totalTimeSaved,
  timeSavedFor,
  formatMinutes,
} from "../../lib/adminMockData";
import { canAssignRoles } from "../../lib/adminRoles";
import HeadshotUpload from "../../components/HeadshotUpload";

// /admin/users/:id — drill-in on a single participant.
// Read-only this round.
export default function AdminParticipantDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const p = getParticipantById(id);

  // Scope check — the participant must belong to a cohort the admin can see.
  const allowedSlugs = getAccessibleCohortSlugs(user, getAllCohortsForAdmin());
  if (!p || !allowedSlugs.includes(p.cohortSlug)) {
    return <Navigate to="/admin" replace />;
  }

  const cohort = getAllCohortsForAdmin().find((c) => c.slug === p.cohortSlug);
  const submissions = getSubmissionsForParticipant(id);
  const journalEntries = getJournalEntriesForParticipant(id);
  const submittedCount = submissions.length;
  const reviewedCount = submissions.filter((s) => s.reviewedAt).length;
  const completedCount = p.progress?.length || 0;
  const minutesSaved = totalTimeSaved(journalEntries);
  const initials = p.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  // At-risk flag — combined signal that mirrors the Participants list.
  const isStale = (p.lastJournalDaysAgo ?? 0) > 10;
  const isBehind = (p.progress?.length || 0) <= 2;
  const atRisk = isStale || isBehind;

  // Modal state for click-to-view on journal entries + homework submissions.
  const [openEntry, setOpenEntry] = useState(null);
  const [openSubmission, setOpenSubmission] = useState(null);

  return (
    <div className="space-y-7 animate-fade-in-up">
      {/* Back */}
      <Link
        to={`/admin/cohorts/${p.cohortSlug}`}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
        Back to {cohort?.name || "cohort"}
      </Link>

      {/* Profile header */}
      <header className="rounded-2xl bg-surface-card border border-soft p-6 flex items-start gap-5 flex-wrap">
        <ParticipantHeadshot participant={p} initials={initials} />
        <div className="flex-1 min-w-[200px]">
          <h1 className="font-heading text-[24px] lg:text-[28px] font-extrabold text-ink leading-tight inline-flex items-center gap-2 flex-wrap">
            {p.name}
            {p.isCohortLead && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-heading font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                <Crown className="w-3 h-3" strokeWidth={2.5} />
                Cohort Leader
              </span>
            )}
            {atRisk && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-heading font-bold uppercase tracking-wider bg-red-50 text-red-700">
                <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />
                At risk
              </span>
            )}
          </h1>
          <div className="text-[13px] text-ink-muted mt-0.5">{p.title}</div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" strokeWidth={2.25} />
              {p.email}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" strokeWidth={2.25} />
              {p.organization}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" strokeWidth={2.25} />
              {cohort?.name || p.cohortSlug}
            </span>
            {formatLocation(p.location || {}) && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" strokeWidth={2.25} />
                {formatLocation(p.location || {})}
              </span>
            )}
            {p.defaultTimeZone && (
              <span className="inline-flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" strokeWidth={2.25} />
                {p.defaultTimeZone}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Why they're here — onboarding payload from /welcome wizard.
          Highest-leverage 1:1 prep material; surfaces the participant's own
          words about goals + motivation. */}
      {(p.whyAi || p.mainGoal) && (
        <section className="rounded-2xl bg-gradient-to-br from-brand-50/60 to-surface-card border border-brand-100 p-5">
          <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-brand-700 mb-3">
            Why they're here
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {p.whyAi && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-4.5 h-4.5" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-heading font-bold uppercase tracking-wider text-brand-700/80 mb-1">
                    Their "why"
                  </div>
                  <p className="text-[13.5px] text-ink leading-relaxed">{p.whyAi}</p>
                </div>
              </div>
            )}
            {p.mainGoal && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                  <Target className="w-4.5 h-4.5" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-heading font-bold uppercase tracking-wider text-brand-700/80 mb-1">
                    Main goal
                  </div>
                  <p className="text-[13.5px] text-ink leading-relaxed">{p.mainGoal}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Facilitator notes — private to admins, persisted locally for now */}
      <FacilitatorNotes participantId={p.id} participantName={p.name} />

      {/* Capabilities — super + admin can grant extra roles to this user. */}
      <ParticipantCapabilities participant={p} />

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SmallKpi label="Sessions complete" value={`${completedCount}/${getSessionsCountForCohort(cohort) || MOCK_SESSIONS.length}`} />
        <SmallKpi label="Homework submitted" value={submittedCount} sub={`${reviewedCount} reviewed`} />
        <SmallKpi label="Journal entries" value={journalEntries.length} accent="emerald" />
        <SmallKpi label="Hours saved" value={Math.round(minutesSaved / 60)} accent="emerald" sub={formatMinutes(minutesSaved)} />
      </div>

      {/* Belt progress */}
      <section>
        <h2 className="font-heading text-[16px] font-extrabold text-ink mb-3">Belt progress</h2>
        <div className="rounded-2xl bg-surface-card border border-soft p-5">
          <div className="flex items-center gap-2 flex-wrap">
            {MOCK_SESSIONS.map((s) => {
              const done = p.progress?.includes(s.order);
              const belt = BELT_COLORS[s.belt];
              return (
                <div
                  key={s.order}
                  title={s.title}
                  style={{
                    background: done ? belt.gradient : "#F3F4F6",
                    color: done ? belt.contrast : "#9CA3AF",
                    border: done && belt.needsBorder ? "1px solid #D1D5DB" : "none",
                  }}
                  className="h-12 flex-1 min-w-[90px] rounded-xl flex flex-col items-center justify-center font-heading font-bold transition-all"
                >
                  <span className="text-[10px] uppercase tracking-wider opacity-80">{s.belt}</span>
                  <span className="text-[15px] mt-0.5">
                    {done ? <Check className="w-4 h-4 inline" strokeWidth={3} /> : s.order}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI Journal entries */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-[16px] font-extrabold text-ink inline-flex items-center gap-2">
            <NotebookPen className="w-4 h-4 text-emerald-700" strokeWidth={2.25} />
            AI Journal entries
          </h2>
          {journalEntries.length > 0 && (
            <span className="text-[12px] font-heading font-semibold text-emerald-700">
              {formatMinutes(minutesSaved)} saved across {journalEntries.length} {journalEntries.length === 1 ? "entry" : "entries"}
            </span>
          )}
        </div>
        {journalEntries.length === 0 ? (
          <div className="rounded-2xl bg-surface-card border border-soft p-6 text-center text-[13px] text-ink-muted">
            No journal entries logged yet.
          </div>
        ) : (
          <div className="space-y-3">
            {journalEntries.map((e) => {
              const saved = timeSavedFor(e);
              const method = getProductionMethod(e.productionMethod);
              const leverage = leveragePerWeek(e);
              return (
                <button
                  type="button"
                  key={e.id}
                  onClick={() => setOpenEntry(e)}
                  className="block w-full text-left rounded-2xl bg-surface-card border border-soft p-5 hover:border-brand-500 hover:shadow-card transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[11px] text-ink-muted font-heading">
                          {dateLabel(e.date)}
                        </span>
                        {method && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-heading font-bold ${method.chipBg} ${method.chipText}`}>
                            {method.short}
                          </span>
                        )}
                      </div>
                      <h3 className="font-heading font-bold text-ink text-[14.5px] leading-snug">
                        {e.title}
                      </h3>
                    </div>
                    <div className="shrink-0 flex items-center gap-2 flex-wrap justify-end">
                      {leverage > 0 && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-[11px] font-heading font-bold">
                          <Zap className="w-3 h-3" strokeWidth={3} />
                          {formatMinutes(leverage)}/wk
                        </div>
                      )}
                      {saved > 0 && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-heading font-bold">
                          <Sparkles className="w-3 h-3" strokeWidth={3} />
                          {formatMinutes(saved)} saved
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-[13.5px] text-ink leading-relaxed">{e.description}</p>
                  {(e.timeBeforeAI > 0 || e.timeWithAI > 0) && (
                    <div className="mt-3 flex items-center gap-4 text-[11.5px] text-ink-muted font-heading">
                      <span>
                        <span className="text-ink-subtle">Before AI:</span>{" "}
                        <span className="font-semibold text-ink">{formatMinutes(e.timeBeforeAI)}</span>
                      </span>
                      <span>
                        <span className="text-ink-subtle">With AI:</span>{" "}
                        <span className="font-semibold text-ink">{formatMinutes(e.timeWithAI)}</span>
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Homework submissions */}
      <section>
        <h2 className="font-heading text-[16px] font-extrabold text-ink mb-3">
          Homework submissions
        </h2>
        {submissions.length === 0 ? (
          <div className="rounded-2xl bg-surface-card border border-soft p-6 text-center text-[13px] text-ink-muted">
            No homework submitted yet.
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((s) => {
              const session = MOCK_SESSIONS.find((sess) => sess.order === s.order);
              const belt = session ? BELT_COLORS[session.belt] : null;
              const reviewed = !!s.reviewedAt;
              return (
                <button
                  type="button"
                  key={s.order}
                  onClick={() => setOpenSubmission({ submission: s, session, belt })}
                  className="block w-full text-left"
                >
                <article
                  className="rounded-2xl bg-surface-card border border-soft p-5 hover:border-brand-500 hover:shadow-card transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      {belt && (
                        <div
                          style={{
                            background: belt.gradient,
                            color: belt.contrast,
                            border: belt.needsBorder ? "1px solid #D1D5DB" : "none",
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-heading font-bold"
                        >
                          Session {s.order} · {session.belt}
                        </div>
                      )}
                      <span
                        className={
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-heading font-semibold " +
                          (reviewed
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700")
                        }
                      >
                        {reviewed ? <Check className="w-3 h-3" strokeWidth={3} /> : <Clock className="w-3 h-3" strokeWidth={3} />}
                        {reviewed ? "Reviewed" : "Pending review"}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-ink-muted">
                      Submitted {timeAgo(s.submittedAt)}
                    </div>
                  </div>
                  <p className="mt-3 text-[13.5px] text-ink leading-relaxed line-clamp-3">{s.response}</p>
                  {/* Affordances live in the modal — keep card non-nested-interactive */}
                  <div className="mt-3 flex items-center gap-3 text-[11.5px] text-ink-muted">
                    {s.link && (
                      <span className="inline-flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" strokeWidth={2.5} />
                        Link attached
                      </span>
                    )}
                    {s.attachment?.dataUrl && (
                      <span className="inline-flex items-center gap-1">
                        <Paperclip className="w-3 h-3" strokeWidth={2.5} />
                        {s.attachment.name}
                      </span>
                    )}
                    {s.feedback && (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <MessageSquare className="w-3 h-3" strokeWidth={2.5} />
                        Feedback added
                      </span>
                    )}
                    <span className="ml-auto text-brand-700 font-heading font-semibold">View →</span>
                  </div>
                </article>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Modals — open when a journal entry or homework submission is clicked */}
      <Modal open={!!openEntry} onClose={() => setOpenEntry(null)}>
        {openEntry && <JournalEntryDetail entry={openEntry} onClose={() => setOpenEntry(null)} />}
      </Modal>
      <Modal open={!!openSubmission} onClose={() => setOpenSubmission(null)}>
        {openSubmission && (
          <SubmissionDetail
            submission={openSubmission.submission}
            session={openSubmission.session}
            belt={openSubmission.belt}
            participantName={p.name}
            onClose={() => setOpenSubmission(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function SmallKpi({ label, value, accent, sub }) {
  const isEmerald = accent === "emerald";
  return (
    <div className={
      "rounded-2xl border p-4 " +
      (isEmerald ? "bg-emerald-50/40 border-emerald-100" : "bg-surface-card border-soft")
    }>
      <div className={
        "text-[10.5px] font-heading font-bold uppercase tracking-wider " +
        (isEmerald ? "text-emerald-700/80" : "text-ink-muted")
      }>
        {label}
      </div>
      <div className={
        "mt-1.5 font-heading font-extrabold text-[24px] tracking-tight " +
        (isEmerald ? "text-emerald-900" : "text-ink")
      }>
        {value}
      </div>
      {sub && (
        <div className={
          "text-[11px] mt-1 " +
          (isEmerald ? "text-emerald-700/80" : "text-ink-muted")
        }>
          {sub}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ParticipantCapabilities — Super + Admin can grant a participant additional
// roles (cohort leader, facilitator, admin, org). Reflects to the Super Admin
// directory so the chips update on save.
//
// Participant + Cohort Leader are derived from the record itself
// (isCohortLead). Everything else lives in participant.capabilities[].
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// ParticipantHeadshot — avatar with a "Change photo" toggle for super/admin.
// Clicking the avatar opens the HeadshotUpload inline. Non-privileged admins
// just see the static avatar.
// ---------------------------------------------------------------------------
function ParticipantHeadshot({ participant, initials }) {
  const { user } = useAuth();
  const canEdit = canAssignRoles(user);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(participant.headshotUrl || "");

  function handleChange(url) {
    setValue(url || "");
    setParticipantHeadshot(participant.id, url);
    participant.headshotUrl = url || null;
  }

  if (!editing) {
    return (
      <div className="relative group">
        {value ? (
          <img
            src={value}
            alt={participant.name}
            className="w-20 h-20 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-brand-700 text-white flex items-center justify-center text-[24px] font-heading font-extrabold shrink-0">
            {initials}
          </div>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-ink text-white inline-flex items-center justify-center shadow-md hover:bg-brand-700 transition-colors"
            aria-label="Change photo"
            title="Change photo"
          >
            <Camera className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-brand-50/40 border border-brand-200 p-4 min-w-[280px]">
      <div className="text-[10.5px] font-heading font-semibold tracking-wider uppercase text-brand-700 mb-2">
        Change headshot
      </div>
      <HeadshotUpload
        value={value}
        onChange={handleChange}
        name={participant.name}
        size="lg"
      />
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-soft text-[12px] font-heading font-bold text-ink hover:bg-surface-soft transition-colors"
      >
        Done
      </button>
    </div>
  );
}

function ParticipantCapabilities({ participant }) {
  const { user } = useAuth();
  const canEdit = canAssignRoles(user);

  const [capabilities, setCapabilities] = useState(() => {
    const s = new Set();
    s.add("participant");
    if (participant.isCohortLead) s.add("cohort-leader");
    for (const c of participant.capabilities || []) s.add(c);
    return s;
  });
  const [savedAt, setSavedAt] = useState(null);

  function toggleCap(cap) {
    setCapabilities((prev) => {
      const next = new Set(prev);
      if (next.has(cap)) next.delete(cap);
      else next.add(cap);
      return next;
    });
  }

  function handleSave() {
    setParticipantCapabilities(participant.id, [...capabilities]);
    // Cohort-leader is also a flag on the participant — keep them in sync.
    participant.isCohortLead = capabilities.has("cohort-leader");
    setSavedAt(new Date().toISOString());
  }

  // Read-only view for non-privileged admins.
  if (!canEdit) {
    const chips = [...capabilities];
    return (
      <section className="rounded-2xl bg-surface-card border border-soft p-5">
        <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle mb-2 inline-flex items-center gap-1.5">
          <Lock className="w-3 h-3" strokeWidth={2.5} />
          Capabilities
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {chips.map((c) => (
            <span key={c} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-heading font-bold bg-ink/5 text-ink-muted">
              {c}
            </span>
          ))}
        </div>
        <p className="text-[11.5px] text-ink-muted mt-2">
          Only super and admin users can change capabilities.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-purple-50/40 border border-purple-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Lock className="w-4 h-4 text-purple-700" strokeWidth={2.5} />
        <h2 className="font-heading text-[13px] font-bold uppercase tracking-wider text-purple-700">
          Capabilities
        </h2>
        {savedAt && (
          <span className="text-[11.5px] text-emerald-700 inline-flex items-center gap-1">
            <Check className="w-3 h-3" strokeWidth={3} />
            Saved
          </span>
        )}
      </div>
      <p className="text-[12.5px] text-ink-muted leading-relaxed mb-3 max-w-2xl">
        Grant this user additional roles. Multi-role example: a participant who's also a cohort leader, or a facilitator who's also their org's admin.
      </p>
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {["participant", "cohort-leader", "facilitator", "org", "admin"].map((cap) => {
          const meta = {
            participant:    { label: "Participant" },
            "cohort-leader":{ label: "Cohort Leader" },
            facilitator:    { label: "Facilitator" },
            org:            { label: "Org Admin" },
            admin:          { label: "Admin" },
          }[cap];
          const active = capabilities.has(cap);
          return (
            <button
              key={cap}
              type="button"
              onClick={() => toggleCap(cap)}
              className={
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-heading font-bold transition-colors cursor-pointer " +
                (active
                  ? "bg-purple-600 text-white"
                  : "bg-white border border-soft text-ink-muted hover:text-ink")
              }
            >
              {active && <Check className="w-3 h-3" strokeWidth={3} />}
              {meta.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={handleSave}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 text-white text-[12.5px] font-heading font-bold hover:bg-purple-700 transition-colors"
      >
        <Save className="w-3.5 h-3.5" strokeWidth={2.5} />
        Save capabilities
      </button>
    </section>
  );
}

function FacilitatorNotes({ participantId, participantName }) {
  const [note, setNote] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [saveState, setSaveState] = useState("idle"); // idle | dirty | saving | saved
  const [editing, setEditing] = useState(false);

  // Hydrate on mount and whenever the participant changes.
  useEffect(() => {
    const stored = getFacilitatorNote(participantId);
    setNote(stored?.text || "");
    setUpdatedAt(stored?.updatedAt || null);
    setSaveState("idle");
    setEditing(!stored?.text); // start in editing mode if there's no note yet
  }, [participantId]);

  function handleChange(value) {
    setNote(value);
    setSaveState("dirty");
  }

  function handleSave() {
    setSaveState("saving");
    setTimeout(() => {
      const saved = setFacilitatorNote(participantId, note);
      setUpdatedAt(saved?.updatedAt || null);
      setSaveState("saved");
      setEditing(false);
      setTimeout(() => setSaveState("idle"), 1800);
    }, 250);
  }

  function handleCancel() {
    const stored = getFacilitatorNote(participantId);
    setNote(stored?.text || "");
    setSaveState("idle");
    setEditing(false);
  }

  return (
    <section className="rounded-2xl bg-amber-50/30 border border-amber-100 p-5">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-amber-700" strokeWidth={2.5} />
          <h2 className="font-heading text-[12.5px] font-bold uppercase tracking-wider text-amber-800">
            Facilitator notes
          </h2>
          <span className="text-[11px] text-amber-700/70">· private</span>
        </div>
        {updatedAt && !editing && (
          <span className="text-[11px] text-amber-700/70">Updated {timeAgo(updatedAt)}</span>
        )}
      </div>

      {editing ? (
        <>
          <textarea
            rows={4}
            value={note}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Pre-1:1 notes about ${participantName.split(" ")[0]}. What's blocking them? What to coach next?`}
            className="w-full px-4 py-3 rounded-xl border border-amber-100 bg-white text-ink text-[13.5px] font-body placeholder:text-ink-subtle focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200/50 resize-y leading-relaxed"
          />
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-lg text-[12px] font-heading font-semibold text-ink-muted hover:text-ink hover:bg-amber-100/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saveState === "saving"}
              className={
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-heading font-semibold transition-colors " +
                (saveState === "saving"
                  ? "bg-amber-600/70 text-white cursor-wait"
                  : "bg-amber-700 text-white hover:bg-amber-800")
              }
            >
              {saveState === "saving"
                ? "Saving…"
                : saveState === "saved"
                  ? <><Check className="w-3.5 h-3.5" strokeWidth={2.5} />Saved</>
                  : <><Save className="w-3.5 h-3.5" strokeWidth={2.5} />Save note</>}
            </button>
          </div>
        </>
      ) : (
        <>
          {note ? (
            <p className="text-[13.5px] text-ink leading-relaxed whitespace-pre-wrap">{note}</p>
          ) : (
            <p className="text-[13px] text-amber-700/70 italic">No notes yet.</p>
          )}
          <div className="mt-3 text-right">
            <button
              onClick={() => setEditing(true)}
              className="text-[12px] font-heading font-semibold text-amber-800 hover:text-amber-900 transition-colors"
            >
              {note ? "Edit note →" : "Add a note →"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function timeAgo(iso) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function dateLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
