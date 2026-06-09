import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookCheck, ExternalLink, ArrowRight, ListChecks, Search, Paperclip,
  Check, Clock, ChevronDown, ChevronUp, RotateCcw, Send, Loader2, Eye,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useScopeFilters } from "../../lib/useScopeFilters";
import { getAllCohortsForAdmin } from "../../lib/cohortAdmin";
import { MOCK_SESSIONS, BELT_COLORS } from "../../lib/mockCohort";
import {
  getHomeworkRows,
  markHomeworkReviewed,
  unmarkHomeworkReviewed,
  getParticipantById,
} from "../../lib/adminMockData";
import ScopeFilterBar from "../../components/admin/ScopeFilterBar";
import SelectChip from "../../components/admin/SelectChip";
import Modal from "../../components/admin/Modal";
import SubmissionDetail from "../../components/admin/SubmissionDetail";

// ---------------------------------------------------------------------------
// /admin/homework — homework queue with full review workflow.
//
// Tabs: Pending / Reviewed / All
// Filters: cohort + session + search (participant name/email/text)
// Each row expands to a feedback form. Submit writes via markHomeworkReviewed
// (mock localStorage persistence today).
// ---------------------------------------------------------------------------

const TABS = [
  { key: "pending",  label: "Pending review" },
  { key: "reviewed", label: "Reviewed" },
  { key: "all",      label: "All" },
];

export default function AdminHomeworkQueue() {
  const { user } = useAuth();
  const scope = useScopeFilters(user, getAllCohortsForAdmin());
  const { cohorts, effectiveSlugs: cohortSlugs, orgs, facilitators } = scope;

  const cohortBySlug = useMemo(
    () => Object.fromEntries(cohorts.map((c) => [c.slug, c])),
    [cohorts],
  );
  const sessionByOrder = useMemo(
    () => Object.fromEntries(MOCK_SESSIONS.map((s) => [s.order, s])),
    [],
  );

  // Page-local filters (session + search + tab + expanded row + version).
  const [tab, setTab] = useState("pending");
  const [sessionFilter, setSessionFilter] = useState(null);
  const [q, setQ] = useState("");
  const [expandedKey, setExpandedKey] = useState(null);
  const [version, setVersion] = useState(0);
  // Click-to-view modal for the full submission.
  const [openRow, setOpenRow] = useState(null);
  const openSession = openRow ? sessionByOrder[openRow.sessionOrder] : null;
  const openBelt = openSession ? BELT_COLORS[openSession.belt] : null;
  const openParticipant = openRow ? getParticipantById(openRow.participantId) : null;

  const rows = useMemo(() => {
    const all = getHomeworkRows(cohortSlugs, tab);
    const lc = q.trim().toLowerCase();
    return all
      .filter((r) => !sessionFilter || r.sessionOrder === sessionFilter)
      .filter((r) => {
        if (!lc) return true;
        return (
          r.participantName.toLowerCase().includes(lc) ||
          r.participantEmail.toLowerCase().includes(lc) ||
          (r.response || "").toLowerCase().includes(lc)
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, sessionFilter, q, version, cohortSlugs.join(",")]);

  // Counts per tab for the chips.
  const counts = useMemo(() => ({
    pending: getHomeworkRows(cohortSlugs, "pending").length,
    reviewed: getHomeworkRows(cohortSlugs, "reviewed").length,
    all: getHomeworkRows(cohortSlugs, "all").length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [version, cohortSlugs.join(",")]);

  const usedSessions = Array.from(
    new Set(getHomeworkRows(cohortSlugs, "all").map((r) => r.sessionOrder)),
  ).sort((a, b) => a - b);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <header className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
          <ListChecks className="w-5 h-5" strokeWidth={2} />
        </div>
        <div>
          <h1 className="font-heading text-[24px] lg:text-[28px] font-extrabold text-ink leading-tight">
            Homework queue
          </h1>
          <p className="text-[13px] text-ink-muted mt-0.5">
            Pending {counts.pending} · Reviewed {counts.reviewed} · Total {counts.all}
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setTab(t.key); setExpandedKey(null); }}
            className={
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12.5px] font-heading font-semibold transition-all duration-200 " +
              (tab === t.key
                ? "bg-ink text-white"
                : "bg-surface-card border border-soft text-ink-muted hover:text-ink hover:border-brand-500")
            }
          >
            {t.label}
            <span className={
              "inline-flex items-center justify-center min-w-[18px] px-1 rounded-full text-[10.5px] font-bold " +
              (tab === t.key ? "bg-white/15 text-white" : "bg-ink/5 text-ink-muted")
            }>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Scope filter — Org × Cohort × Facilitator */}
      <ScopeFilterBar
        cohorts={cohorts}
        orgs={orgs}
        facilitators={facilitators}
        orgFilter={scope.orgFilter}
        cohortFilter={scope.cohortFilter}
        facilitatorFilter={scope.facilitatorFilter}
        setOrgFilter={scope.setOrgFilter}
        setCohortFilter={scope.setCohortFilter}
        setFacilitatorFilter={scope.setFacilitatorFilter}
      />

      {/* Session-specific filter + search (page-local) */}
      <div className="flex items-center gap-3 flex-wrap">
        <SelectChip
          label="Session"
          value={sessionFilter}
          onChange={(v) => setSessionFilter(v === null ? null : Number(v))}
          active={sessionFilter !== null}
          options={[
            { value: null, label: "All sessions" },
            ...usedSessions.map((n) => ({
              value: n,
              label: `Session ${n} · ${sessionByOrder[n]?.belt || ""}`,
            })),
          ]}
        />
        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle pointer-events-none" strokeWidth={2} />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, or submission text…"
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-soft bg-surface-card text-ink text-[13.5px] font-body placeholder:text-ink-subtle focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
          />
        </div>
      </div>

      {/* Rows */}
      {rows.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const session = sessionByOrder[row.sessionOrder];
            const belt = session ? BELT_COLORS[session.belt] : null;
            const cohort = cohortBySlug[row.cohortSlug];
            const key = `${row.participantId}::${row.sessionOrder}`;
            const reviewed = !!row.reviewedAt;
            return (
              <SubmissionCard
                key={key}
                row={row}
                session={session}
                belt={belt}
                cohort={cohort}
                reviewed={reviewed}
                expanded={expandedKey === key}
                onToggle={() => setExpandedKey(expandedKey === key ? null : key)}
                onView={() => setOpenRow(row)}
                onWrite={() => setVersion((v) => v + 1)}
              />
            );
          })}
        </div>
      )}

      {/* Click-to-view modal — full submission inside an overlay. We pass
          `showHomeworkQueueLink={false}` because we're already here, and the
          participant context unlocks the "View participant profile" CTA. */}
      <Modal open={!!openRow} onClose={() => setOpenRow(null)}>
        {openRow && (
          <SubmissionDetail
            submission={openRow}
            session={openSession}
            belt={openBelt}
            participantName={openRow.participantName}
            participant={openParticipant}
            showHomeworkQueueLink={false}
            onClose={() => setOpenRow(null)}
          />
        )}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SubmissionCard — collapsed view + expanded feedback form
// ---------------------------------------------------------------------------
function SubmissionCard({ row, session, belt, cohort, reviewed, expanded, onToggle, onView, onWrite }) {
  const [feedback, setFeedback] = useState(row.feedback || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    // Tiny artificial latency so the spinner is visible.
    await new Promise((r) => setTimeout(r, 350));
    markHomeworkReviewed(row.participantId, row.sessionOrder, feedback);
    setSaving(false);
    onWrite();
  }

  function handleReopen() {
    unmarkHomeworkReviewed(row.participantId, row.sessionOrder);
    setFeedback("");
    onWrite();
  }

  return (
    <article className="rounded-2xl bg-surface-card border border-soft hover:shadow-card transition-shadow overflow-hidden">
      {/* Header row — always visible */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-brand-700 text-white flex items-center justify-center text-[12px] font-heading font-bold shrink-0">
              {row.participantName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
            </div>
            <div className="min-w-0">
              <Link
                to={`/admin/users/${row.participantId}`}
                className="font-heading font-bold text-ink text-[14.5px] hover:text-brand-700 transition-colors block truncate"
              >
                {row.participantName}
              </Link>
              <div className="text-[11.5px] text-ink-muted truncate">
                {row.participantEmail} · {cohort?.organization?.shortName || ""}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {session && belt && (
              <div
                style={{
                  background: belt.gradient,
                  color: belt.contrast,
                  border: belt.needsBorder ? "1px solid #D1D5DB" : "none",
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-heading font-bold tracking-wide"
              >
                Session {row.sessionOrder} · {session.belt}
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
              {reviewed ? "Reviewed" : "Pending"}
            </span>
          </div>
        </div>

        {/* Submission excerpt */}
        <p className="mt-4 text-[13.5px] text-ink leading-relaxed">{row.response}</p>

        {/* Existing feedback (collapsed view) */}
        {reviewed && row.feedback && !expanded && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50/40 border border-emerald-100">
            <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-emerald-700 mb-1">
              Your feedback
            </div>
            <p className="text-[13px] text-ink leading-relaxed">{row.feedback}</p>
          </div>
        )}

        {/* Footer — link + submitted ago + actions */}
        <div className="mt-4 pt-4 border-t border-soft flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 text-[11.5px] text-ink-muted">
            <span>Submitted {timeAgo(row.submittedAt)}</span>
            {reviewed && <span>· Reviewed {timeAgo(row.reviewedAt)}</span>}
            {row.link && (
              <a
                href={row.link}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 font-heading font-semibold text-brand-600 hover:text-brand-700"
              >
                <ExternalLink className="w-3 h-3" strokeWidth={2.5} />
                Open submission
              </a>
            )}
            {row.attachment?.dataUrl && (
              <a
                href={row.attachment.dataUrl}
                download={row.attachment.name}
                className="inline-flex items-center gap-1 font-heading font-semibold text-brand-600 hover:text-brand-700"
              >
                <Paperclip className="w-3 h-3" strokeWidth={2.5} />
                {row.attachment.name}
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onView}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-heading font-semibold text-ink-muted hover:text-ink hover:bg-surface-soft transition-colors"
            >
              <Eye className="w-3.5 h-3.5" strokeWidth={2.5} />
              View
            </button>
            {reviewed ? (
              <button
                onClick={handleReopen}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-heading font-semibold text-ink-muted hover:text-ink hover:bg-surface-soft transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.5} />
                Reopen
              </button>
            ) : null}
            <button
              onClick={onToggle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink text-white text-[12px] font-heading font-semibold hover:bg-brand-700 transition-colors"
            >
              {expanded
                ? <>Close <ChevronUp className="w-3.5 h-3.5" strokeWidth={2.5} /></>
                : <>{reviewed ? "Edit feedback" : "Review"} <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} /></>}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded feedback form */}
      {expanded && (
        <div className="border-t border-soft p-5 bg-surface-soft/40 space-y-3 animate-fade-in-up">
          <label className="block">
            <span className="block text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
              Facilitator feedback
            </span>
            <textarea
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What's working? What's the one nudge that would unlock the next belt for them?"
              className="w-full px-4 py-3 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body placeholder:text-ink-subtle focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 resize-y leading-relaxed"
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onToggle}
              className="px-3 py-2 rounded-lg text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink hover:bg-ink/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-heading font-semibold transition-all duration-200 " +
                (saving
                  ? "bg-brand-600/70 text-white cursor-wait"
                  : "bg-brand-600 text-white hover:bg-brand-700")
              }
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.5} />
                  Saving…
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {reviewed ? "Update feedback" : "Mark reviewed & send"}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function EmptyState({ tab }) {
  const copy = tab === "reviewed"
    ? { headline: "No reviews yet.", body: "Once you mark submissions reviewed, they land here as a feedback archive." }
    : tab === "all"
      ? { headline: "Nothing submitted yet.", body: "Once participants submit homework, you'll see every submission here." }
      : { headline: "All caught up.", body: "No submissions waiting for review." };
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-10 text-center">
      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
        <BookCheck className="w-6 h-6" strokeWidth={2} />
      </div>
      <h2 className="font-heading text-[16px] font-extrabold text-ink">{copy.headline}</h2>
      <p className="text-[13px] text-ink-muted mt-1">{copy.body}</p>
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}
