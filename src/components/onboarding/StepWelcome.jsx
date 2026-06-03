import { Sparkles, Trophy, Users, Target } from "lucide-react";

// ---------------------------------------------------------------------------
// Step 1 — Welcome. No fields, just orientation. The user clicks "Let's go"
// to advance into the profile step.
// ---------------------------------------------------------------------------

export default function StepWelcome({ firstName }) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-[11px] font-heading font-bold uppercase tracking-wider">
          <Sparkles className="w-3 h-3" strokeWidth={3} />
          Welcome
        </div>
        <h1 className="font-heading text-[34px] lg:text-[40px] font-extrabold tracking-tight text-ink leading-[1.1]">
          {firstName ? `Welcome, ${firstName}.` : "Welcome to BRAI."}
        </h1>
        <p className="text-[15px] text-ink-muted leading-relaxed max-w-xl">
          You're about to start the AI Empowerment Journey — eight weekly sessions
          plus a weekly journal habit that turns AI from buzzword into your
          team's everyday tool. Before we drop you into your cohort, let's set
          you up properly.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <PreviewCard
          icon={Users}
          title="Your profile"
          body="Tell the cohort who you are so your facilitator and peers can recognize your work."
        />
        <PreviewCard
          icon={Target}
          title="Your goals"
          body="A few sentences on what brought you here. Your facilitator uses these in 1:1s."
        />
        <PreviewCard
          icon={Trophy}
          title="Then — your cohort"
          body="Belt-ranked sessions, weekly journal challenges, and the rest of the program."
        />
      </div>

      <p className="text-[12.5px] text-ink-subtle">
        Takes about two minutes. You can come back and edit anything later.
      </p>
    </div>
  );
}

function PreviewCard({ icon: Icon, title, body }) {
  return (
    <div className="rounded-2xl border border-soft bg-surface-card p-4 hover:border-brand-500 hover:shadow-card transition-all duration-200">
      <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
        <Icon className="w-4.5 h-4.5" strokeWidth={2.25} />
      </div>
      <div className="font-heading font-bold text-ink text-[14px] mb-1">{title}</div>
      <div className="text-[12.5px] text-ink-muted leading-relaxed">{body}</div>
    </div>
  );
}
