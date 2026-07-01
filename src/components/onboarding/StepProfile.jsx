import { User, Briefcase, Linkedin, MapPin, Globe, Edit3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FormField } from "./FormField";
import PhotoUpload from "./PhotoUpload";
import Select from "../Select";
import { getInitialsForUser } from "../../lib/userDisplay";
import {
  COUNTRY_OPTIONS,
  getStateOptionsForCountry,
  getTimeZoneForLocation,
} from "../../lib/locationToTimeZone";
import { TIME_ZONES } from "../../lib/timeZones";

// ---------------------------------------------------------------------------
// Step 2 — Profile. Captures name + role + LinkedIn + headshot + location.
//
// Location section flow:
//   1. Country dropdown (defaults to US)
//   2. State / Province dropdown (only when US or Canada)
//   3. City free text
//   4. Time zone — auto-derived from (country, state); shown read-only with
//      an "Edit" affordance that swaps in a time-zone picker. Users get a
//      sensible default without thinking about it but can override.
//
// `form` and `update(field, value)` come from the parent wizard. `email` is
// used as a fallback when the name field is still empty so the avatar bubble
// shows a friendly letter instead of "?". `namePrefilled` is true when the
// parent guessed the name from the email — we surface a small hint so the
// user knows to double-check it.
// ---------------------------------------------------------------------------

const TIME_ZONE_OPTIONS = TIME_ZONES.map((t) => ({ value: t.value, label: t.label }));

export default function StepProfile({ form, update, email, namePrefilled }) {
  // Best-effort initials: form.name first, else derived from email, else "?".
  const initials = getInitialsForUser({ name: form.name, email });

  const stateOptions = useMemo(
    () => getStateOptionsForCountry(form.country),
    [form.country],
  );

  // Whether the user has manually picked a time zone overriding the derived
  // value. Persisted so the auto-derivation effect doesn't fight them.
  const [tzManual, setTzManual] = useState(!!form.timeZoneOverride);

  // Auto-derive the time zone whenever country/state change, unless the user
  // has explicitly overridden. This keeps the time zone in sync without
  // surprise resets.
  useEffect(() => {
    if (tzManual) return;
    const derived = getTimeZoneForLocation({
      country: form.country,
      state: form.state,
    });
    if (derived !== form.defaultTimeZone) {
      update("defaultTimeZone", derived);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.country, form.state, tzManual]);

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
          placeholder="Full name"
          required
          hint={
            namePrefilled
              ? "We guessed this from your email — double-check and edit if needed."
              : undefined
          }
        />
        <FormField
          label="Role / Title"
          icon={Briefcase}
          value={form.title}
          onChange={(v) => update("title", v)}
          placeholder="Job title"
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

      {/* Location section — drives default time zone for the cohort calendar */}
      <div className="rounded-2xl border border-soft bg-surface-card p-5 space-y-4">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-ink-muted" strokeWidth={2.5} />
          <div className="text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted">
            Location
          </div>
        </div>
        <p className="text-[12.5px] text-ink-muted -mt-2 leading-relaxed">
          We use this to set your time zone for session reminders. You can
          adjust it any time from Settings.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <LocationSelect
            label="Country"
            value={form.country || "US"}
            onChange={(v) => {
              update("country", v);
              update("state", ""); // reset state when country changes
            }}
            options={COUNTRY_OPTIONS}
          />
          {stateOptions.length > 0 ? (
            <LocationSelect
              label={form.country === "CA" ? "Province" : "State"}
              value={form.state || ""}
              onChange={(v) => update("state", v)}
              options={[{ value: "", label: "— Pick one —" }, ...stateOptions]}
            />
          ) : (
            <FormField
              label="State / Region"
              value={form.state || ""}
              onChange={(v) => update("state", v)}
              placeholder="(Optional)"
            />
          )}
        </div>

        <FormField
          label="City"
          value={form.city || ""}
          onChange={(v) => update("city", v)}
          placeholder="City"
        />

        {/* Derived time zone — read-only with edit affordance. */}
        <div>
          <div className="text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
            Time zone
          </div>
          {tzManual ? (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select
                  value={form.defaultTimeZone || ""}
                  onChange={(v) => update("defaultTimeZone", v)}
                  options={TIME_ZONE_OPTIONS}
                  icon={Globe}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setTzManual(false);
                  update("timeZoneOverride", false);
                }}
                className="text-[11.5px] font-heading font-semibold text-ink-muted hover:text-ink"
              >
                Reset to auto
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-soft bg-white px-3 py-2.5 inline-flex items-center gap-2 w-full">
              <Globe className="w-3.5 h-3.5 text-ink-muted shrink-0" strokeWidth={2.5} />
              <span className="font-heading font-semibold text-[13px] text-ink flex-1 truncate">
                {form.defaultTimeZone || getTimeZoneForLocation({
                  country: form.country,
                  state: form.state,
                })}
              </span>
              <button
                type="button"
                onClick={() => {
                  setTzManual(true);
                  update("timeZoneOverride", true);
                }}
                className="inline-flex items-center gap-1 text-[11.5px] font-heading font-semibold text-brand-700 hover:text-brand-800"
              >
                <Edit3 className="w-3 h-3" strokeWidth={2.5} />
                Override
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LocationSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
        {label}
      </span>
      <Select value={value} onChange={onChange} options={options} />
    </label>
  );
}
