import { Link } from "react-router-dom";
import { Home, ArrowRight, NotebookPen, GraduationCap } from "lucide-react";
import NavBar from "../components/NavBar";
import { useAuth } from "../context/AuthContext";

// ---------------------------------------------------------------------------
// /404 — the catch-all "page not found" page.
//
// Brand-styled, signed-in users get a NavBar so they can navigate anywhere.
// Signed-out users get a clean minimal layout with just a "go home" CTA.
// ---------------------------------------------------------------------------
export default function NotFound() {
  const { user } = useAuth();
  const showNav = !!user;

  return (
    <div className="min-h-screen bg-surface-paper">
      {showNav && <NavBar />}
      <main className="max-w-[680px] mx-auto px-6 py-16 lg:py-24 text-center animate-fade-in-up">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-[11px] font-heading font-bold uppercase tracking-wider mb-5">
          404 · Page not found
        </div>

        {/* Headline */}
        <h1 className="font-heading text-[40px] sm:text-[56px] font-extrabold tracking-tight text-ink leading-[1.05]">
          We can't find that page
        </h1>
        <p className="text-[15px] text-ink-muted mt-4 max-w-md mx-auto leading-relaxed">
          The link might be broken, the page may have moved, or you might be a
          step ahead of where we are. Head somewhere useful instead.
        </p>

        {/* Primary CTA */}
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Link
            to={showNav ? "/home" : "/"}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-ink text-white text-[14px] font-heading font-bold hover:bg-brand-700 transition-colors"
          >
            <Home className="w-4 h-4" strokeWidth={2.5} />
            {showNav ? "Back to Home" : "Back to bestresults.ai"}
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </Link>
        </div>

        {/* Quick links — signed-in users only */}
        {showNav && (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-md mx-auto">
            <QuickLink to="/journey" icon={GraduationCap} label="Journey" />
            <QuickLink to="/journal" icon={NotebookPen} label="Journal" />
            <QuickLink to="/settings" icon={Home} label="Settings" />
          </div>
        )}
      </main>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="group rounded-2xl bg-surface-card border border-soft p-4 hover:border-brand-500 hover:shadow-card transition-all duration-200 flex items-center gap-2.5"
    >
      <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" strokeWidth={2.5} />
      </div>
      <span className="text-[13.5px] font-heading font-bold text-ink group-hover:text-brand-700 transition-colors">
        {label}
      </span>
    </Link>
  );
}
