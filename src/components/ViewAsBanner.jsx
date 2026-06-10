import { Eye, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useViewAs, VIEW_AS_LABELS, primaryEffectiveRole } from "../lib/viewAs";

// ---------------------------------------------------------------------------
// ViewAsBanner — shown at the very top of the page whenever the signed-in
// user is previewing the platform as a lower role. Distinct color from the
// DemoBanner so the two are obviously different things.
//
// Renders nothing when no view-as mode is active or when the user can't
// step down to that role.
// ---------------------------------------------------------------------------

export default function ViewAsBanner() {
  const { user } = useAuth();
  const { mode, clear, availableRoles } = useViewAs(user);

  if (!mode) return null;
  if (!availableRoles.includes(mode)) return null;

  const realRole = primaryEffectiveRole(user);
  const realLabel = VIEW_AS_LABELS[realRole] || "Admin";
  const viewingLabel = VIEW_AS_LABELS[mode] || "Participant";

  return (
    <div className="sticky top-0 z-40 bg-amber-500 text-ink">
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 py-2 flex items-center gap-3 text-[12.5px] font-heading font-semibold">
        <Eye className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
        <span className="flex-1 min-w-0 truncate">
          Viewing as <strong className="font-extrabold">{viewingLabel}</strong>.
          You're really a <span className="opacity-80">{realLabel}</span>.
        </span>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-ink text-white text-[11.5px] font-heading font-bold hover:bg-ink/90 transition-colors"
        >
          <X className="w-3 h-3" strokeWidth={3} />
          Exit
        </button>
      </div>
    </div>
  );
}
