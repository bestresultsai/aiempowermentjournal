import { ArrowRight, ChevronRight, Repeat, Calendar, GraduationCap, Mail, Award, BookCheck, AlertTriangle, Building2, Crown, NotebookPen, Send } from "lucide-react";

// ---------------------------------------------------------------------------
// EmailWorkflowDiagram — visual map of the platform's email lifecycle.
//
// Five lifecycle stages, each a column of email cards with arrows showing
// triggers + chains. Built as data so the structure stays maintainable when
// templates are added.
//
// `onPreviewTemplate(templateId)` is invoked when an admin clicks a card —
// the parent (AdminEmails) flips back to the Templates view with that
// template selected.
// ---------------------------------------------------------------------------

// Each stage groups related templates. Within a stage, `steps` is rendered
// in order; arrows are drawn between adjacent steps.
const STAGES = [
  {
    id: "enrollment",
    label: "1 · Enrollment",
    icon: GraduationCap,
    tone: "brand",
    description:
      "Fires when a participant joins a cohort and completes /welcome. Sets the tone for the program.",
    steps: [
      {
        trigger: "Admin adds participant to a cohort",
        templateId: "welcome-to-cohort",
        recipient: "Participant",
        timing: "Immediate",
      },
      {
        trigger: "Participant completes /welcome wizard",
        templateId: "onboarding-confirmed",
        recipient: "Participant",
        timing: "Immediate",
      },
    ],
  },
  {
    id: "session-cycle",
    label: "2 · Per-session cycle",
    icon: Calendar,
    tone: "amber",
    description:
      "Repeats for every session in the cohort's curriculum. Reminders flow before the session; review + belt notifications flow after.",
    steps: [
      {
        trigger: "24 hours before session start",
        templateId: "session-reminder-24h",
        recipient: "Participant",
        timing: "Scheduled · T-24h",
      },
      {
        trigger: "1 hour before session start",
        templateId: "session-reminder-1h",
        recipient: "Participant",
        timing: "Scheduled · T-1h",
      },
      {
        trigger: "Participant marks the session complete",
        templateId: "belt-earned",
        recipient: "Participant",
        timing: "Immediate",
      },
      {
        trigger: "Facilitator publishes homework feedback",
        templateId: "homework-reviewed",
        recipient: "Participant",
        timing: "Immediate",
      },
    ],
  },
  {
    id: "recurring",
    label: "3 · Recurring digests",
    icon: Repeat,
    tone: "violet",
    description:
      "Weekly summaries. Sundays. Participants get a personal recap; org admins get a roll-up across their cohorts.",
    steps: [
      {
        trigger: "Every Sunday morning",
        templateId: "weekly-digest",
        recipient: "Participant",
        timing: "Scheduled · weekly",
      },
      {
        trigger: "Every Sunday morning",
        templateId: "org-weekly-report",
        recipient: "Org admin",
        timing: "Scheduled · weekly",
      },
    ],
  },
  {
    id: "facilitator-stream",
    label: "4 · Facilitator + leader stream",
    icon: BookCheck,
    tone: "emerald",
    description:
      "Operational notifications that keep facilitators and cohort leaders on top of their cohorts. Mostly trigger-based.",
    steps: [
      {
        trigger: "Participant submits homework",
        templateId: "new-homework-submitted",
        recipient: "Facilitator",
        timing: "Batched · hourly",
      },
      {
        trigger: "Participant flagged at-risk (14+ days idle)",
        templateId: "at-risk-alert",
        recipient: "Facilitator",
        timing: "Daily roll-up",
      },
      {
        trigger: "Admin assigns facilitator to a cohort",
        templateId: "cohort-assigned",
        recipient: "Facilitator",
        timing: "Immediate",
      },
      {
        trigger: "Org admin names a participant as cohort leader",
        templateId: "leader-invitation",
        recipient: "Cohort leader",
        timing: "Immediate",
      },
    ],
  },
  {
    id: "completion",
    label: "5 · Completion",
    icon: Award,
    tone: "rose",
    description:
      "Fires when the participant earns their certificate. Last touch from the platform — sets up the testimonial collection.",
    steps: [
      {
        trigger: "Participant earns the program certificate",
        templateId: "program-complete",
        recipient: "Participant",
        timing: "Immediate",
      },
    ],
  },
];

// Tone color map — kept in one place so adding a stage doesn't require
// recoloring step-level styles.
const TONE = {
  brand:   { headerBg: "bg-brand-50",   headerText: "text-brand-700",   border: "border-brand-200",   accent: "bg-brand-600",   line: "bg-brand-200" },
  amber:   { headerBg: "bg-amber-50",   headerText: "text-amber-700",   border: "border-amber-200",   accent: "bg-amber-500",   line: "bg-amber-200" },
  violet:  { headerBg: "bg-violet-50",  headerText: "text-violet-700",  border: "border-violet-200",  accent: "bg-violet-500",  line: "bg-violet-200" },
  emerald: { headerBg: "bg-emerald-50", headerText: "text-emerald-700", border: "border-emerald-200", accent: "bg-emerald-600", line: "bg-emerald-200" },
  rose:    { headerBg: "bg-rose-50",    headerText: "text-rose-700",    border: "border-rose-200",    accent: "bg-rose-500",    line: "bg-rose-200" },
};

const RECIPIENT_ICON = {
  "Participant":   NotebookPen,
  "Facilitator":   BookCheck,
  "Org admin":     Building2,
  "Cohort leader": Crown,
};

export default function EmailWorkflowDiagram({ templates = [], onPreviewTemplate }) {
  // Build a quick id → template label map so the diagram can show real names.
  const labelById = Object.fromEntries(templates.map((t) => [t.id, t.label]));

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="rounded-2xl bg-gradient-to-br from-surface-card to-brand-50/30 border border-soft p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-ink text-white flex items-center justify-center shrink-0">
            <Send className="w-4 h-4" strokeWidth={2.25} />
          </div>
          <div>
            <h2 className="font-heading text-[17px] font-extrabold text-ink leading-tight">
              The lifecycle, end to end
            </h2>
            <p className="text-[13px] text-ink-muted mt-1 max-w-2xl">
              Every platform email grouped by when it fires. Click any card to
              open the full template preview. Anything marked "scheduled" depends
              on the production backend wired in #399 — until then, sends route
              through the mailer stub.
            </p>
          </div>
        </div>
      </div>

      {STAGES.map((stage) => {
        const tone = TONE[stage.tone];
        const Icon = stage.icon;
        return (
          <section
            key={stage.id}
            className={"rounded-2xl border-2 " + tone.border + " bg-surface-card overflow-hidden"}
          >
            {/* Stage header */}
            <header className={"flex items-start gap-3 px-5 py-4 " + tone.headerBg}>
              <div className={"w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 " + tone.headerText}>
                <Icon className="w-5 h-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0">
                <div className={"h-eyebrow !" + tone.headerText.replace("text", "text").replace("-700", "-700")}>
                  Lifecycle stage
                </div>
                <h3 className="font-heading text-[18px] font-extrabold text-ink leading-tight">
                  {stage.label}
                </h3>
                <p className="text-[12.5px] text-ink-muted mt-0.5 max-w-2xl">
                  {stage.description}
                </p>
              </div>
            </header>

            {/* Step chain */}
            <div className="p-5">
              <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
                {stage.steps.map((step, i) => (
                  <StepCard
                    key={step.templateId}
                    step={step}
                    label={labelById[step.templateId] || step.templateId}
                    tone={tone}
                    onClick={() => onPreviewTemplate?.(step.templateId)}
                    isLast={i === stage.steps.length - 1}
                  />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* Legend */}
      <section className="rounded-2xl border border-soft bg-surface-card p-5">
        <h3 className="font-heading text-[13px] font-bold text-ink mb-3">Recipient legend</h3>
        <div className="flex items-center gap-4 flex-wrap text-[12.5px] text-ink-muted">
          {Object.entries(RECIPIENT_ICON).map(([label, Icon]) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5 text-ink-muted" strokeWidth={2.5} />
              {label}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function StepCard({ step, label, tone, onClick, isLast }) {
  const RecipientIcon = RECIPIENT_ICON[step.recipient] || Mail;
  return (
    <div className="flex items-stretch gap-2 shrink-0">
      <button
        type="button"
        onClick={onClick}
        className={"text-left w-[240px] rounded-xl border bg-white hover:border-ink/30 hover:shadow-lift transition-all p-3 flex flex-col " + tone.border}
      >
        <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle mb-1.5">
          Trigger
        </div>
        <div className="text-[11.5px] text-ink-muted leading-snug mb-3">
          {step.trigger}
        </div>

        <div className={"h-px w-full mb-3 " + tone.line} />

        <div className="flex items-center gap-1.5 mb-1">
          <Mail className="w-3 h-3 text-ink-subtle" strokeWidth={2.5} />
          <span className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
            Email
          </span>
        </div>
        <div className="font-heading text-[13px] font-extrabold text-ink leading-snug">
          {label}
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-muted">
          <RecipientIcon className="w-3 h-3" strokeWidth={2.5} />
          {step.recipient}
        </div>
        <div className="text-[10.5px] text-ink-subtle mt-1 truncate">
          {step.timing}
        </div>

        <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-heading font-semibold text-brand-700 self-start">
          Preview <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
        </div>
      </button>

      {/* Arrow between cards. Hidden after the last card. */}
      {!isLast && (
        <div className="flex items-center self-stretch text-ink-subtle">
          <ArrowRight className="w-5 h-5" strokeWidth={2} />
        </div>
      )}
    </div>
  );
}
