import { Link } from "react-router-dom";
import { ArrowLeft, Copy } from "lucide-react";
import { BELT_COLORS, HERO_GRADIENT } from "../../lib/mockCohort";
import NavBar from "../../components/NavBar";

// ---------------------------------------------------------------------------
// /design/belts — a living design reference for the platform's color system.
// Shows each belt's gradient at large scale + hex codes, plus the cohort hero
// gradient. Useful for design QA and onboarding new contributors.
// ---------------------------------------------------------------------------

const BELT_ORDER = ["White", "Yellow", "Orange", "Green", "Blue", "Purple", "Brown", "Black"];

export default function BeltsPreview() {
  return (
    <div className="min-h-screen bg-surface-paper">
      <NavBar />
      <main className="max-w-[1180px] mx-auto px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link
              to="/cohort/iahe-aiew3-2026q1"
              className="inline-flex items-center gap-1.5 text-[13px] font-heading font-semibold text-brand-600 hover:text-brand-700 mb-3 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
              Back to cohort
            </Link>
            <div className="h-eyebrow mb-1">Design Reference</div>
            <h1 className="font-heading text-[36px] font-extrabold tracking-tight text-ink leading-tight">
              Belt Gradients
            </h1>
            <p className="text-[14px] text-ink-muted mt-2 max-w-2xl leading-relaxed">
              One gradient per belt — applied consistently to the Next Live countdown,
              the curriculum's session number badges, and the Next Milestone card.
              Anywhere a belt is represented, it uses this gradient.
            </p>
          </div>
        </div>

        {/* Hero gradient (top banner) */}
        <section className="mb-12 animate-fade-in-up">
          <h2 className="font-heading text-[20px] font-extrabold tracking-tight text-ink mb-4">
            Cohort Hero Gradient
          </h2>
          <p className="text-[13px] text-ink-muted mb-4 max-w-2xl">
            The brand-blue gradient used on the dark "cohort identity" banner at the top of every cohort page.
          </p>
          <GradientSwatch
            label="Cohort Hero · Brand Blue"
            gradient={HERO_GRADIENT}
            tokens={[
              { name: "Start", value: "#1E3A8A" },
              { name: "End",   value: "#2563EB" },
            ]}
            textColor="#FFFFFF"
            tall
          />
        </section>

        {/* Belts grid */}
        <section className="animate-fade-in-up delay-100">
          <h2 className="font-heading text-[20px] font-extrabold tracking-tight text-ink mb-4">
            8 Belts · AIEW3
          </h2>
          <p className="text-[13px] text-ink-muted mb-6 max-w-2xl">
            Each belt has a deep → light gradient that anchors its identity across the platform.
            Click a hex value to copy it.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BELT_ORDER.map((name, i) => {
              const belt = BELT_COLORS[name];
              if (!belt) return null;
              const startEnd = parseGradientStops(belt.gradient);
              return (
                <BeltCard
                  key={name}
                  name={name}
                  order={i + 1}
                  gradient={belt.gradient}
                  hex={belt.hex}
                  textColor={belt.contrast}
                  tokens={[
                    { name: "Start",       value: startEnd[0] },
                    { name: "End",         value: startEnd[1] },
                    { name: "Solid (badge)", value: belt.hex },
                  ]}
                />
              );
            })}
          </div>
        </section>

        {/* Usage notes */}
        <section className="mt-12 rounded-2xl bg-surface-card border border-soft p-6 animate-fade-in-up delay-200">
          <h2 className="font-heading text-[18px] font-extrabold tracking-tight text-ink mb-3">
            Where these are used
          </h2>
          <ul className="text-[13.5px] text-ink-muted leading-relaxed space-y-1.5 list-disc pl-5">
            <li><strong className="text-ink">Cohort Hero</strong> — the brand blue gradient (top banner).</li>
            <li><strong className="text-ink">Next Live Session</strong> — countdown block uses the next session's belt gradient.</li>
            <li><strong className="text-ink">Next Milestone</strong> — full-width card uses the next belt's gradient.</li>
            <li><strong className="text-ink">Curriculum / Session rows</strong> — each session's 56px number badge uses its belt's gradient.</li>
            <li><strong className="text-ink">Progress band</strong> — number scale (1–8) uses belt colors (no gradient, just hue indicators).</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

// ---- Sub-components ----

function GradientSwatch({ label, gradient, tokens, textColor = "#FFFFFF", tall = false }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-soft shadow-card">
      <div
        className={"relative " + (tall ? "h-44" : "h-32")}
        style={{ background: gradient, color: textColor }}
      >
        <div className="absolute inset-0 grain opacity-30 pointer-events-none" />
        <div className="relative h-full flex items-end p-5">
          <span className="font-heading font-extrabold text-[20px]">{label}</span>
        </div>
      </div>
      <div className="flex bg-surface-card border-t border-soft">
        {tokens.map((t) => (
          <CopyableToken key={t.name + t.value} {...t} />
        ))}
      </div>
    </div>
  );
}

function BeltCard({ name, order, gradient, hex, textColor, tokens }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-soft shadow-card transition-shadow duration-300 hover:shadow-lift">
      <div
        className="relative h-40"
        style={{ background: gradient, color: textColor }}
      >
        <div className="absolute inset-0 grain opacity-30 pointer-events-none" />
        <div className="relative h-full flex flex-col justify-between p-5">
          <div className="text-[11px] font-heading font-semibold tracking-[0.18em] uppercase opacity-70">
            Belt {order}
          </div>
          <div>
            <div className="font-heading text-[26px] font-extrabold leading-none">{name}</div>
            <div className="text-[11px] font-heading font-medium opacity-70 mt-1">
              {hex}
            </div>
          </div>
        </div>
      </div>
      <div className="flex bg-surface-card border-t border-soft">
        {tokens.map((t) => (
          <CopyableToken key={t.name + t.value} {...t} />
        ))}
      </div>
    </div>
  );
}

function CopyableToken({ name, value }) {
  return (
    <button
      onClick={() => {
        try {
          navigator.clipboard.writeText(value);
        } catch {
          /* ignore — no clipboard in some browsers */
        }
      }}
      className="group flex-1 flex flex-col items-start gap-0.5 px-3 py-2.5 text-left border-r border-soft last:border-r-0 hover:bg-surface-soft transition-colors"
      title="Click to copy"
    >
      <span className="text-[10px] font-heading font-semibold uppercase tracking-wider text-ink-muted">
        {name}
      </span>
      <span className="flex items-center gap-1.5 text-[12px] font-mono font-semibold text-ink">
        {value}
        <Copy className="w-3 h-3 text-ink-subtle opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={2} />
      </span>
    </button>
  );
}

// Parse a `linear-gradient(135deg, #XXXXXX 0%, #YYYYYY 100%)` string and return [start, end].
function parseGradientStops(gradient) {
  if (!gradient) return ["", ""];
  const hexes = gradient.match(/#[0-9A-Fa-f]{3,8}/g) || [];
  return [hexes[0] || "", hexes[1] || ""];
}
