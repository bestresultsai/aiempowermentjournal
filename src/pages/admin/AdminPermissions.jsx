import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Shield, Lock, Check, X, Search, ChevronRight, AlertTriangle,
  Settings, Users as UsersIcon, RotateCcw,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { canManageRoles, ROLES, getRoleLabel, userCapabilities } from "../../lib/adminRoles";
import {
  PERMISSIONS,
  PERMISSION_GROUPS,
  ROLE_DEFAULTS,
  effectivePermissions,
  isPermissionGrantedByRole,
  setUserPermission,
} from "../../lib/permissions";
import {
  ADMIN_MOCK_PARTICIPANTS,
  getParticipantById,
} from "../../lib/adminMockData";
import {
  getAllFacilitators,
  useCohortVersion,
} from "../../lib/cohortAdmin";

// ---------------------------------------------------------------------------
// /admin/permissions — HubSpot-style permission management.
//
// Reserved for "permissions.manage" (defaults to Super only).
//
// Two tabs:
//   1. Role defaults — read-only matrix of role × permission. Documents what
//      each role grants out of the box. Editing role defaults intentionally
//      lives in code so the contract stays predictable; if you want a user
//      to deviate, use Tab 2.
//   2. Users — every known user. Click one to open the per-user override
//      drawer where you can grant / revoke individual permissions on top of
//      their role default.
// ---------------------------------------------------------------------------

const TABS = [
  { key: "roles", label: "Role defaults", icon: Shield },
  { key: "users", label: "By user", icon: UsersIcon },
];

const ROLE_ORDER = [
  ROLES.SUPER,
  ROLES.ADMIN,
  ROLES.ORG,
  ROLES.FACILITATOR,
  "cohort-leader",
  ROLES.PARTICIPANT,
];

export default function AdminPermissions() {
  const { user } = useAuth();
  if (!canManageRoles(user)) {
    return <Navigate to="/admin" replace />;
  }

  const [tab, setTab] = useState("roles");

  return (
    <div className="space-y-8 animate-fade-in-up">
      <header className="flex items-start gap-3 flex-wrap">
        <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
          <Lock className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-eyebrow">Admin · Permissions</div>
          <h1 className="font-heading text-[28px] lg:text-[34px] font-extrabold tracking-tight text-ink leading-tight">
            Permissions
          </h1>
          <p className="text-[14px] text-ink-muted mt-1.5 max-w-2xl">
            Every role's default permissions, plus per-user overrides if you
            need to grant or revoke a single capability without changing
            anyone else.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="inline-flex bg-surface-soft border border-soft rounded-xl p-1 gap-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-[12.5px] font-heading font-bold inline-flex items-center gap-1.5 transition-colors ${
                tab === t.key
                  ? "bg-white border border-soft text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "roles" ? <RolesMatrix /> : <UsersByPermission />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab A — Role defaults matrix.
// ---------------------------------------------------------------------------
function RolesMatrix() {
  return (
    <section className="space-y-3">
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 inline-flex items-start gap-2 text-[12.5px] text-amber-900">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2.5} />
        <span>
          Role defaults are versioned in code (
          <code className="font-mono text-[11.5px]">lib/permissions.js</code>
          ). To grant or revoke a permission for a specific user without
          touching everyone else with that role, use the "By user" tab.
        </span>
      </div>

      <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-surface-soft">
              <tr>
                <th className="text-left px-3 py-2.5 font-heading font-bold text-ink-muted sticky left-0 bg-surface-soft">
                  Permission
                </th>
                {ROLE_ORDER.map((r) => (
                  <th key={r} className="px-3 py-2.5 font-heading font-bold text-ink-muted text-center">
                    {getRoleLabel(r)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((group) => (
                <PermissionGroupRows key={group} group={group} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function PermissionGroupRows({ group }) {
  const perms = PERMISSIONS.filter((p) => p.group === group);
  return (
    <>
      <tr>
        <td colSpan={1 + ROLE_ORDER.length} className="px-3 py-2 bg-brand-50/40 text-[10.5px] font-heading font-bold uppercase tracking-wider text-brand-700 sticky left-0">
          {group}
        </td>
      </tr>
      {perms.map((p) => (
        <tr key={p.key} className="border-t border-soft">
          <td className="px-3 py-2.5 sticky left-0 bg-white">
            <div className="font-heading font-bold text-[12.5px] text-ink">{p.label}</div>
            <div className="text-[11.5px] text-ink-muted leading-snug">{p.description}</div>
          </td>
          {ROLE_ORDER.map((r) => (
            <td key={r} className="px-3 py-2.5 text-center">
              {ROLE_DEFAULTS[r]?.has(p.key) ? (
                <Check className="w-4 h-4 text-emerald-600 inline-block" strokeWidth={3} />
              ) : (
                <X className="w-4 h-4 text-ink-subtle/50 inline-block" strokeWidth={2.5} />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Tab B — Users + per-user override drawer.
// ---------------------------------------------------------------------------
function UsersByPermission() {
  const { user: currentUser } = useAuth();
  const version = useCohortVersion();
  const [q, setQ] = useState("");
  const [openUserId, setOpenUserId] = useState(null);

  // Aggregate every known user — same approach as /admin/users. Auth user
  // first, then facilitators + participants by email so duplicates collapse.
  const allUsers = useMemo(() => {
    const seen = new Map();
    function add(u, sourceType) {
      const key = (u.email || u.id || "").toLowerCase();
      if (!key) return;
      if (!seen.has(key)) {
        seen.set(key, { ...u, sourceType, capabilitiesSet: userCapabilities(u) });
      } else {
        // Merge caps if duplicate.
        const existing = seen.get(key);
        for (const c of userCapabilities(u)) existing.capabilitiesSet.add(c);
      }
    }
    if (currentUser?.email) add({ ...currentUser, id: currentUser.userId || currentUser.email }, "auth");
    for (const f of getAllFacilitators()) add(f, "facilitator");
    for (const p of ADMIN_MOCK_PARTICIPANTS) add(p, "participant");
    return [...seen.values()].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, currentUser]);

  const filtered = useMemo(() => {
    const lc = q.trim().toLowerCase();
    if (!lc) return allUsers;
    return allUsers.filter((u) =>
      (u.name || "").toLowerCase().includes(lc) ||
      (u.email || "").toLowerCase().includes(lc),
    );
  }, [allUsers, q]);

  const openUser = openUserId
    ? allUsers.find((u) => u.email?.toLowerCase() === openUserId.toLowerCase())
    : null;

  return (
    <section className="space-y-3">
      <div className="rounded-xl bg-surface-card border border-soft p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" strokeWidth={2.5} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search users by name or email"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-soft text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        <div className="text-[12px] text-ink-muted">
          {filtered.length} user{filtered.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
        <table className="w-full text-[12.5px]">
          <thead className="bg-surface-soft">
            <tr>
              <th className="text-left px-3 py-2.5 font-heading font-bold text-ink-muted">User</th>
              <th className="text-left px-3 py-2.5 font-heading font-bold text-ink-muted">Roles</th>
              <th className="text-left px-3 py-2.5 font-heading font-bold text-ink-muted">Effective permissions</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <UserRow
                key={u.email || u.id}
                user={u}
                onOpen={() => setOpenUserId(u.email)}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-ink-muted text-[12.5px]">
                  No users matched "{q}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {openUser && (
        <PermissionDrawer
          user={openUser}
          onClose={() => setOpenUserId(null)}
        />
      )}
    </section>
  );
}

function UserRow({ user: u, onOpen }) {
  const eff = effectivePermissions(u);
  const overrides = (u.permissionsGranted || []).length + (u.permissionsRevoked || []).length;
  return (
    <tr
      onClick={onOpen}
      className="border-t border-soft hover:bg-surface-soft/60 cursor-pointer transition-colors"
    >
      <td className="px-3 py-2.5">
        <div className="font-heading font-bold text-[13px] text-ink">{u.name}</div>
        <div className="text-[11.5px] text-ink-muted">{u.email}</div>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap gap-1">
          {[...u.capabilitiesSet].map((c) => (
            <span key={c} className="inline-block px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-[10.5px] font-heading font-bold uppercase tracking-wider">
              {getRoleLabel(c)}
            </span>
          ))}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div className="text-[12px] text-ink-muted">
          {eff.size} of {PERMISSIONS.length} granted
          {overrides > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10.5px] font-heading font-bold uppercase tracking-wider">
              {overrides} override{overrides === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-right">
        <ChevronRight className="w-4 h-4 text-ink-muted inline-block" strokeWidth={2.5} />
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Per-user override drawer.
// ---------------------------------------------------------------------------
function PermissionDrawer({ user: u, onClose }) {
  const [, forceUpdate] = useState(0);
  const eff = effectivePermissions(u);

  function toggle(key) {
    const isOn = eff.has(key);
    setUserPermission(u, key, isOn ? "revoke" : "grant");
    // For the demo we mutate the user record in place. Real prod would
    // dispatch an API call + refetch.
    forceUpdate((n) => n + 1);
  }

  function reset(key) {
    setUserPermission(u, key, "reset");
    forceUpdate((n) => n + 1);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface-paper border-l border-soft overflow-y-auto shadow-2xl animate-fade-in-up">
        <div className="sticky top-0 bg-surface-paper border-b border-soft px-5 py-4 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="h-eyebrow">Permissions</div>
            <div className="font-heading text-[18px] font-extrabold text-ink truncate">{u.name}</div>
            <div className="text-[12px] text-ink-muted truncate">{u.email}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-ink/5"
            aria-label="Close"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group}>
              <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted mb-2">
                {group}
              </div>
              <div className="space-y-2">
                {PERMISSIONS.filter((p) => p.group === group).map((p) => {
                  const on = eff.has(p.key);
                  const roleDefault = isPermissionGrantedByRole(u, p.key);
                  const overridden = on !== roleDefault;
                  return (
                    <div
                      key={p.key}
                      className={`rounded-xl border p-3 flex items-start gap-3 transition-colors ${
                        overridden ? "border-amber-300 bg-amber-50/40" : "border-soft bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(p.key)}
                        className={`shrink-0 w-9 h-5 rounded-full p-0.5 transition-colors ${
                          on ? "bg-brand-600" : "bg-ink/15"
                        }`}
                        aria-pressed={on}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                            on ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="font-heading font-bold text-[12.5px] text-ink inline-flex items-center gap-1.5">
                          {p.label}
                          {overridden && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9.5px] font-heading font-bold uppercase tracking-wider">
                              Overridden
                            </span>
                          )}
                        </div>
                        <div className="text-[11.5px] text-ink-muted leading-snug mt-0.5">
                          {p.description}
                        </div>
                        <div className="text-[10.5px] text-ink-subtle mt-1 inline-flex items-center gap-3">
                          <span>
                            Role default:{" "}
                            <span className="font-heading font-bold">
                              {roleDefault ? "On" : "Off"}
                            </span>
                          </span>
                          {overridden && (
                            <button
                              type="button"
                              onClick={() => reset(p.key)}
                              className="inline-flex items-center gap-1 text-brand-700 hover:text-brand-800 font-heading font-semibold"
                            >
                              <RotateCcw className="w-2.5 h-2.5" strokeWidth={2.5} />
                              Reset to default
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
