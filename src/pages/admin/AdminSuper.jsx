import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Shield, Building2, GraduationCap, Users, NotebookPen, Database, BarChart3,
  Crown, ArrowRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { canManageRoles, getRoleLabel } from "../../lib/adminRoles";
import {
  getAllCohortsForAdmin,
  getAllOrganizations,
  getAllFacilitators,
  useCohortVersion,
} from "../../lib/cohortAdmin";
import { ADMIN_MOCK_PARTICIPANTS } from "../../lib/adminMockData";

// ---------------------------------------------------------------------------
// /admin/super — Super Admin settings + system overview.
//
// Reserved for ROLES.SUPER. Other users are redirected to /admin.
//
// Shows platform-wide stats + a directory of every known user with role
// information. The promote/demote controls are stubbed for now — they need
// a real auth backend before they can flip persisted roles.
// ---------------------------------------------------------------------------
export default function AdminSuper() {
  const { user } = useAuth();
  const version = useCohortVersion();

  if (!canManageRoles(user)) {
    return <Navigate to="/admin" replace />;
  }

  const cohorts = useMemo(() => getAllCohortsForAdmin(), [version]);
  const orgs = useMemo(() => getAllOrganizations(), [version]);
  const facilitators = useMemo(() => getAllFacilitators(), [version]);
  const participants = ADMIN_MOCK_PARTICIPANTS;

  // Aggregate everyone known to the platform — participants, facilitators,
  // org admins, super admins (just the signed-in user for now).
  const allUsers = useMemo(() => {
    const seen = new Map();
    // Super admin
    if (user?.email) {
      seen.set(user.email.toLowerCase(), {
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        organization: user.organization,
        headshotUrl: user.headshotUrl,
      });
    }
    // Facilitators
    for (const f of facilitators) {
      const key = f.email?.toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.set(key, {
        name: f.name,
        email: f.email,
        role: "facilitator",
        title: f.title,
        organization: "BestResults.AI",
        headshotUrl: f.headshotUrl,
      });
    }
    // Participants
    for (const p of participants) {
      const key = p.email?.toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.set(key, {
        name: p.name,
        email: p.email,
        role: p.isCohortLead ? "cohort-leader" : "participant",
        title: p.title,
        organization: p.organization,
      });
    }
    return [...seen.values()];
  }, [user, facilitators, participants]);

  // Total minutes saved across every entry on the platform.
  const totalMinutesSaved = participants.reduce((sum, p) => {
    for (const e of p.journalEntries || []) {
      const before = Number(e.timeBeforeAI) || 0;
      const after = Number(e.timeWithAI) || 0;
      sum += Math.max(0, before - after);
    }
    return sum;
  }, 0);

  const stats = [
    { label: "Organizations", value: orgs.length, icon: Building2, color: "brand", to: "/admin/orgs" },
    { label: "Cohorts", value: cohorts.length, icon: GraduationCap, color: "brand", to: "/admin/cohorts" },
    { label: "Facilitators", value: facilitators.length, icon: Users, color: "emerald", to: "/admin/facilitators" },
    { label: "Participants", value: participants.length, icon: Users, color: "brand", to: "/admin/users" },
    { label: "Hours saved (total)", value: Math.round(totalMinutesSaved / 60), icon: NotebookPen, color: "emerald", to: "/admin/journal" },
    { label: "All users", value: allUsers.length, icon: Database, color: "purple", to: null },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      <header className="flex items-start gap-3 flex-wrap">
        <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
          <Shield className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-eyebrow">Admin · Super</div>
          <h1 className="font-heading text-[28px] lg:text-[34px] font-extrabold tracking-tight text-ink leading-tight">
            Super Admin
          </h1>
          <p className="text-[14px] text-ink-muted mt-1.5 max-w-2xl">
            Platform-wide overview + user directory. Reserved for super admins.
          </p>
        </div>
      </header>

      {/* Stats grid */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <StatTile key={s.label} {...s} />
        ))}
      </section>

      {/* User directory */}
      <section>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <BarChart3 className="w-4 h-4 text-purple-700" strokeWidth={2.5} />
          <h2 className="font-heading text-[14px] font-extrabold text-ink">
            All users · {allUsers.length}
          </h2>
          <span className="text-[11.5px] text-ink-muted">
            Promote/demote controls require backend auth — coming with real magic-link auth.
          </span>
        </div>
        <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_220px_160px_140px] gap-4 px-5 py-3 border-b border-soft bg-surface-soft text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
            <div>User</div>
            <div>Email</div>
            <div>Role</div>
            <div>Organization</div>
          </div>
          {allUsers.map((u) => (
            <UserRow key={u.email} user={u} />
          ))}
        </div>
      </section>
    </div>
  );
}

function StatTile({ label, value, icon: Icon, color, to }) {
  const palette = {
    brand: { bg: "bg-brand-50", text: "text-brand-700" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700" },
    purple: { bg: "bg-purple-50", text: "text-purple-700" },
  }[color] || { bg: "bg-ink/5", text: "text-ink-muted" };

  const Inner = (
    <div className="rounded-2xl bg-surface-card border border-soft p-4 hover:border-brand-500 hover:shadow-card transition-all duration-200 h-full">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg ${palette.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${palette.text}`} strokeWidth={2.5} />
        </div>
        {to && <ArrowRight className="w-3.5 h-3.5 text-ink-subtle ml-auto" strokeWidth={2.5} />}
      </div>
      <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
        {label}
      </div>
      <div className="font-heading text-[24px] font-extrabold text-ink mt-0.5 leading-none">
        {value}
      </div>
    </div>
  );

  return to ? (
    <Link to={to} className="block">
      {Inner}
    </Link>
  ) : (
    Inner
  );
}

function UserRow({ user: u }) {
  const initials = (u.name || u.email || "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const roleMeta = {
    super:          { label: "Super Admin",   bg: "bg-purple-50",  text: "text-purple-700", icon: Shield },
    admin:          { label: "Admin",         bg: "bg-brand-50",   text: "text-brand-700",  icon: Shield },
    org:            { label: "Org Admin",     bg: "bg-brand-50",   text: "text-brand-700",  icon: Building2 },
    facilitator:    { label: "Facilitator",   bg: "bg-emerald-50", text: "text-emerald-700", icon: GraduationCap },
    "cohort-leader":{ label: "Cohort Leader", bg: "bg-amber-50",   text: "text-amber-800",  icon: Crown },
    participant:    { label: "Participant",   bg: "bg-ink/5",      text: "text-ink-muted",  icon: Users },
  }[u.role] || { label: getRoleLabel(u.role) || u.role || "—", bg: "bg-ink/5", text: "text-ink-muted", icon: Users };
  const RoleIcon = roleMeta.icon;

  return (
    <div className="px-5 py-3.5 grid md:grid-cols-[1fr_220px_160px_140px] gap-4 items-center border-b border-soft last:border-b-0 hover:bg-surface-soft transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {u.headshotUrl ? (
          <img src={u.headshotUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-brand-700 text-white inline-flex items-center justify-center text-[11px] font-heading font-bold shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-heading text-[13.5px] font-bold text-ink truncate">
            {u.name || u.email}
          </div>
          {u.title && (
            <div className="text-[11px] text-ink-muted truncate">{u.title}</div>
          )}
        </div>
      </div>
      <div className="text-[12.5px] text-ink-muted truncate">{u.email}</div>
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-heading font-bold w-fit ${roleMeta.bg} ${roleMeta.text}`}>
        <RoleIcon className="w-3 h-3" strokeWidth={2.5} />
        {roleMeta.label}
      </span>
      <div className="text-[12.5px] text-ink-muted truncate">
        {u.organization || "—"}
      </div>
    </div>
  );
}
