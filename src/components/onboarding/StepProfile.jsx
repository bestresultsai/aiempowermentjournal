import { User, Briefcase, Linkedin } from "lucide-react";
import { FormField } from "./FormField";
import PhotoUpload from "./PhotoUpload";

// ---------------------------------------------------------------------------
// Step 2 — Profile. Captures name + role + LinkedIn + headshot.
// `form` and `update(field, value)` come from the parent wizard.
// ---------------------------------------------------------------------------

export default function StepProfile({ form, update }) {
  const initials = (form.name || "?")
    .split(" ").filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h2 className="font-heading text-[26px] lg:text-[30px] font-extrabold text-ink leading-tight">
          Tell us about yourself.
        </h2>
        <p className="text-[14px] text-ink-muted leading-relaxed max-w-lg">
          Your facilitator and cohort use this to recognize who you are.
          Nothing here is public outside the cohort.
        </p>
      </div>

      {/* Headshot */}
      <div className="rounded-2xl border border-soft bg-surface-card p-5">
        <div className="text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-3">
          Headshot
        </div>
        <PhotoUpload
          value={form.headshotUrl}
          onChange={(url) => update("headshotUrl", url)}
          initials={initials}
        />
      </div>

      {/* Name + Title */}
      <div className="grid sm:grid-cols-2 gap-4">
        <FormField
          label="Full name"
          icon={User}
          value={form.name}
          onChange={(v) => update("name", v)}
          placeholder="Josue Acuna"
          required
        />
        <FormField
          label="Role / Title"
          icon={Briefcase}
          value={form.title}
          onChange={(v) => update("title", v)}
          placeholder="Director of AI Strategy"
        />
      </div>

      {/* LinkedIn */}
      <FormField
        label="LinkedIn"
        icon={Linkedin}
        value={form.linkedin}
        onChange={(v) => update("linkedin", v)}
        placeholder="https://www.linkedin.com/in/yourname"
        hint="Optional. Helps your cohort find you outside of sessions."
      />
    </div>
  );
}
