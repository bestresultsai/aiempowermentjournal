import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  Shield, Building2, GraduationCap, Users, NotebookPen, Database, BarChart3,
  Crown, ArrowRight, Download, CheckSquare, Square, X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { canManageRoles, getRoleLabel, userCapabilities } from "../../lib/adminRoles";
import {
  getAllCohortsForAdmin,
  getAllOrganizations,
  getAllFacilitators,
  useCohortVersion,
} from "../../lib/cohortAdmin";
import {
  ADMIN_MOCK_PARTICIPANTS,
  assignParticipantsToCohort,
} from "../../lib/adminMockData";
import { downloadCSV } from "../../lib/csvExport";

// ---------------------------------------------------------------------------
// /admin/super — Super Admin settings + user directory.
//
// Reserved for ROLES.SUPER. Other users are redirected to /admin.
//
// Surfaces:
//   - 5 stat tiles (orgs / cohorts / facilitators / participants / all users)
//   - Role-filtered user directory with cohort + org sub-filters
//   - Bulk-select + bulk actions (Export CSV; Assign to cohort for participants)
//   - Click any row → opens that user's profile (admin/users/:id for
//     participants, admin/facilitators?edit=:id for facilitators)
// ---------------------------------------------------------------------------

const ROLE_FILTERS = [
  { key: "all",            label: "All",          icon: Database },
  { key: "participant",    label: "Participants", icon: Users },
  { key: "facilitator",    label: "Facilitators", icon: GraduationCap },
  { key: "cohort-leader",  label: "Cohort Leaders", icon: Crown },
  { key: "org",            label: "Org Admins",   icon: Building2 },
  { key: "admin",          label: "Admins",       icon: Shield },
  { key: "super",          label: "Super Admins", icon: Shield },
];

// Display order for capability chips on each row — most powerful first.
const ROLE_PRIORITY = ["super", "admin", "org", "facilitator", "cohort-leader", "participant"];

// Chip styling per role. `short` is what we render inside the small chips.
const ROLE_CHIP_META = {
  super:           { label: "Super Admin",   short: "Super",       bg: "bg-purple-50",  text: "text-purple-700", icon: Shield },
  admin:           { label: "Admin",         short: "Admin",       bg: "bg-brand-50",   text: "text-brand-700",  icon: Shield },
  org:             { label: "Org Admin",     short: "Org",         bg: "bg-brand-50",   text: "text-brand-700",  icon: Building2 },
  facilitator:     { label: "Facilitator",   short: "Facilitator", bg: "bg-emerald-50", text: "text-emerald-700", icon: GraduationCap },
  "cohort-leader": { label: "Cohort Leader", short: "Leader",      bg: "bg-amber-50",   text: "text-amber-800",  icon: Crown },
  participant:     { label: "Participant",   short: "Participant", bg: "bg-ink/5",      text: "text-ink-muted",  icon: Users },
};

export default function AdminSuper() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const version = useCohortVersion();

  if (!canManageRoles(user)) {
    return <Navigate to="/admin" replace />;
  }

  const cohorts = useMemo(() => getAllCohortsForAdmin(), [version]);
  const orgs = useMemo(() => getAllOrganizations(), [version]);
  const facilitators = useMemo(() => getAllFacilitators(), [version]);
  const participants = ADMIN_MOCK_PARTICIPANTS;

  // Aggregate every known user into a single directory.
  const allUsers = useMemo(() => {
    const seen = new Map();
    // Build a capability list per user. The Super Admin directory shows ALL
    // roles a user holds, not just the primary one.
    function ensureUser(key, base) {
      if (!seen.has(key)) {
        seen.set(key, { ...base, capabilities: new Set() });
      }
      return seen.get(key);
    }
    // Signed-in user — usually super.
    if (user?.email) {
      const key = user.email.toLowerCase();
      const u = ensureUser(key, {
        key,
        id: user.userId || user.email,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        organization: user.organization,
        organizationId: null,
        cohortSlug: null,
        headshotUrl: user.headshotUrl,
        sourceType: "auth",
      });
      for (const c of userCapabilities(user)) u.capabilities.add(c);
    }
    // Facilitators. Mike's seed already includes capabilities ["facilitator","admin"].
    for (const f of facilitators) {
      const key = f.email?.toLowerCase();
      if (!key) continue;
      const u = ensureUser(key, {
        key,
        id: f.id,
        name: f.name,
        email: f.email,
        role: "facilitator",
        title: f.title || "Facilitator",
        organization: "BestResults.AI",
        organizationId: null,
        cohortSlug: null,
        headshotUrl: f.headshotUrl,
        sourceType: "facilitator",
      });
      u.capabilities.add("facilitator");
      if (Array.isArray(f.capabilities)) {
        for (const c of f.capabilities) u.capabilities.add(c);
      }
    }
    // Participants — cohort leaders also get the cohort-leader capability.
    for (const p of participants) {
      const key = p.email?.toLowerCase();
      if (!key) continue;
      const cohort = cohorts.find((c) => c.slug === p.cohortSlug);
      const u = ensureUser(key, {
        key,
        id: p.id,
        name: p.name,
        email: p.email,
        role: p.isCohortLead ? "cohort-leader" : "participant",
        title: p.title,
        organization: p.organization,
        organizationId: cohort?.organization?.id || null,
        cohortSlug: p.cohortSlug || null,
        headshotUrl: null,
        sourceType: "participant",
      });
      u.capabilities.add("participant");
      if (p.isCohortLead) u.capabilities.add("cohort-leader");
      // Extra capabilities granted via the participant profile editor.
      if (Array.isArray(p.capabilities)) {
        for (const c of p.capabilities) u.capabilities.add(c);
      }
    }
    // Materialize capability Set → array for downstream consumers.
    return [...seen.values()].map((u) => ({
      ...u,
      capabilityList: [...u.capabilities],
    }));
  }, [user, facilitators, participants, cohorts]);

  // --- Filter state --------------------------------------------------------
  const [roleFilter, setRoleFilter] = useState("all");
  const [cohortFilter, setCohortFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  // Bulk select state — set of user.key values.
  const [selected, setSelected] = useState(new Set());

  // Cohort + org filters only matter for facilitator/participant scope.
  const showSubFilters = roleFilter === "participant" || roleFilter === "facilitator" || roleFilter === "cohort-leader";

  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      // Match by capability list, not primary role — picking "Admins"
      // surfaces facilitator+admin users too.
      if (roleFilter !== "all" && !u.capabilityList?.includes(roleFilter)) return false;
      if (showSubFilters && cohortFilter !== "all") {
        if (u.sourceType === "facilitator") {
          // Facilitator passes if they run this cohort.
          const fid = u.id;
          if (!cohorts.some((c) => c.slug === cohortFilter && (c.facilitator?.id === fid || c.trainer?.id === fid))) return false;
        } else {
          if (u.cohortSlug !== cohortFilter) return false;
        }
      }
      if (showSubFilters && orgFilter !== "all") {
        if (u.sourceType === "facilitator") {
          const fid = u.id;
          if (!cohorts.some((c) => c.organization?.id === orgFilter && (c.facilitator?.id === fid || c.trainer?.id === fid))) return false;
        } else {
          if (u.organizationId !== orgFilter) return false;
        }
      }
      return true;
    });
  }, [allUsers, roleFilter, cohortFilter, orgFilter, showSubFilters, cohorts]);

  // Selection helpers
  const allSelected = filteredUsers.length > 0 && filteredUsers.every((u) => selected.has(u.key));
  function toggleOne(key) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredUsers.map((u) => u.key)));
    }
  }
  function clearSelection() {
    setSelected(new Set());
  }

  // Bulk: export selected as CSV.
  function handleExport() {
    const selectedUsers = filteredUsers.filter((u) => selected.has(u.key));
    const header = ["Name", "Email", "Role", "Title", "Organization", "Cohort"];
    const rows = selectedUsers.map((u) => [
      u.name || "",
      u.email || "",
      u.role || "",
      u.title || "",
      u.organization || "",
      u.cohortSlug || "",
    ]);
    downloadCSV(`users-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  }

  // Bulk: assign selected PARTICIPANTS to a cohort. Skips non-participants.
  const [bulkCohortSlug, setBulkCohortSlug] = useState("");
  function handleAssignToCohort() {
    if (!bulkCohortSlug) return;
    const participantIds = filteredUsers
      .filter((u) => selected.has(u.key) && u.sourceType === "participant")
      .map((u) => u.id);
    if (participantIds.length === 0) return;
    assignParticipantsToCohort(participantIds, bulkCohortSlug);
    clearSelection();
    setBulkCohortSlug("");
  }

  // Row click → route to that user's profile / edit surface.
  function handleRowClick(u) {
    if (u.sourceType === "participant") {
      navigate(`/admin/users/${u.id}`);
    } else if (u.sourceType === "facilitator") {
      navigate(`/admin/facilitators?edit=${u.id}`);
    }
    // auth (self) does nothing
  }

  const stats = [
    { label: "Organizations", value: orgs.length, icon: Building2, color: "brand", to: "/admin/orgs" },
    { label: "Cohorts", value: cohorts.length, icon: GraduationCap, color: "brand", to: "/admin/cohorts" },
    { label: "Facilitators", value: facilitators.length, icon: Users, color: "emerald", to: "/admin/facilitators" },
    { label: "Participants", value: participants.length, icon: Users, color: "brand", to: "/admin/users" },
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

      {/* Stats grid (no Hours saved tile) */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((s) => (
          <StatTile key={s.label} {...s} />
        ))}
      </section>

      {/* Directory */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <BarChart3 className="w-4 h-4 text-purple-700" strokeWidth={2.5} />
          <h2 className="font-heading text-[14px] font-extrabold text-ink">
            All users · {filteredUsers.length}
            {filteredUsers.length !== allUsers.length && (
              <span className="text-ink-muted font-medium"> of {allUsers.length}</span>
            )}
          </h2>
        </div>

        {/* Role filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {ROLE_FILTERS.map((rf) => {
            const Icon = rf.icon;
            const active = roleFilter === rf.key;
            return (
              <button
                key={rf.key}
                type="button"
                onClick={() => {
                  setRoleFilter(rf.key);
                  setCohortFilter("all");
                  setOrgFilter("all");
                  clearSelection();
                }}
                className={
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-heading font-bold transition-colors " +
                  (active
                    ? "bg-purple-600 text-white"
                    : "bg-surface-soft text-ink-muted hover:text-ink hover:bg-ink/5")
                }
              >
                <Icon className="w-3 h-3" strokeWidth={2.5} />
                {rf.label}
              </button>
            );
          })}
        </div>

        {/* Sub-filters: Cohort + Org */}
        {showSubFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <SelectFilter
              label="Cohort"
              value={cohortFilter}
              onChange={setCohortFilter}
              options={[
                { value: "all", label: "All cohorts" },
                ...cohorts.map((c) => ({ value: c.slug, label: c.name })),
              ]}
            />
            <SelectFilter
              label="Organization"
              value={orgFilter}
              onChange={setOrgFilter}
              options={[
                { value: "all", label: "All organizations" },
                ...orgs.map((o) => ({ value: o.id, label: o.name })),
              ]}
            />
            {(cohortFilter !== "all" || orgFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setCohortFilter("all");
                  setOrgFilter("all");
                }}
                className="text-[11.5px] font-heading font-semibold text-ink-muted hover:text-ink inline-flex items-center gap-1"
              >
                <X className="w-3 h-3" strokeWidth={2.5} />
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Bulk action bar — only when there's a selection */}
        {selected.size > 0 && (
          <div className="rounded-xl bg-purple-50 border border-purple-200 px-4 py-3 flex items-center gap-3 flex-wrap">
            <span className="text-[12.5px] font-heading font-bold text-purple-700">
              {selected.size} selected
            </span>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-purple-200 text-[12px] font-heading font-bold text-purple-700 hover:bg-purple-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
              Export CSV
            </button>

            {/* Assign-to-cohort only makes sense for selected participants. */}
            {filteredUsers.some((u) => selected.has(u.key) && u.sourceType === "participant") && (
              <div className="inline-flex items-center gap-1.5">
                <select
                  value={bulkCohortSlug}
                  onChange={(e) => setBulkCohortSlug(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-purple-200 text-[12px] font-heading font-semibold text-ink focus:outline-none"
                >
                  <option value="">Assign participants to cohort…</option>
                  {cohorts.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAssignToCohort}
                  disabled={!bulkCohortSlug}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-[12px] font-heading font-bold hover:bg-purple-700 transition-colors disabled:bg-purple-300 disabled:cursor-not-allowed"
                >
                  Assign
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={clearSelection}
              className="ml-auto text-[11.5px] font-heading font-semibold text-purple-700 hover:text-purple-900 inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" strokeWidth={2.5} />
              Clear
            </button>
          </div>
        )}

        {/* User table */}
        <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
          <div className="hidden md:grid grid-cols-[36px_1fr_220px_160px_160px] gap-4 px-5 py-3 border-b border-soft bg-surface-soft text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted items-center">
            <button
              type="button"
              onClick={toggleAll}
              aria-label={allSelected ? "Deselect all" : "Select all"}
              className="text-ink-muted hover:text-ink transition-colors"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-purple-700" strokeWidth={2.5} />
              ) : (
                <Square className="w-4 h-4" strokeWidth={2} />
              )}
            </button>
            <div>User</div>
            <div>Email</div>
            <div>Role</div>
            <div>Cohort / Organization</div>
          </div>
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-[13.5px] text-ink-muted">
              No users match the current filters.
            </div>
          ) : (
            filteredUsers.map((u) => (
              <UserRow
                key={u.key}
                user={u}
                selected={selected.has(u.key)}
                onToggle={() => toggleOne(u.key)}
                onOpen={() => handleRowClick(u)}
                cohorts={cohorts}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
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

function SelectFilter({ label, value, onChange, options }) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2.5 py-1.5 rounded-lg bg-white border border-soft text-[12px] font-heading font-semibold text-ink focus:outline-none focus:border-purple-400"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function UserRow({ user: u, selected, onToggle, onOpen, cohorts }) {
  const initials = (u.name || u.email || "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  // Resolve cohort name (if any) for the right column.
  const cohort = u.cohortSlug ? cohorts.find((c) => c.slug === u.cohortSlug) : null;
  // ALL capabilities the user holds, sorted by hierarchy (most powerful first).
  const orderedRoles = ROLE_PRIORITY.filter((r) => u.capabilityList?.includes(r));

  return (
    <div className="px-5 py-3.5 grid md:grid-cols-[36px_1fr_220px_160px_160px] gap-4 items-center border-b border-soft last:border-b-0 hover:bg-surface-soft transition-colors group">
      <button
        type="button"
        onClick={onToggle}
        aria-label={selected ? "Deselect row" : "Select row"}
        className="text-ink-muted hover:text-ink transition-colors"
      >
        {selected ? (
          <CheckSquare className="w-4 h-4 text-purple-700" strokeWidth={2.5} />
        ) : (
          <Square className="w-4 h-4" strokeWidth={2} />
        )}
      </button>
      <button
        type="button"
        onClick={onOpen}
        className="flex items-center gap-3 min-w-0 text-left"
      >
        {u.headshotUrl ? (
          <img src={u.headshotUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-brand-700 text-white inline-flex items-center justify-center text-[11px] font-heading font-bold shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-heading text-[13.5px] font-bold text-ink truncate group-hover:text-brand-700 transition-colors">
            {u.name || u.email}
          </div>
          {u.title && (
            <div className="text-[11px] text-ink-muted truncate">{u.title}</div>
          )}
        </div>
      </button>
      <button
        type="button"
        onClick={onOpen}
        className="text-[12.5px] text-ink-muted truncate text-left"
      >
        {u.email}
      </button>
      <div className="flex items-center gap-1 flex-wrap">
        {orderedRoles.length === 0 ? (
          <span className="text-[11.5px] text-ink-muted">—</span>
        ) : (
          orderedRoles.map((r) => {
            const meta = ROLE_CHIP_META[r] || ROLE_CHIP_META.participant;
            const Icon = meta.icon;
            return (
              <span
                key={r}
                title={meta.label}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-heading font-bold ${meta.bg} ${meta.text}`}
              >
                <Icon className="w-2.5 h-2.5" strokeWidth={2.5} />
                {meta.short}
              </span>
            );
          })
        )}
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="text-[12.5px] text-ink-muted truncate text-left"
      >
        {cohort ? `${cohort.name}` : (u.organization || "—")}
      </button>
    </div>
  );
}
