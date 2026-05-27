// A platform-level welcome banner shown at the top of authenticated pages
// (cohort page, dashboard, etc.). Personalized when a user is signed in,
// generic otherwise. Designed to read as a calm, friendly opener — not a CTA.

export default function WelcomeBanner({ user, subtitle }) {
  const firstName = user?.name?.split(" ")[0] || null;
  const today = new Date();
  const hour = today.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <section className="mb-6 rounded-2xl bg-surface-card border border-soft px-6 py-5 flex items-center justify-between gap-4 flex-wrap shadow-card">
      <div>
        {firstName ? (
          <>
            <h2 className="font-heading text-[22px] font-extrabold tracking-tight text-ink">
              {greeting}, {firstName}{" "}
              <span className="text-[20px]">👋</span>
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
      <div className="hidden md:flex items-center gap-2">
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
    </section>
  );
}
