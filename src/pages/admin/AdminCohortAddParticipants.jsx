import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, UserPlus, Plus, Trash2, Loader2, Check,
  Mail, User as UserIcon, Briefcase, AlertTriangle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { canEditCohort } from "../../lib/adminRoles";
import { getCohortForAdmin } from "../../lib/cohortAdmin";
import { addParticipantsToCohort } from "../../lib/adminMockData";

// ---------------------------------------------------------------------------
// /admin/cohorts/:slug/participants/add — add participants to a cohort.
//
// Two modes:
//   Add one — name + email + title fields, optional org
//   Bulk paste — one email per line; we derive names from emails when possible
//
// Persists to the unified mock store so the new rows show in the roster + on
// journal/homework views automatically.
// ---------------------------------------------------------------------------

export default function AdminCohortAddParticipants() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const cohort = getCohortForAdmin(slug);

  // Gate: must be able to edit this cohort to add participants.
  if (!cohort) return <Navigate to="/admin/cohorts" replace />;
  if (!canEditCohort(user, cohort)) return <Navigate to={`/admin/cohorts/${slug}`} replace />;

  const [mode, setMode] = useState("one");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  // ---- Single mode state ----
  const [single, setSingle] = useState({ email: "", name: "", title: "" });
  function updateSingle(field, value) {
    setSingle((f) => ({ ...f, [field]: value }));
  }

  // ---- Bulk mode state ----
  const [bulkText, setBulkText] = useState("");
  const bulkPreview = useMemo(() => {
    return bulkText
      .split(/[\n,]/)
      .map((line) => line.trim())
      .filter((line) => /\S+@\S+\.\S+/.test(line));
  }, [bulkText]);

  async function handleSubmit(e) {
    e.preventDefault();
    setResult(null);
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      let res;
      if (mode === "one") {
        if (!single.email.trim()) throw new Error("Email is required.");
        res = addParticipantsToCohort(slug, [single]);
      } else {
        if (bulkPreview.length === 0) throw new Error("Paste at least one email.");
        res = addParticipantsToCohort(slug, bulkPreview.map((email) => ({ email })));
      }
      setResult(res);
      // If everything succeeded, return to the roster automatically.
      if (res.skipped.length === 0) {
        setTimeout(() => navigate(`/admin/cohorts/${slug}`), 600);
      } else {
        setSaving(false);
      }
    } catch (err) {
      setResult({ error: err.message });
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[820px] mx-auto space-y-6 animate-fade-in-up">
      <Link
        to={`/admin/cohorts/${slug}`}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
        Back to {cohort.name}
      </Link>

      <header className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
          <UserPlus className="w-5 h-5" strokeWidth={2} />
        </div>
        <div>
          <div className="h-eyebrow">Admin · Cohort</div>
          <h1 className="font-heading text-[26px] lg:text-[30px] font-extrabold tracking-tight text-ink leading-tight">
            Add participants
          </h1>
          <p className="text-[13px] text-ink-muted mt-1">
            Add one person or paste a list. They'll appear in the roster
            immediately. Email invites will be wired up once the auth backend
            ships.
          </p>
        </div>
      </header>

      {/* Mode toggle */}
      <div className="inline-flex items-center gap-0.5 rounded-full bg-ink/5 p-0.5">
        <ModeButton active={mode === "one"} onClick={() => setMode("one")} label="Add one" />
        <ModeButton active={mode === "bulk"} onClick={() => setMode("bulk")} label="Bulk paste" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === "one" ? (
          <section className="rounded-2xl bg-surface-card border border-soft p-5 space-y-4">
            <Field
              label="Email"
              icon={Mail}
              type="email"
              required
              value={single.email}
              onChange={(v) => updateSingle("email", v)}
              placeholder="name@org.com"
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="Full name"
                icon={UserIcon}
                value={single.name}
                onChange={(v) => updateSingle("name", v)}
                placeholder="Auto-derived from email if blank"
              />
              <Field
                label="Role / Title"
                icon={Briefcase}
                value={single.title}
                onChange={(v) => updateSingle("title", v)}
                placeholder="Director of Education"
              />
            </div>
          </section>
        ) : (
          <section className="rounded-2xl bg-surface-card border border-soft p-5 space-y-3">
            <span className="block text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
              Emails (one per line)
            </span>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={8}
              placeholder={"sarah.patel@iahe.org\nmarcus.w@iahe.org\nhannah.r@mayo.edu"}
              className="w-full px-4 py-3 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body placeholder:text-ink-subtle focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 resize-y leading-relaxed"
            />
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[12px] text-ink-muted">
                {bulkPreview.length === 0
                  ? "Paste emails separated by newlines or commas."
                  : `${bulkPreview.length} valid email${bulkPreview.length === 1 ? "" : "s"} detected.`}
              </p>
              {bulkText && (
                <button
                  type="button"
                  onClick={() => setBulkText("")}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11.5px] font-heading font-semibold text-ink-muted hover:text-ink"
                >
                  <Trash2 className="w-3 h-3" strokeWidth={2.5} />
                  Clear
                </button>
              )}
            </div>
          </section>
        )}

        {/* Result */}
        {result?.error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-[13px] font-heading font-medium text-red-700">
            {result.error}
          </div>
        )}
        {result?.added?.length > 0 && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-[13px] text-emerald-800 inline-flex items-center gap-2">
            <Check className="w-4 h-4" strokeWidth={2.5} />
            Added {result.added.length} participant{result.added.length === 1 ? "" : "s"}.
            Redirecting…
          </div>
        )}
        {result?.skipped?.length > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[13px] text-amber-800">
            <div className="inline-flex items-center gap-2 font-heading font-semibold mb-1">
              <AlertTriangle className="w-4 h-4" strokeWidth={2.5} />
              Skipped {result.skipped.length}:
            </div>
            <ul className="list-disc ml-5 text-[12.5px] space-y-0.5">
              {result.skipped.map((s, i) => (
                <li key={i}>{s.email} — {s.reason}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Link
            to={`/admin/cohorts/${slug}`}
            className="px-3 py-2 rounded-xl text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink hover:bg-ink/5 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className={
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-heading font-semibold transition-colors " +
              (saving
                ? "bg-brand-600/70 text-white cursor-wait"
                : "bg-brand-600 text-white hover:bg-brand-700")
            }
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.5} />
                Adding…
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                {mode === "one" ? "Add participant" : `Add ${bulkPreview.length || ""} participants`.trim()}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---- Helpers ----
function ModeButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-3 py-1.5 rounded-full text-[12.5px] font-heading font-semibold transition-colors " +
        (active ? "bg-ink text-white shadow-sm" : "text-ink-muted hover:text-ink")
      }
    >
      {label}
    </button>
  );
}

function Field({ label, icon: Icon, value, onChange, placeholder, type = "text", required }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
        {label}
        {required && <span className="text-brand-600 ml-1">*</span>}
      </span>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle pointer-events-none" strokeWidth={2} />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body placeholder:text-ink-subtle focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all"
        />
      </div>
    </label>
  );
}
