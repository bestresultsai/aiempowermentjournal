import { Lightbulb, Target } from "lucide-react";
import { FormTextarea } from "./FormField";

// ---------------------------------------------------------------------------
// Step 3 — Goals. Two short prompts: "Why AI?" and the user's main cohort
// goal. Both are required because they're the highest-leverage 1:1 prep
// material for the facilitator.
// ---------------------------------------------------------------------------

export default function StepGoals({ form, update }) {
  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h2 className="font-heading text-[26px] lg:text-[30px] font-extrabold text-ink leading-tight">
          What brings you here?
        </h2>
        <p className="text-[14px] text-ink-muted leading-relaxed max-w-lg">
          Two questions, a few sentences each. Your facilitator reads these
          before your first 1:1 — they shape the way the cohort is run for you.
        </p>
      </div>

      <Prompt
        icon={Lightbulb}
        title="Why AI, for you?"
        body="What pulled you toward this program? What's exciting, what's intimidating?"
      >
        <FormTextarea
          label="Your why"
          value={form.whyAi}
          onChange={(v) => update("whyAi", v)}
          placeholder="I keep watching my team lose hours to repetitive work that AI could handle. I want to be the person who shows them how — without overhyping it."
          rows={4}
          required
        />
      </Prompt>

      <Prompt
        icon={Target}
        title="Your main goal for this cohort"
        body="One outcome that would make these eight weeks unambiguously worth it."
      >
        <FormTextarea
          label="Your goal"
          value={form.mainGoal}
          onChange={(v) => update("mainGoal", v)}
          placeholder="Ship one AI-assisted internal tool that saves my team at least 5 hours a week by the end of the cohort."
          rows={3}
          required
        />
      </Prompt>
    </div>
  );
}

function Prompt({ icon: Icon, title, body, children }) {
  return (
    <div className="rounded-2xl border border-soft bg-surface-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
          <Icon className="w-4.5 h-4.5" strokeWidth={2.25} />
        </div>
        <div>
          <div className="font-heading font-bold text-ink text-[14.5px]">{title}</div>
          <div className="text-[12.5px] text-ink-muted leading-relaxed mt-0.5">{body}</div>
        </div>
      </div>
      {children}
    </div>
  );
}
