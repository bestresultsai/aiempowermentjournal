import { useMemo, useState } from "react";
import {
  Mail, Eye, Code, Send, Copy, CheckCheck, Trash2, FileText, GitBranch,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { TEMPLATES, renderTemplate } from "../../lib/emailTemplates";
import { sendEmail, useSentLog, clearSentLog } from "../../lib/mailer";
import EmailWorkflowDiagram from "../../components/admin/EmailWorkflowDiagram";

// ---------------------------------------------------------------------------
// /admin/emails — preview every transactional template the platform sends.
//
// Layout:
//   Left  · sidebar of templates grouped by audience
//   Right · selected template renders in HTML and text panes
//   Top   · "Send test to me" + recent-sent log
//
// Production swap: when the mailer swaps to SendGrid in #399, "Send test"
// hits the real provider and an Admin-only audit log replaces the local
// sent log here.
// ---------------------------------------------------------------------------

const AUDIENCE_LABEL = {
  participant: "Participant",
  facilitator: "Facilitator",
  leader: "Cohort leader",
  "org-admin": "Org admin",
};

export default function AdminEmails() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState(TEMPLATES[0]?.id);
  const [view, setView] = useState("html"); // html | text
  // Top-level tab — "templates" (preview each template) or "workflow"
  // (lifecycle diagram showing when each fires).
  const [mode, setMode] = useState("templates");
  const [justCopied, setJustCopied] = useState(false);
  const [justSent, setJustSent] = useState(false);

  const tpl = useMemo(() => TEMPLATES.find((t) => t.id === selectedId), [selectedId]);
  const rendered = useMemo(
    () => (tpl ? renderTemplate(tpl.id, tpl.sampleData) : null),
    [tpl],
  );

  const grouped = useMemo(() => {
    const g = new Map();
    for (const t of TEMPLATES) {
      const key = t.audience;
      if (!g.has(key)) g.set(key, []);
      g.get(key).push(t);
    }
    return Array.from(g.entries());
  }, []);

  const sentLog = useSentLog();

  async function handleSendTest() {
    if (!tpl || !user?.email) return;
    await sendEmail({
      template: tpl.id,
      to: { email: user.email, name: user.name || "" },
      data: tpl.sampleData,
    });
    setJustSent(true);
    setTimeout(() => setJustSent(false), 2500);
  }

  function handleCopy(text) {
    try {
      navigator.clipboard.writeText(text);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <header className="flex items-start gap-3 flex-wrap">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
          <Mail className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-eyebrow">Admin · Emails</div>
          <h1 className="font-heading text-[28px] lg:text-[34px] font-extrabold tracking-tight text-ink leading-tight">
            Email templates
          </h1>
          <p className="text-[14px] text-ink-muted mt-1.5 max-w-2xl">
            {TEMPLATES.length} transactional emails the platform sends. Pick
            one to preview it rendered against sample data. Real sending
            happens once the production backend is wired (#399); for now this
            page is the source of truth for what each email looks like.
          </p>
        </div>
      </header>

      {/* Top-level tabs */}
      <div className="inline-flex items-center bg-surface-soft rounded-xl p-1 border border-soft">
        <ModeTab
          active={mode === "templates"}
          onClick={() => setMode("templates")}
          icon={Mail}
          label="Templates"
        />
        <ModeTab
          active={mode === "workflow"}
          onClick={() => setMode("workflow")}
          icon={GitBranch}
          label="Workflow"
        />
      </div>

      {mode === "workflow" && (
        <EmailWorkflowDiagram
          templates={TEMPLATES}
          onPreviewTemplate={(id) => {
            setSelectedId(id);
            setMode("templates");
          }}
        />
      )}

      {mode === "templates" && (
      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar — template list grouped by audience */}
        <aside className="space-y-5">
          {grouped.map(([audience, items]) => (
            <div key={audience}>
              <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted mb-2">
                {AUDIENCE_LABEL[audience] || audience} · {items.length}
              </div>
              <ul className="space-y-1.5">
                {items.map((t) => {
                  const active = t.id === selectedId;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(t.id)}
                        className={
                          "w-full text-left rounded-xl border px-3 py-2.5 transition-colors " +
                          (active
                            ? "border-ink bg-ink text-white"
                            : "border-soft bg-surface-card text-ink hover:bg-surface-soft")
                        }
                      >
                        <div className="font-heading font-bold text-[13px] truncate">
                          {t.label}
                        </div>
                        <div className={"text-[11px] truncate mt-0.5 " + (active ? "text-white/70" : "text-ink-muted")}>
                          {t.id}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </aside>

        {/* Right pane — preview */}
        <section className="space-y-4 min-w-0">
          {tpl && rendered ? (
            <>
              {/* Meta + actions */}
              <div className="rounded-2xl bg-surface-card border border-soft p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted mb-1">
                      {AUDIENCE_LABEL[tpl.audience]} · {tpl.id}
                    </div>
                    <h2 className="font-heading text-[19px] font-extrabold text-ink leading-tight">
                      {tpl.label}
                    </h2>
                    <p className="text-[12.5px] text-ink-muted mt-1">{tpl.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleCopy(rendered.subject)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-soft bg-white text-[12px] font-heading font-semibold text-ink hover:bg-surface-soft"
                    >
                      <Copy className="w-3 h-3" strokeWidth={2.5} />
                      Copy subject
                    </button>
                    <button
                      onClick={handleSendTest}
                      disabled={!user?.email}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink text-white text-[12px] font-heading font-bold hover:bg-ink/90 disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" strokeWidth={2.5} />
                      Send test to me
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-soft grid sm:grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-[13px]">
                  <span className="text-ink-muted font-heading font-semibold">Subject</span>
                  <span className="text-ink font-heading font-bold">{rendered.subject}</span>
                  <span className="text-ink-muted font-heading font-semibold">Preview text</span>
                  <span className="text-ink">{rendered.preview}</span>
                </div>

                {justSent && (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-heading font-semibold text-emerald-700">
                    <CheckCheck className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Test queued — see the log below.
                  </div>
                )}
                {justCopied && (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-heading font-semibold text-brand-700">
                    <CheckCheck className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Copied.
                  </div>
                )}
              </div>

              {/* HTML / Text toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                <ToggleButton active={view === "html"} onClick={() => setView("html")} icon={Eye} label="Rendered" />
                <ToggleButton active={view === "text"} onClick={() => setView("text")} icon={Code} label="Plain text" />
              </div>

              {/* Body */}
              {view === "html" ? (
                <div className="rounded-2xl border border-soft overflow-hidden bg-surface-paper">
                  <iframe
                    title="Email preview"
                    srcDoc={rendered.html}
                    className="w-full h-[700px] bg-white"
                    sandbox=""
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-soft bg-surface-card p-5">
                  <pre className="whitespace-pre-wrap text-[13px] font-mono text-ink leading-relaxed">
                    {rendered.text}
                  </pre>
                </div>
              )}

              {/* Sent log */}
              <div className="rounded-2xl border border-soft bg-surface-card p-5">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <h3 className="font-heading text-[14px] font-bold text-ink inline-flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-ink-muted" strokeWidth={2.5} />
                    Recent sends · {sentLog.length}
                  </h3>
                  {sentLog.length > 0 && (
                    <button
                      onClick={clearSentLog}
                      className="inline-flex items-center gap-1 text-[11.5px] font-heading font-semibold text-ink-muted hover:text-rose-700"
                    >
                      <Trash2 className="w-3 h-3" strokeWidth={2.5} />
                      Clear log
                    </button>
                  )}
                </div>
                {sentLog.length === 0 ? (
                  <p className="text-[12.5px] text-ink-muted">
                    No emails sent yet. Real production sends land here as they go out — no manual refresh needed.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {sentLog.map((entry) => {
                      const isFailed = entry.status === "failed";
                      const isQueued = entry.status === "queued";
                      return (
                        <li
                          key={entry.id}
                          className={
                            "rounded-lg border px-3 py-2 text-[12.5px] " +
                            (isFailed
                              ? "border-rose-200 bg-rose-50/60"
                              : isQueued
                                ? "border-amber-200 bg-amber-50/60"
                                : "border-soft bg-surface-soft/40")
                          }
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="font-heading font-semibold text-ink truncate flex-1 min-w-0">
                              {entry.subject}
                            </div>
                            {entry.status && entry.status !== "sent" && (
                              <span
                                className={
                                  "text-[10px] font-heading font-bold uppercase tracking-wider px-1.5 py-0.5 rounded " +
                                  (isFailed
                                    ? "bg-rose-600 text-white"
                                    : "bg-amber-600 text-white")
                                }
                              >
                                {entry.status}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-ink-muted mt-0.5">
                            {entry.template} → {entry.to.email} ·{" "}
                            {entry.sentAt
                              ? new Date(entry.sentAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                              : "pending"}
                          </div>
                          {isFailed && entry.error && (
                            <div className="text-[11px] text-rose-700 mt-1 break-words">
                              {entry.error}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-soft bg-surface-card p-10 text-center text-[14px] text-ink-muted">
              Pick a template from the sidebar to preview it.
            </div>
          )}
        </section>
      </div>
      )}
    </div>
  );
}

function ModeTab({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-heading font-semibold text-[13px] transition-all duration-200 " +
        (active
          ? "bg-surface-card text-ink shadow-sm"
          : "text-ink-muted hover:text-ink")
      }
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
      {label}
    </button>
  );
}

function ToggleButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-heading font-semibold transition-colors " +
        (active
          ? "bg-ink text-white border-ink"
          : "bg-surface-card text-ink-muted border-soft hover:text-ink")
      }
    >
      <Icon className="w-3 h-3" strokeWidth={2.5} />
      {label}
    </button>
  );
}
