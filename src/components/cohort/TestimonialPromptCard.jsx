import { useEffect, useMemo, useState } from "react";
import { Quote, CheckCircle2, Pencil, Send } from "lucide-react";
import {
  getTestimonialForParticipant,
  submitTestimonial,
  useTestimonialVersion,
} from "../../lib/testimonials";

// ---------------------------------------------------------------------------
// TestimonialPromptCard — appears on the cohort home page after a participant
// has earned their certificate (gated by the parent via `eligible`).
//
// Three modes:
//   1. No existing testimonial → invite + form (start collapsed).
//   2. Existing testimonial, pending review → "Thanks, in review" state.
//   3. Existing testimonial, approved → "Approved + on display" state.
//   4. Existing testimonial, declined → "Needs another look" state with edit.
//
// All states allow editing — re-submitting resets status to pending.
// ---------------------------------------------------------------------------

export default function TestimonialPromptCard({ user, cohort, eligible }) {
  useTestimonialVersion(); // re-render on writes

  const existing = useMemo(() => {
    if (!user?.email || !cohort?.slug) return null;
    return getTestimonialForParticipant(user.email, cohort.slug);
  }, [user?.email, cohort?.slug]);

  // Parent decides eligibility (certificate earned). Render nothing if the
  // participant hasn't reached that bar AND hasn't already submitted —
  // editing is allowed indefinitely once they've gone through it once.
  if (!eligible && !existing) return null;

  const [open, setOpen] = useState(!existing); // open by default for first-time
  const [quote, setQuote] = useState(existing?.quote || "");
  const [role, setRole] = useState(existing?.role || user?.title || "");
  const [organization, setOrganization] = useState(
    existing?.organization || cohort?.organization?.name || user?.organization || "",
  );
  const [allowMarketingUse, setAllowMarketingUse] = useState(
    existing ? existing.allowMarketingUse : false,
  );
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  // Re-seed when the cached existing record changes.
  useEffect(() => {
    setQuote(existing?.quote || "");
    setRole(existing?.role || user?.title || "");
    setOrganization(
      existing?.organization || cohort?.organization?.name || user?.organization || "",
    );
    setAllowMarketingUse(existing ? existing.allowMarketingUse : false);
    setError("");
  }, [existing?.id, user?.title, cohort?.organization?.name, user?.organization]);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!quote.trim() || quote.trim().length < 30) {
      setError("Tell us a little more — a couple of sentences works best.");
      return;
    }
    try {
      submitTestimonial({
        participantId: user.id || null,
        participantName: user.name || "",
        participantEmail: user.email,
        cohortSlug: cohort.slug,
        programCode: cohort.programCode || null,
        quote,
        role,
        organization,
        allowMarketingUse,
      });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
      setOpen(false);
    } catch (err) {
      setError(err?.message || "Couldn't save your testimonial.");
    }
  }

  return (
    <section
      className="mt-6 rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-surface-card to-brand-50/30 p-6 lg:p-7 animate-fade-in-up"
    >
      <div className="flex items-start gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Quote className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-eyebrow !text-amber-700 mb-1">Testimonial</div>
          <Headline existing={existing} />
          <Description existing={existing} />

          {justSaved && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[12px] font-heading font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
              Submitted — thanks for sharing.
            </div>
          )}
        </div>

        {/* Edit / open toggle. Always visible so participants can re-open
            after the form auto-closes on submit. */}
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-ink text-white text-[13px] font-heading font-bold hover:bg-ink/90 shrink-0"
          >
            {existing ? <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} /> : <Send className="w-3.5 h-3.5" strokeWidth={2.5} />}
            {existing ? "Edit testimonial" : "Share your testimonial"}
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-[12px] font-heading font-bold uppercase tracking-wider text-ink-muted mb-1.5">
              Your testimonial
            </label>
            <textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              rows={5}
              placeholder="What changed for you over the program? What's one concrete thing you shipped or learned?"
              className="w-full px-3.5 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body leading-relaxed focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-heading font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                Your title
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Director of Operations"
                className="w-full px-3.5 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-[12px] font-heading font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                Organization
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. Summit Health"
                className="w-full px-3.5 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={allowMarketingUse}
              onChange={(e) => setAllowMarketingUse(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-soft text-brand-600 focus:ring-brand-500"
            />
            <span className="text-[13px] text-ink-muted leading-relaxed">
              I allow BestResults.AI to use this testimonial publicly — case
              studies, the website, sales materials. You can change this any
              time by editing your testimonial.
            </span>
          </label>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-900">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink text-white text-[13.5px] font-heading font-bold hover:bg-ink/90"
            >
              <Send className="w-3.5 h-3.5" strokeWidth={2.5} />
              {existing ? "Update testimonial" : "Submit testimonial"}
            </button>
            {existing && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 rounded-xl text-[13px] font-heading font-semibold text-ink-muted hover:text-ink"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}

function Headline({ existing }) {
  if (!existing) {
    return (
      <h3 className="font-heading text-[20px] lg:text-[22px] font-extrabold text-ink leading-tight">
        Share your story.
      </h3>
    );
  }
  if (existing.status === "approved") {
    return (
      <h3 className="font-heading text-[20px] lg:text-[22px] font-extrabold text-ink leading-tight">
        Your testimonial is live.
      </h3>
    );
  }
  if (existing.status === "declined") {
    return (
      <h3 className="font-heading text-[20px] lg:text-[22px] font-extrabold text-ink leading-tight">
        Let's polish your testimonial.
      </h3>
    );
  }
  return (
    <h3 className="font-heading text-[20px] lg:text-[22px] font-extrabold text-ink leading-tight">
      Thanks — we're reviewing.
    </h3>
  );
}

function Description({ existing }) {
  if (!existing) {
    return (
      <p className="text-[13.5px] text-ink-muted leading-relaxed max-w-xl mt-1">
        You've earned your certificate. Tell us — in a few sentences — what
        changed. Your words help future cohorts see what's possible.
      </p>
    );
  }
  if (existing.status === "approved") {
    return (
      <p className="text-[13.5px] text-ink-muted leading-relaxed max-w-xl mt-1">
        Thanks for sharing. Your testimonial is approved and may appear in
        case studies and sales materials (per your marketing-use setting).
      </p>
    );
  }
  if (existing.status === "declined") {
    return (
      <p className="text-[13.5px] text-ink-muted leading-relaxed max-w-xl mt-1">
        Our team flagged this one for another pass. Open the edit form below to
        revise — once submitted, we'll re-review.
      </p>
    );
  }
  return (
    <p className="text-[13.5px] text-ink-muted leading-relaxed max-w-xl mt-1">
      Your testimonial is in the review queue. You'll be notified when it's
      live. Want to tweak it? Open the editor below.
    </p>
  );
}
