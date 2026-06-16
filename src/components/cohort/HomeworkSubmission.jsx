import { useRef, useState, useEffect } from "react";
import {
  Check, Pencil, ExternalLink, Sparkles, Loader2, MessageSquare,
  Send, X, Paperclip, Download, FileText,
} from "lucide-react";
import {
  LIMITS, clampString, sanitizeUrl, validateAttachment, formatBytes,
} from "../../lib/inputValidation";

// ---------------------------------------------------------------------------
// HomeworkSubmission — participant-facing homework form on /session/:order.
//
// Props:
//   session: {
//     homework: { prompt, dueDate, submissionType },
//     homeworkSubmission: { response, link, submittedAt, reviewedAt?, feedback? }
//   }
//   onSubmit:  (payload) => void
//   pending:   boolean
//   facilitator: { name, headshotUrl? }  — for the feedback callout header
// ---------------------------------------------------------------------------

export default function HomeworkSubmission({ session, onSubmit, pending, facilitator }) {
  // Per-cohort homework override (session.customHomework) wins over the
  // program's default homework prompt.
  const hw = session?.customHomework
    ? { ...(session?.homework || {}), prompt: session.customHomework }
    : session?.homework;
  const existing = session?.homeworkSubmission;
  const reviewed = !!existing?.reviewedAt;

  const [response, setResponse] = useState(existing?.response || "");
  const [link, setLink] = useState(existing?.link || "");
  const [attachment, setAttachment] = useState(existing?.attachment || null);
  const [attachmentError, setAttachmentError] = useState(null);
  const fileRef = useRef(null);
  const [editing, setEditing] = useState(!existing);

  useEffect(() => {
    setResponse(existing?.response || "");
    setLink(existing?.link || "");
    setAttachment(existing?.attachment || null);
    setAttachmentError(null);
    setEditing(!existing);
  }, [session?.order, existing]);

  function handleFilePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachmentError(null);
    const check = validateAttachment(file);
    if (!check.ok) {
      setAttachmentError(check.reason);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: clampString(file.name, LIMITS.shortText),
        size: file.size,
        type: file.type || "application/octet-stream",
        dataUrl: reader.result,
      });
    };
    reader.onerror = () => setAttachmentError("Couldn't read that file. Try another.");
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  if (!hw?.prompt) {
    return (
      <div className="rounded-2xl bg-surface-card border border-soft p-5 text-[13.5px] text-ink-muted">
        No homework for this session.
      </div>
    );
  }

  const due = hw.dueDate ? new Date(hw.dueDate) : null;
  const dueLabel = due
    ? due.toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric" })
    : null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!response.trim() && !link.trim() && !attachment) return;
    // Validate the link before submitting. Bad scheme → block + show why.
    let safeLink = "";
    if (link.trim()) {
      const check = sanitizeUrl(link);
      if (!check.ok) {
        setAttachmentError(check.reason);
        return;
      }
      safeLink = check.value;
    }
    onSubmit({
      response: clampString(response, LIMITS.longText).trim(),
      link: safeLink,
      attachment,
    });
    setEditing(false);
  }

  return (
    <div className="space-y-4">
      {/* Assignment prompt */}
      <div className="rounded-2xl bg-surface-card border border-soft p-5">
        <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle mb-2">
          Assignment
        </div>
        <p className="text-[14.5px] text-ink leading-relaxed">{hw.prompt}</p>
        {dueLabel && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-heading font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
            Due {dueLabel}
          </div>
        )}
      </div>

      {/* Facilitator feedback — shown above the submission view when reviewed */}
      {reviewed && existing.feedback && (
        <FacilitatorFeedback
          feedback={existing.feedback}
          reviewedAt={existing.reviewedAt}
          facilitator={facilitator}
        />
      )}

      {existing && !editing && (
        <SubmittedView
          submission={existing}
          reviewed={reviewed}
          onEdit={() => setEditing(true)}
        />
      )}

      {(editing || !existing) && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-surface-card border border-soft p-5 space-y-4"
        >
          <label className="block">
            <span className="block text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
              Your response
            </span>
            <textarea
              value={response}
              onChange={(e) => setResponse(clampString(e.target.value, LIMITS.longText))}
              maxLength={LIMITS.longText}
              placeholder="Type your answer here, or paste a link below if your work lives elsewhere."
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body placeholder:text-ink-subtle focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 resize-y leading-relaxed"
            />
          </label>

          <label className="block">
            <span className="block text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
              Optional link (Google Doc, Notion, file)
            </span>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://docs.google.com/..."
              className="w-full px-4 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body placeholder:text-ink-subtle focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
            />
          </label>

          {/* Attachment */}
          <div>
            <span className="block text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
              Attach a file (optional)
            </span>
            <input
              ref={fileRef}
              type="file"
              onChange={handleFilePick}
              className="hidden"
            />
            {attachment ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-soft bg-surface-soft">
                <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-heading text-[13px] font-semibold text-ink truncate">{attachment.name}</div>
                  <div className="text-[11px] text-ink-muted">{formatBytes(attachment.size)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-heading font-semibold text-ink-muted hover:text-ink hover:bg-white"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-white"
                  title="Remove attachment"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-soft text-[12.5px] font-heading font-semibold text-ink hover:bg-surface-soft hover:border-brand-500 transition-all"
              >
                <Paperclip className="w-3.5 h-3.5 text-brand-600" strokeWidth={2.5} />
                Choose file
              </button>
            )}
            {attachmentError && (
              <p className="text-[12px] text-red-600 mt-2 font-heading font-medium">{attachmentError}</p>
            )}
            <p className="text-[11px] text-ink-muted mt-1.5">
              PDF, DOCX, images, and more. Under {formatBytes(LIMITS.attachmentBytes)}.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="submit"
              disabled={pending || (!response.trim() && !link.trim() && !attachment)}
              className={
                "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-heading font-semibold transition-colors " +
                (pending || (!response.trim() && !link.trim() && !attachment)
                  ? "bg-ink/5 text-ink-subtle cursor-not-allowed"
                  : "bg-brand-600 text-white hover:bg-brand-700")
              }
            >
              {pending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" strokeWidth={2.5} />
                  {existing ? "Update submission" : "Submit homework"}
                </>
              )}
            </button>
            {existing && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink hover:bg-ink/5 transition-colors"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                Cancel
              </button>
            )}
            <div className="ml-auto text-[11.5px] text-ink-muted">
              Either field is fine — text, link, or both.
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

// ---- Submitted view ----
function SubmittedView({ submission, reviewed, onEdit }) {
  const ts = submission.submittedAt ? new Date(submission.submittedAt) : null;
  const tsLabel = ts
    ? ts.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "";

  return (
    <div className={
      "rounded-2xl border p-5 " +
      (reviewed
        ? "bg-surface-card border-soft"
        : "bg-emerald-50/40 border-emerald-100")
    }>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-heading font-bold " +
          (reviewed
            ? "bg-brand-50 text-brand-700"
            : "bg-emerald-100 text-emerald-800")
        }>
          <Check className="w-3 h-3" strokeWidth={3} />
          {reviewed ? "Reviewed" : "Submitted"}
        </span>
        <span className="text-[11.5px] text-ink-muted">{tsLabel}</span>
      </div>
      {submission.response && (
        <p className="text-[14px] text-ink leading-relaxed whitespace-pre-wrap mb-3">
          {submission.response}
        </p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {submission.link && (
          <a
            href={submission.link}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 text-[12.5px] font-heading font-semibold hover:bg-brand-100 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" strokeWidth={2.5} />
            Open link
          </a>
        )}
        {submission.attachment?.dataUrl && (
          <a
            href={submission.attachment.dataUrl}
            download={submission.attachment.name}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 text-[12.5px] font-heading font-semibold hover:bg-brand-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
            {submission.attachment.name}
            <span className="text-ink-muted font-normal">({formatBytes(submission.attachment.size)})</span>
          </a>
        )}
      </div>
      <div className="mt-4">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-[12px] font-heading font-semibold text-ink-muted hover:text-ink transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
          Edit submission
        </button>
      </div>
    </div>
  );
}

// ---- Facilitator feedback callout ----
function FacilitatorFeedback({ feedback, reviewedAt, facilitator }) {
  const ts = reviewedAt ? new Date(reviewedAt) : null;
  const tsLabel = ts
    ? ts.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "";
  const facName = facilitator?.name || "Your facilitator";
  const initials = (facName || "?")
    .split(" ").filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join("").toUpperCase();
  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-50/70 to-brand-50/40 border border-emerald-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        {facilitator?.headshotUrl ? (
          <img
            src={facilitator.headshotUrl}
            alt=""
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-brand-700 text-white flex items-center justify-center text-[11px] font-heading font-bold">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[10.5px] font-heading font-bold uppercase tracking-wider text-emerald-700">
            <MessageSquare className="w-3 h-3" strokeWidth={3} />
            Facilitator feedback
          </div>
          <div className="text-[13px] font-heading font-bold text-ink mt-0.5">
            {facName}{tsLabel && <span className="font-medium text-ink-muted"> · {tsLabel}</span>}
          </div>
        </div>
        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={2.25} />
      </div>
      <p className="text-[14px] text-ink leading-relaxed whitespace-pre-wrap">{feedback}</p>
    </div>
  );
}
