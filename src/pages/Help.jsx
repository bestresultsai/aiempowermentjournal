import { Link } from "react-router-dom";
import {
  LifeBuoy, ArrowLeft, Mail, Calendar, Lock, BookOpen, MessageSquare,
} from "lucide-react";
import NavBar from "../components/NavBar";

// ---------------------------------------------------------------------------
// /help — public support page.
//
// Linked from the footer + Login page. Public (no AuthGate / OnboardingGate
// bounce) so participants who can't sign in still reach us. Short by design —
// quick contact, scoped FAQ, links to legal.
// ---------------------------------------------------------------------------

const SUPPORT_EMAIL = "support@bestresults.ai";

export default function Help() {
  return (
    <div className="min-h-screen bg-surface-paper">
      <NavBar />
      <main className="max-w-3xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
        <div className="mb-10 animate-fade-in-up">
          <Link
            to="/home"
            className="inline-flex items-center gap-1 text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
            Back to platform
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center">
              <LifeBuoy className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="h-eyebrow">Support</div>
          </div>
          <h1 className="font-heading text-[34px] lg:text-[40px] font-extrabold tracking-tight text-ink leading-tight">
            How can we help?
          </h1>
          <p className="text-[14.5px] text-ink-muted mt-2 leading-relaxed max-w-xl">
            Stuck on something? Confused by a session? Wondering where a
            feature went? Reach out — a real person will read your message
            and reply within one business day.
          </p>
        </div>

        {/* Primary CTA — email */}
        <section className="rounded-2xl bg-gradient-to-br from-brand-50 via-surface-card to-amber-50/30 border border-brand-100 p-6 lg:p-7 mb-8 animate-fade-in-up delay-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white text-brand-700 flex items-center justify-center shadow-sm">
              <Mail className="w-5 h-5" strokeWidth={2} />
            </div>
            <h2 className="font-heading text-[18px] font-extrabold text-ink leading-tight">
              Email us
            </h2>
          </div>
          <p className="text-[13.5px] text-ink-muted leading-relaxed mb-4 max-w-lg">
            Fastest way to get help. Include screenshots if something looks
            broken — they help us track issues down faster.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=BestResults.AI%20-%20Help%20request`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink text-white text-[13.5px] font-heading font-bold hover:bg-ink/90 transition-colors"
          >
            <Mail className="w-4 h-4" strokeWidth={2.5} />
            {SUPPORT_EMAIL}
          </a>
        </section>

        {/* Quick FAQ */}
        <section className="space-y-3 mb-8 animate-fade-in-up delay-200">
          <h2 className="font-heading text-[20px] font-extrabold tracking-tight text-ink mb-3">
            Quick answers
          </h2>
          <FaqCard
            icon={Lock}
            question="I'm not getting the sign-in magic link."
          >
            Check your spam folder — the email comes from{" "}
            <code className="text-[12px] bg-ink/5 px-1 py-0.5 rounded">hello@bestresults.ai</code>. If
            it still isn't there after a couple of minutes, email us and we'll
            send a fresh link manually.
          </FaqCard>
          <FaqCard
            icon={Calendar}
            question="Where's my next session?"
          >
            Your cohort home (<Link to="/home" className="text-brand-700 underline underline-offset-2">/home</Link>)
            shows the next live session at the top, with a Zoom link when
            it's available. You can also click "Add to calendar" to drop the
            event into your own calendar app.
          </FaqCard>
          <FaqCard
            icon={BookOpen}
            question="A session video isn't showing."
          >
            Recordings are uploaded by your facilitator after each live
            session. If you don't see one for a session that's already
            happened, give it 24 hours — and email us if it's still missing
            after that.
          </FaqCard>
          <FaqCard
            icon={MessageSquare}
            question="I want to leave private feedback for my facilitator."
          >
            Open the session in question (<code className="text-[12px] bg-ink/5 px-1 py-0.5 rounded">/session/:order</code>),
            switch to the Feedback tab, leave a star rating + comment. Your
            facilitator sees it; nobody else does.
          </FaqCard>
        </section>

        {/* Legal links */}
        <section className="rounded-2xl border border-soft bg-surface-card p-5 lg:p-6 animate-fade-in-up delay-300">
          <h3 className="font-heading text-[14px] font-bold text-ink mb-3">
            Legal + policy
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/privacy"
              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-surface-soft text-ink text-[13px] font-heading font-semibold hover:bg-ink/5"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-surface-soft text-ink text-[13px] font-heading font-semibold hover:bg-ink/5"
            >
              Terms of Service
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function FaqCard({ icon: Icon, question, children }) {
  return (
    <details className="group rounded-2xl border border-soft bg-surface-card p-4 lg:p-5 [&[open]]:border-brand-200 transition-colors">
      <summary className="flex items-center gap-3 cursor-pointer list-none">
        <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" strokeWidth={2.25} />
        </div>
        <span className="font-heading font-bold text-[14.5px] text-ink leading-tight flex-1">
          {question}
        </span>
        <span className="text-ink-subtle group-open:rotate-45 transition-transform text-[20px] leading-none">
          +
        </span>
      </summary>
      <div className="text-[13.5px] text-ink-muted leading-relaxed mt-3 ml-12">
        {children}
      </div>
    </details>
  );
}
