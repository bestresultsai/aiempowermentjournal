import { useLocation, Link, Navigate } from "react-router-dom";
import {
  Sparkles, Clock, TrendingUp, Calendar as CalendarIcon, DollarSign,
  ArrowRight, PlusCircle, Lightbulb,
} from "lucide-react";
import NavBar from "../components/NavBar";
import {
  calcTimeSaved,
  calcPercentSavedHours,
  calcAnnualTimeSaved,
  calcAnnualValue,
  formatCurrency,
  formatHours,
} from "../lib/calculations";

// ---------------------------------------------------------------------------
// /journal/result — post-submit confirmation.
//
// Rebuilt to match the current Journal.jsx aesthetic (surface-card + brand
// Tailwind tokens) rather than the legacy inline-style blue gradient. Shows
// the four impact stats, quality/scope/frequency chips, and any innovation.
// ---------------------------------------------------------------------------
export default function JournalResult() {
  const { state } = useLocation();

  if (!state) return <Navigate to="/journal" />;

  const hoursWithout = parseFloat(state.hoursWithoutAI);
  const hoursWith = parseFloat(state.hoursWithAI);
  const timeSaved = calcTimeSaved(hoursWithout, hoursWith);
  const percentSaved = calcPercentSavedHours(hoursWithout, hoursWith);
  const annualTime = calcAnnualTimeSaved(hoursWithout, hoursWith, state.frequency);
  const annualValue = calcAnnualValue(hoursWithout, hoursWith, state.frequency);

  const qualityTone =
    state.qualityOutcome === "Better than original"
      ? { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" }
      : state.qualityOutcome === "Equal to original"
        ? { bg: "bg-brand-50", text: "text-brand-700", border: "border-brand-100" }
        : { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" };

  return (
    <div className="min-h-screen bg-surface-paper">
      <NavBar />
      <main className="max-w-2xl mx-auto px-6 lg:px-10 py-10 space-y-6 animate-fade-in-up">
        {/* Header */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-heading font-bold uppercase tracking-wider border border-emerald-200">
            <Sparkles className="w-3 h-3" strokeWidth={3} />
            Entry logged
          </div>
          <h1 className="font-heading text-[30px] lg:text-[36px] font-extrabold tracking-tight text-ink leading-[1.1]">
            Nice work.
          </h1>
          <p className="text-[14px] text-ink-muted">
            Here's the impact of{" "}
            <strong className="text-ink">{state.projectName || "your entry"}</strong>.
          </p>
        </header>

        {/* Impact grid — four stats on brand-tinted surface cards. */}
        <section className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Clock}
            label="Time saved"
            value={`${timeSaved.toFixed(1)}h`}
            accent="brand"
          />
          <StatCard
            icon={TrendingUp}
            label="Efficiency gain"
            value={`${percentSaved.toFixed(0)}%`}
            accent="emerald"
          />
          <StatCard
            icon={CalendarIcon}
            label="Annual time saved"
            value={`${formatHours(annualTime)}h`}
            accent="brand"
          />
          <StatCard
            icon={DollarSign}
            label="Annual value"
            value={formatCurrency(annualValue)}
            accent="emerald"
          />
        </section>

        {/* Chips + optional innovation callout */}
        <section className="rounded-2xl bg-surface-card border border-soft p-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Chip className={`${qualityTone.bg} ${qualityTone.text} ${qualityTone.border}`}>
              Quality: {state.qualityOutcome}
            </Chip>
            <Chip className="bg-violet-50 text-violet-700 border-violet-200">
              {state.scope}
            </Chip>
            <Chip className="bg-surface-soft text-ink-muted border-soft">
              {state.frequency}
            </Chip>
          </div>

          {state.innovationTitle && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <div className="inline-flex items-center gap-1.5 text-[12px] font-heading font-bold text-amber-900">
                <Lightbulb className="w-3.5 h-3.5" strokeWidth={2.5} />
                Innovation: {state.innovationTitle}
              </div>
              {state.innovationDescription && (
                <p className="text-[12.5px] text-amber-900/80 mt-1 leading-relaxed">
                  {state.innovationDescription}
                </p>
              )}
            </div>
          )}
        </section>

        {/* CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Link
            to="/journal"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-ink text-white text-[14px] font-heading font-semibold hover:bg-brand-700 transition-colors duration-200"
          >
            <PlusCircle className="w-4 h-4" strokeWidth={2.5} />
            Log another
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-soft text-ink text-[14px] font-heading font-semibold hover:border-brand-500 hover:bg-brand-50/40 transition-all duration-200"
          >
            View dashboard
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </Link>
        </div>
      </main>
    </div>
  );
}

// StatCard — one of the four impact tiles. Same visual language the rest of
// the participant app uses for stat cards, so this page stops feeling like
// a foreign island.
function StatCard({ icon: Icon, label, value, accent = "brand" }) {
  const toneMap = {
    brand: {
      iconBg: "bg-brand-100 text-brand-700",
      valueColor: "text-ink",
    },
    emerald: {
      iconBg: "bg-emerald-100 text-emerald-700",
      valueColor: "text-ink",
    },
  };
  const t = toneMap[accent] || toneMap.brand;
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-4">
      <div className={`w-9 h-9 rounded-xl ${t.iconBg} flex items-center justify-center mb-2`}>
        <Icon className="w-4.5 h-4.5" strokeWidth={2.25} />
      </div>
      <div className="text-[11px] font-heading font-bold uppercase tracking-wider text-ink-muted">
        {label}
      </div>
      <div className={`font-heading text-[26px] font-extrabold tracking-tight ${t.valueColor} mt-0.5`}>
        {value}
      </div>
    </div>
  );
}

function Chip({ className = "", children }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-heading font-semibold border " +
        className
      }
    >
      {children}
    </span>
  );
}
