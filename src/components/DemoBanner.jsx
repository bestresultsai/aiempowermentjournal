import { Eye, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { isMultiCohortDemo } from "../lib/demoData";

// Renders only when demo mode is active. Tells the viewer they're in preview
// mode and gives them a quick exit.
export default function DemoBanner() {
  const { isDemo, exitDemo } = useAuth();
  if (!isDemo) return null;
  const multi = isMultiCohortDemo();

  function handleExit() {
    exitDemo();
    // Strip ?demo=1 from the URL so a refresh doesn't reactivate demo mode.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("demo");
      window.history.replaceState({}, "", url.toString());
    } catch {
      /* ignore */
    }
    // Reload so the page renders the signed-out state cleanly.
    window.location.reload();
  }

  return (
    <div
      role="status"
      className="w-full bg-violet-50 border-b border-violet-200 text-violet-900 text-[12.5px] font-heading"
    >
      <div className="max-w-[1180px] mx-auto px-6 lg:px-8 py-2 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5" strokeWidth={2.5} />
          <span className="font-semibold tracking-tight">
            Preview mode {multi ? "(multi-cohort)" : ""}
          </span>
          <span className="text-violet-700/80 hidden sm:inline">
            · You're viewing the platform as a {multi ? "multi-cohort participant" : "signed-in participant"}. Data shown is mock data.
          </span>
        </div>
        <button
          onClick={handleExit}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-violet-100 transition-colors text-[12px] font-semibold"
        >
          <X className="w-3 h-3" strokeWidth={2.5} />
          Exit demo
        </button>
      </div>
    </div>
  );
}
