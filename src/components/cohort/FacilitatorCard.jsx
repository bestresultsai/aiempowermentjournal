import { useState } from "react";

// Merged "Your Facilitator" + "1:1 booking" card. Sits in the 40% column next
// to the hero. Combines the facilitator's identity with the primary coaching
// action so participants don't see two redundant cards.
export default function FacilitatorCard({ facilitator, coachingNote }) {
  if (!facilitator?.name) return null;

  return (
    <div className="rounded-3xl bg-surface-card border border-soft p-7 flex flex-col h-full shadow-card">
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
        <blockquote className="text-[14px] text-ink leading-relaxed mb-5 italic font-heading font-medium">
          "{facilitator.bio}"
        </blockquote>
      )}

      {coachingNote && !facilitator.bio && (
        <p className="text-[13.5px] text-ink-muted leading-relaxed mb-5">
          {coachingNote}
        </p>
      )}

      <div className="mt-auto pt-5 border-t border-soft flex items-center justify-between gap-3">
        <div className="text-[13px] min-w-0">
          <div className="text-ink-muted">Office Hours</div>
          <div className="font-heading font-semibold text-ink">Fridays · 11 AM CT</div>
        </div>
        <button
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-ink text-white rounded-xl text-[13.5px] font-heading font-semibold hover:bg-brand-700 transition shrink-0"
          onClick={() => alert("Coaching booking — coming in a later phase.")}
        >
          Book a 1:1 →
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
        className="rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div
      className="rounded-full bg-brand-700 text-white flex items-center justify-center font-heading font-bold shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}
    >
      {initials}
    </div>
  );
}
