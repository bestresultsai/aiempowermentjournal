import { Link } from "react-router-dom";
import {
  Sparkles, ExternalLink, Download, ArrowRight, User,
} from "lucide-react";
import { ModalHeader } from "./Modal";
import {
  timeSavedFor,
  formatMinutes,
} from "../../lib/adminMockData";
import {
  getProductionMethod,
  getVolumeBucket,
  getFrequencyBucket,
  leveragePerWeek,
} from "../../lib/journalConstants";

// ---------------------------------------------------------------------------
// JournalEntryDetail — modal body that renders a single journal entry with
// production method, frequency × volume × leverage, hours, attachment, link,
// innovation, and notes.
//
// Optionally accepts `participant` so it can show a "View participant" CTA
// (used on /admin/journal where the user might want to drill into the person).
// ---------------------------------------------------------------------------
export default function JournalEntryDetail({ entry, participant = null, onClose }) {
  const saved = timeSavedFor(entry);
  const method = getProductionMethod(entry.productionMethod);
  const volume = getVolumeBucket(entry.volumePerDay);
  const freq = getFrequencyBucket(entry.frequency);
  const leverage = leveragePerWeek(entry);

  return (
    <>
      <ModalHeader
        eyebrow={`Journal entry · ${dateLabel(entry.date)}${participant ? ` · ${participant.name}` : ""}`}
        title={entry.title}
        onClose={onClose}
      />
      <div className="p-6 space-y-5">
        {/* Top chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {method && (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-heading font-bold ${method.chipBg} ${method.chipText}`}>
              {method.label}
            </span>
          )}
          {entry.scope && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-heading font-semibold bg-ink/5 text-ink-muted">
              {entry.scope}
            </span>
          )}
          {entry.qualityOutcome && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-heading font-semibold bg-amber-50 text-amber-800">
              {entry.qualityOutcome}
            </span>
          )}
          {saved > 0 && (
            <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[12.5px] font-heading font-bold">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={3} />
              {formatMinutes(saved)} saved
            </span>
          )}
        </div>

        {/* Description */}
        {entry.description && (
          <p className="text-[14.5px] text-ink leading-relaxed whitespace-pre-wrap">
            {entry.description}
          </p>
        )}

        {/* Frequency × Volume + leverage */}
        {(freq || volume || leverage > 0) && (
          <div className="grid grid-cols-3 gap-3">
            <SmallKpi label="Frequency" value={freq?.label || "—"} />
            <SmallKpi label="Volume / day" value={volume?.label || "—"} />
            <SmallKpi
              label="Leverage / week"
              value={leverage > 0 ? formatMinutes(leverage) : "—"}
              accent="emerald"
            />
          </div>
        )}

        {/* Hours */}
        {(entry.timeBeforeAI > 0 || entry.timeWithAI > 0) && (
          <div className="grid grid-cols-2 gap-3">
            <SmallKpi label="Before AI" value={formatMinutes(entry.timeBeforeAI)} />
            <SmallKpi label="With AI" value={formatMinutes(entry.timeWithAI)} accent="emerald" />
          </div>
        )}

        {/* Attachments / link */}
        {(entry.link || entry.attachment?.dataUrl) && (
          <div className="flex items-center gap-2 flex-wrap">
            {entry.link && (
              <a
                href={entry.link}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 text-[12.5px] font-heading font-semibold hover:bg-brand-100 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" strokeWidth={2.5} />
                Open link
              </a>
            )}
            {entry.attachment?.dataUrl && (
              <a
                href={entry.attachment.dataUrl}
                download={entry.attachment.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 text-[12.5px] font-heading font-semibold hover:bg-brand-100 transition-colors"
              >
                <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
                {entry.attachment.name}
              </a>
            )}
          </div>
        )}

        {/* Innovation */}
        {(entry.innovationTitle || entry.innovationDescription) && (
          <div className="rounded-xl bg-amber-50/60 border border-amber-100 p-4">
            <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-amber-800 mb-1.5">
              Innovation
            </div>
            {entry.innovationTitle && (
              <div className="text-[14px] font-heading font-bold text-ink">
                {entry.innovationTitle}
              </div>
            )}
            {entry.innovationDescription && (
              <p className="text-[13px] text-ink leading-relaxed mt-1 whitespace-pre-wrap">
                {entry.innovationDescription}
              </p>
            )}
          </div>
        )}

        {/* Notes */}
        {entry.notes && (
          <div className="rounded-xl bg-surface-soft px-4 py-3">
            <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle mb-1">
              Notes
            </div>
            <p className="text-[13px] text-ink leading-relaxed whitespace-pre-wrap">
              {entry.notes}
            </p>
          </div>
        )}
      </div>

      {/* Footer — only rendered when we have a participant to drill into */}
      {participant && (
        <div className="px-6 py-4 border-t border-soft flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-[12.5px] text-ink-muted">
            <User className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>
              by <span className="font-heading font-semibold text-ink">{participant.name}</span>
              {participant.organization && ` · ${participant.organization}`}
            </span>
          </div>
          <Link
            to={`/admin/users/${participant.id}`}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 text-white text-[12.5px] font-heading font-semibold hover:bg-brand-700 transition-colors"
          >
            View participant profile
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      )}
    </>
  );
}

function SmallKpi({ label, value, accent }) {
  const accentClass =
    accent === "emerald"
      ? "text-emerald-700"
      : "text-ink";
  return (
    <div className="rounded-xl bg-surface-soft px-3 py-2.5">
      <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
        {label}
      </div>
      <div className={`font-heading text-[15px] font-extrabold mt-0.5 ${accentClass}`}>
        {value}
      </div>
    </div>
  );
}

function dateLabel(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
