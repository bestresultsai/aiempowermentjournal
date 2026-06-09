import { Link } from "react-router-dom";
import {
  Check, Clock, ExternalLink, Download, MessageSquare,
  BookCheck, ArrowRight, User,
} from "lucide-react";
import { ModalHeader } from "./Modal";

// ---------------------------------------------------------------------------
// SubmissionDetail — modal body that renders a single homework submission.
//
// Props:
//   submission        the submission record { response, link, attachment,
//                                              submittedAt, reviewedAt, feedback }
//   session           the matching session from MOCK_SESSIONS (optional)
//   belt              { gradient, contrast, needsBorder } from BELT_COLORS
//   participantName   string — rendered above the response
//   participant       full participant record — if provided, footer shows a
//                     "View participant profile" CTA instead of the homework
//                     queue link (matches the journal modal pattern)
//   showHomeworkQueueLink  pass false on /admin/homework to drop the CTA
//                          (we're already on that page)
// ---------------------------------------------------------------------------
export default function SubmissionDetail({
  submission,
  session,
  belt,
  participantName,
  participant = null,
  showHomeworkQueueLink = true,
  onClose,
}) {
  const reviewed = !!submission.reviewedAt;
  return (
    <>
      <ModalHeader
        eyebrow={session ? `Session ${session.order} · ${session.belt} belt` : "Homework submission"}
        title={session?.title || `Session ${submission.order} homework`}
        onClose={onClose}
      />
      <div className="p-6 space-y-5">
        {/* Status row */}
        <div className="flex items-center gap-2 flex-wrap">
          {belt && (
            <span
              style={{
                background: belt.gradient,
                color: belt.contrast,
                border: belt.needsBorder ? "1px solid #D1D5DB" : "none",
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-heading font-bold tracking-wide"
            >
              {session.belt}
            </span>
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
          <span className="ml-auto text-[11.5px] text-ink-muted">
            Submitted {timeAgo(submission.submittedAt)}
            {reviewed && ` · Reviewed ${timeAgo(submission.reviewedAt)}`}
          </span>
        </div>

        {/* Response */}
        {submission.response && (
          <div>
            <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle mb-2">
              {participantName}'s submission
            </div>
            <p className="text-[14px] text-ink leading-relaxed whitespace-pre-wrap">
              {submission.response}
            </p>
          </div>
        )}

        {/* Link + attachment */}
        {(submission.link || submission.attachment?.dataUrl) && (
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
              </a>
            )}
          </div>
        )}

        {/* Feedback */}
        {submission.feedback && (
          <div className="rounded-xl bg-gradient-to-br from-emerald-50/70 to-brand-50/40 border border-emerald-200 p-4">
            <div className="inline-flex items-center gap-1.5 text-[10.5px] font-heading font-bold uppercase tracking-wider text-emerald-700 mb-2">
              <MessageSquare className="w-3 h-3" strokeWidth={3} />
              Facilitator feedback
            </div>
            <p className="text-[14px] text-ink leading-relaxed whitespace-pre-wrap">
              {submission.feedback}
            </p>
          </div>
        )}
      </div>

      {/* Footer — adapts to context. When the modal was opened from
          /admin/journal or /admin/homework we know who the participant is, so
          we offer to drill into their profile. On /admin/participants/:id we already
          ARE on the participant page, so we point at the homework queue. */}
      <div className="px-6 py-4 border-t border-soft flex items-center justify-between gap-3 flex-wrap">
        {participant ? (
          <div className="flex items-center gap-2 text-[12.5px] text-ink-muted">
            <User className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>
              by <span className="font-heading font-semibold text-ink">{participant.name}</span>
              {participant.organization && ` · ${participant.organization}`}
            </span>
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          {participant && (
            <Link
              to={`/admin/participants/${participant.id}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 text-white text-[12.5px] font-heading font-semibold hover:bg-brand-700 transition-colors"
            >
              View participant profile
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </Link>
          )}
          {!participant && showHomeworkQueueLink && (
            <Link
              to="/admin/homework"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 text-white text-[12.5px] font-heading font-semibold hover:bg-brand-700 transition-colors"
            >
              <BookCheck className="w-3.5 h-3.5" strokeWidth={2.5} />
              Open homework queue
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

function timeAgo(iso) {
  if (!iso) return "—";
  const now = Date.now();
  const t = new Date(iso).getTime();
  const sec = Math.floor((now - t) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 4) return `${w}w ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
