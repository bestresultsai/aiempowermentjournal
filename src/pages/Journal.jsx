import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  NotebookPen, Sparkles, Upload, Link as LinkIcon, Paperclip,
  X, ChevronLeft, AlertCircle,
} from "lucide-react";
import NavBar from "../components/NavBar";
import { useAuth } from "../context/AuthContext";
import { useResolvedCohort } from "../lib/cohortResolution";
import { submitJournalEntry } from "../lib/api";
import {
  PRODUCTION_METHODS, VOLUME_PER_DAY, FREQUENCIES_SIMPLE,
  SCOPES, QUALITY_OPTIONS,
} from "../lib/journalConstants";

// Frequencies where "how many of these per day" is a meaningful follow-up.
// Weekly / monthly / rare tasks: the volume-per-day question is nonsensical,
// so we hide the field entirely for those.
const VOLUME_APPLIES_FREQUENCIES = new Set(["daily"]);
import { LIMITS, clampString, sanitizeUrl, validateAttachment } from "../lib/inputValidation";

// ---------------------------------------------------------------------------
// /journal/new — AI Journal Entry form.
//
// Single-column flow with button-style choices. Matches the rest of the
// app's design language (Tailwind + brand tokens). Auth is handled
// upstream — we read the signed-in user from AuthContext so there's no
// email lookup pattern.
// ---------------------------------------------------------------------------
export default function Journal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cohort } = useResolvedCohort();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    projectName: "",
    description: "",
    productionMethod: "",       // required
    volumePerDay: "",           // required
    frequency: "weekly",
    scope: "Individual",
    hoursWithoutAI: "",
    hoursWithAI: "",
    qualityOutcome: "Better than original",
    innovationTitle: "",
    innovationDescription: "",
    link: "",
    attachment: null,           // { name, dataUrl, sizeBytes, mimeType }
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      // If the participant picks a frequency where volume-per-day doesn't
      // apply, drop any stale volumePerDay so a hidden-but-still-set value
      // can't slip through to the submit payload.
      if (field === "frequency" && !VOLUME_APPLIES_FREQUENCIES.has(value)) {
        next.volumePerDay = "";
      }
      return next;
    });
  }

  function handleFile(file) {
    setError("");
    if (!file) return;
    const check = validateAttachment(file);
    if (!check.ok) {
      setError(check.reason);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      update("attachment", {
        // Clamp the filename to avoid pathological-name overflow.
        name: clampString(file.name, LIMITS.shortText),
        dataUrl: reader.result,
        sizeBytes: file.size,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  }

  function clearAttachment() {
    update("attachment", null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.projectName.trim()) {
      setError("Please name the deliverable you shipped.");
      return;
    }
    if (!form.productionMethod) {
      setError("Please choose how you produced this.");
      return;
    }
    // Volume-per-day only makes sense when the task recurs on a given day
    // ("multiple times per day" or "daily"). For weekly / monthly / rare
    // we skip the field entirely — asking "how many per day" for something
    // that happens once a month is nonsensical.
    if (VOLUME_APPLIES_FREQUENCIES.has(form.frequency) && !form.volumePerDay) {
      setError("Pick how many of these you typically produce in a day.");
      return;
    }
    if (!form.hoursWithoutAI || !form.hoursWithAI) {
      setError("Please fill in hours before AI and hours with AI.");
      return;
    }

    // Validate + clamp every text/URL input one more time before we send.
    // The onChange handlers already clamp on the way in, but a paste-and-
    // submit-fast path could slip through. Belt + suspenders.
    let safeLink = "";
    if (form.link) {
      const check = sanitizeUrl(form.link);
      if (!check.ok) {
        setError(check.reason);
        return;
      }
      safeLink = check.value;
    }

    setSubmitting(true);
    try {
      await submitJournalEntry({
        participantName: user?.name,
        participantEmail: user?.email,
        organization: user?.organization,
        cohort: cohort?.journalCohortName || cohort?.name || "",
        projectName: clampString(form.projectName, LIMITS.shortText),
        description: clampString(form.description, LIMITS.longText),
        productionMethod: form.productionMethod,
        volumePerDay: form.volumePerDay,
        frequency: form.frequency,
        scope: form.scope,
        hoursWithoutAI: form.hoursWithoutAI,
        hoursWithAI: form.hoursWithAI,
        qualityOutcome: form.qualityOutcome,
        innovationTitle: clampString(form.innovationTitle, LIMITS.shortText),
        innovationDescription: clampString(form.innovationDescription, LIMITS.longText),
        link: safeLink,
        attachment: form.attachment,
        notes: clampString(form.notes, LIMITS.notesText),
      });
      navigate("/journal/result", {
        state: {
          ...form,
          participantEmail: user?.email,
          participantName: user?.name,
          organization: user?.organization,
        },
      });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  // Live "time saved" computed beneath the two hour inputs.
  const timeSaved =
    form.hoursWithoutAI && form.hoursWithAI
      ? Math.max(0, parseFloat(form.hoursWithoutAI) - parseFloat(form.hoursWithAI))
      : null;
  const efficiency =
    form.hoursWithoutAI && form.hoursWithAI && parseFloat(form.hoursWithoutAI) > 0
      ? ((parseFloat(form.hoursWithoutAI) - parseFloat(form.hoursWithAI)) /
          parseFloat(form.hoursWithoutAI)) * 100
      : null;

  return (
    <div className="min-h-screen bg-surface-paper">
      <NavBar />
      <main className="max-w-[760px] mx-auto px-6 py-8 animate-fade-in-up">
        {/* Back + Header */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-[12.5px] text-ink-muted hover:text-ink mb-3"
        >
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
          Back
        </button>
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <NotebookPen className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="h-eyebrow">AI Empowerment Journal</div>
          </div>
          <h1 className="font-heading text-[28px] lg:text-[32px] font-extrabold tracking-tight text-ink leading-tight">
            Log an entry
          </h1>
          <p className="text-[14px] text-ink-muted mt-1.5 max-w-xl">
            Capture how you produced it, the leverage, and the time you saved.
            Every entry compounds your cohort's impact story.
          </p>
        </header>

        {error && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 mb-4 inline-flex items-start gap-2 text-[13.5px]">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2.5} />
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-surface-card border border-soft shadow-card p-6 lg:p-8 space-y-7"
        >
          {/* Eyebrow placeholder banner */}
          <div className="rounded-xl bg-surface-soft/60 px-4 py-2.5 text-[12.5px] italic text-ink-subtle">
            Start by entering a deliverable and choosing a production method
          </div>

          {/* 1 — Deliverable */}
          <Field label="What deliverable did you ship?" required htmlFor="projectName">
            <input
              id="projectName"
              type="text"
              value={form.projectName}
              onChange={(e) => update("projectName", clampString(e.target.value, LIMITS.shortText))}
              placeholder="e.g., Client proposal for Acme Corp"
              required
              maxLength={LIMITS.shortText}
              className={inputClass}
            />
          </Field>

          {/* 2 — Production method */}
          <Field label="How did you produce it?" required>
            <ChoiceGrid
              options={PRODUCTION_METHODS.map((m) => ({ key: m.key, label: m.short }))}
              value={form.productionMethod}
              onChange={(v) => update("productionMethod", v)}
              cols={5}
            />
            {form.productionMethod && (
              <p className="mt-2 text-[12px] text-ink-subtle">
                {PRODUCTION_METHODS.find((m) => m.key === form.productionMethod)?.description}
              </p>
            )}
            {!form.productionMethod && (
              <div className="mt-2 rounded-xl bg-surface-soft/60 border-l-2 border-soft px-3 py-2 italic text-[12.5px] text-ink-subtle">
                Select a production method above to continue.
              </div>
            )}
          </Field>

          {/* 3 — Frequency */}
          <Field label="How often do you perform this?" required>
            <ChoiceGrid
              options={FREQUENCIES_SIMPLE.map((f) => ({ key: f.key, label: f.label }))}
              value={form.frequency}
              onChange={(v) => update("frequency", v)}
              cols={5}
            />
          </Field>

          {/* 4 — Volume per day. Copy is deliberately about the task the
              entry describes, not the entry itself — Mike flagged that the
              old phrasing ("how many times do you do this?") read like it
              was asking about journaling frequency. Also hidden when the
              frequency is monthly / weekly / rare — asking "how many per
              day" for something that happens once a week doesn't fit. */}
          {VOLUME_APPLIES_FREQUENCIES.has(form.frequency) && (
            <Field label="How many of these do you typically produce in a day?" required>
              <ChoiceGrid
                options={VOLUME_PER_DAY.map((v) => ({ key: v.key, label: v.label }))}
                value={form.volumePerDay}
                onChange={(v) => update("volumePerDay", v)}
                cols={4}
              />
            </Field>
          )}

          {/* 5 — Hours (kept per "cut nothing" decision) */}
          <Field label="Time saved" required>
            <div className="grid grid-cols-2 gap-3">
              <NumberSubInput
                label="Hours without AI"
                value={form.hoursWithoutAI}
                onChange={(v) => update("hoursWithoutAI", v)}
                placeholder="e.g., 8"
              />
              <NumberSubInput
                label="Hours with AI"
                value={form.hoursWithAI}
                onChange={(v) => update("hoursWithAI", v)}
                placeholder="e.g., 2"
              />
            </div>
            {timeSaved !== null && timeSaved > 0 && (
              <div className="mt-2 inline-flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2">
                <span className="inline-flex items-center gap-1.5 text-[12.5px] font-heading font-bold text-emerald-700">
                  <Sparkles className="w-3.5 h-3.5" strokeWidth={3} />
                  Saved {timeSaved.toFixed(1)}h
                </span>
                {efficiency !== null && (
                  <span className="text-[12px] text-emerald-700/80">
                    {efficiency.toFixed(0)}% faster
                  </span>
                )}
              </div>
            )}
          </Field>

          {/* 6 — Scope */}
          <Field label="Scope">
            <ChoiceGrid
              options={SCOPES.map((s) => ({ key: s, label: s }))}
              value={form.scope}
              onChange={(v) => update("scope", v)}
              cols={3}
            />
          </Field>

          {/* 7 — Quality outcome */}
          <Field label="Quality outcome">
            <ChoiceGrid
              options={QUALITY_OPTIONS.map((q) => ({ key: q, label: q }))}
              value={form.qualityOutcome}
              onChange={(v) => update("qualityOutcome", v)}
              cols={3}
            />
          </Field>

          {/* 8 — Description */}
          <Field label="Description" optional htmlFor="description">
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Describe what you created using AI..."
              rows={3}
              className={textareaClass}
            />
          </Field>

          {/* 9 — Upload deliverable */}
          <Field label="Upload deliverable" optional>
            {form.attachment ? (
              <div className="flex items-center gap-3 rounded-xl bg-surface-soft px-4 py-3">
                <Paperclip className="w-4 h-4 text-ink-muted" strokeWidth={2.5} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-heading font-semibold text-ink truncate">
                    {form.attachment.name}
                  </div>
                  <div className="text-[11.5px] text-ink-muted">
                    {(form.attachment.sizeBytes / 1024).toFixed(0)} KB
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearAttachment}
                  className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-ink/5"
                  aria-label="Remove file"
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 rounded-xl bg-surface-soft/60 border border-dashed border-soft px-4 py-3 cursor-pointer hover:border-brand-300 hover:bg-brand-50/40 transition-colors">
                <Upload className="w-4 h-4 text-ink-muted" strokeWidth={2.5} />
                <span className="text-[12.5px] text-ink-muted">
                  Drop a file here or click to upload (up to 4 MB)
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="sr-only"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </label>
            )}
          </Field>

          {/* 10 — Link */}
          <Field label="Link to deliverable" optional htmlFor="link">
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" strokeWidth={2.5} />
              <input
                id="link"
                type="url"
                value={form.link}
                onChange={(e) => update("link", e.target.value)}
                placeholder="https://..."
                className={inputClass + " pl-9"}
              />
            </div>
          </Field>

          {/* 11 — Innovation (optional, collapsible) */}
          <details className="rounded-xl bg-amber-50/40 border border-amber-100 px-4 py-3">
            <summary className="text-[12.5px] font-heading font-bold uppercase tracking-wider text-amber-800 cursor-pointer select-none">
              Innovation <span className="text-amber-700/60 font-normal normal-case">(optional)</span>
            </summary>
            <p className="text-[11.5px] text-amber-700/80 mt-1 mb-2">
              Did AI enable something that wasn't possible before?
            </p>
            <input
              type="text"
              value={form.innovationTitle}
              onChange={(e) => update("innovationTitle", e.target.value)}
              placeholder="Innovation title"
              className={inputClass + " mb-2"}
            />
            <textarea
              value={form.innovationDescription}
              onChange={(e) => update("innovationDescription", e.target.value)}
              placeholder="Describe what new capability AI made possible..."
              rows={2}
              className={textareaClass}
            />
          </details>

          {/* 12 — Notes */}
          <Field label="Notes" optional htmlFor="notes">
            <textarea
              id="notes"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Any additional context or notes..."
              rows={2}
              className={textareaClass}
            />
          </Field>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-3.5 rounded-xl bg-ink text-white text-[14px] font-heading font-bold hover:bg-brand-700 transition-colors disabled:bg-ink/40 disabled:cursor-not-allowed"
          >
            {submitting ? "Logging entry..." : "Log Entry"}
          </button>
        </form>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field — consistent label + slot wrapper.
// ---------------------------------------------------------------------------
function Field({ label, required, optional, htmlFor, children }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-[13px] font-heading font-semibold text-ink mb-2"
      >
        {label}
        {required && <span className="text-rose-600 ml-1">*</span>}
        {optional && (
          <span className="ml-2 text-[11px] font-normal text-ink-subtle uppercase tracking-wider">
            optional
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

// ChoiceGrid — pill-style segmented selector. Used for production method,
// frequency, volume per day, scope, and quality outcome.
function ChoiceGrid({ options, value, onChange, cols = 5 }) {
  const colClass = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  }[cols] || "grid-cols-2 sm:grid-cols-5";
  return (
    <div className={`grid ${colClass} gap-2`}>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={
              "px-3 py-2.5 rounded-xl border text-[13px] font-heading font-semibold transition-all duration-150 " +
              (active
                ? "border-brand-600 bg-brand-50 text-brand-700 shadow-sm"
                : "border-soft bg-surface-card text-ink-muted hover:border-brand-300 hover:text-ink")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function NumberSubInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <div className="text-[11.5px] font-heading font-semibold text-ink-subtle mb-1">
        {label}
      </div>
      <input
        type="number"
        min="0"
        step="0.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2.5 rounded-xl border border-soft bg-surface-soft/40 text-[14px] text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-brand-400 focus:bg-surface-card transition-colors";

const textareaClass = inputClass + " resize-none";
