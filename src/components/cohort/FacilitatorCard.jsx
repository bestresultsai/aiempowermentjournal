import { useState } from "react";
import { CalendarClock, ArrowUpRight } from "lucide-react";

// Merged "Your Facilitator" + "1:1 booking" card.
export default function FacilitatorCard({ facilitator, coachingNote }) {
  if (!facilitator?.name) return null;

  return (
    <div className="rounded-3xl bg-surface-card border border-soft p-7 flex flex-col h-full shadow-card animate-fade-in-up delay-100 transition-shadow duration-300 hover:shadow-lift">
      <div className="h-eyebrow mb-4">Your Facilitator</div>

      <div className="flex items-center gap-4 mb-5">
        <FacilitatorAvatar facilitator={facilitator} />
        <div className="min-w-0">
          <div className="font-heading text-[22px] font-bold leading-tight text-ink">
            {facilitator.name}
          </div>
          {facilitator.title && (
            <div className="text-[13px] text-ink-muted mt-0.5 leading-snug">
              {facilitator.title}
            </div>
          )}
        </div>
      </div>

      {facilitator.bio && (
        <blockquote className="text-[14px] text-ink leading-relaxed mb-5 italic font-heading font-medium border-l-2 border-brand-500 pl-4">
          "{facilitator.bio}"
        </blockquote>
      )}

      {coachingNote && !facilitator.bio && (
        <p className="text-[13.5px] text-ink-muted leading-relaxed mb-5">
          {coachingNote}
        </p>
      )}

      <div className="mt-auto pt-5 border-t border-soft flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] min-w-0">
          <CalendarClock className="w-4 h-4 text-ink-muted shrink-0" strokeWidth={2} />
          <div className="min-w-0">
            <div className="text-ink-muted text-[11.5px]">Office Hours</div>
            <div className="font-heading font-semibold text-ink truncate">Fridays · 11 AM CT</div>
          </div>
        </div>
        <button
          className="group inline-flex items-center gap-1.5 px-4 py-2.5 bg-ink text-white rounded-xl text-[13.5px] font-heading font-semibold hover:bg-brand-700 transition-all duration-200 shrink-0"
          onClick={() => alert("Coaching booking — coming in a later phase.")}
        >
          Book a 1:1
          <ArrowUpRight className="w-4 h-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function FacilitatorAvatar({ facilitator, size = 76 }) {
  const [errored, setErrored] = useState(false);
  const initials = (facilitator.name || "?")
    .split(" ").filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join("").toUpperCase();
  const showImage = facilitator.headshotUrl && !errored;

  if (showImage) {
    return (
      <img
        src={facilitator.headshotUrl}
        alt={facilitator.name}
        onError={() => setErrored(true)}
        style={{
          width: size,
          height: size,
          boxShadow: "0 0 0 3px #FAFAF7, 0 0 0 5px #2563EB",
        }}
        className="rounded-full object-cover shrink-0 transition-transform duration-300 hover:scale-[1.04]"
      />
    );
  }
  return (
    <div
      className="rounded-full bg-brand-700 text-white flex items-center justify-center font-heading font-bold shrink-0 transition-transform duration-300 hover:scale-[1.04]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}
    >
      {initials}
    </div>
  );
}
