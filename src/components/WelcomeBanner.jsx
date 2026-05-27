import { Sparkles, Flame, Calendar as CalendarIcon } from "lucide-react";

// `streak` is the current logging streak in weeks (computed by parent from entries).
export default function WelcomeBanner({ user, subtitle, streak = 0 }) {
  const firstName = user?.name?.split(" ")[0] || null;
  const today = new Date();
  const hour = today.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <section className="mb-6 rounded-2xl bg-surface-card border border-soft px-6 py-5 flex items-center justify-between gap-4 flex-wrap shadow-card animate-fade-in-up">
      <div className="flex items-center gap-4">
        {firstName && (
          <div className="hidden sm:flex w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 items-center justify-center">
            <Sparkles className="w-5 h-5" strokeWidth={2} />
          </div>
        )}
        <div>
          {firstName ? (
            <>
              <h2 className="font-heading text-[22px] font-extrabold tracking-tight text-ink">
                {greeting}, {firstName}.
              </h2>
              <p className="text-[13.5px] text-ink-muted mt-0.5">
                {subtitle || "Welcome back to the BestResults.AI Platform."}
              </p>
            </>
          ) : (
            <>
              <h2 className="font-heading text-[22px] font-extrabold tracking-tight text-ink">
                Welcome to the BestResults.AI Platform
              </h2>
              <p className="text-[13.5px] text-ink-muted mt-0.5">
                {subtitle ||
                  "Your AI Empowerment cohort, sessions, and journal — all in one place."}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {streak > 0 && firstName && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
            <Flame className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span className="text-[11px] font-heading font-bold uppercase tracking-wider">
              Active Streak · {streak} {streak === 1 ? "week" : "weeks"}
            </span>
          </div>
        )}
        <div className="hidden md:flex items-center gap-2 text-ink-muted">
          <CalendarIcon className="w-4 h-4" strokeWidth={2} />
          <span className="h-eyebrow !text-[10px]">Today</span>
          <span className="text-[13px] font-heading font-semibold text-ink">
            {today.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </section>
  );
}
