import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, Search, X, Users } from "lucide-react";
import { DEMO_USER_OVERRIDES } from "../lib/demoData";
import { ADMIN_MOCK_PARTICIPANTS } from "../lib/adminMockData";
import { useViewAs, VIEW_AS_LABELS } from "../lib/viewAs";
import { useAuth } from "../context/AuthContext";

// ---------------------------------------------------------------------------
// ViewAsUserPicker — modal for picking a specific user to preview as.
//
// Demo-only this round: clicking a user sets the role-level view-as to their
// role AND stores the user reference on the viewAs hook so the banner can
// surface "Viewing as Sarah Patel (Org Admin)" instead of just the role.
// No audit log yet — that's queued for the production round.
//
// Sources of candidate users:
//   - DEMO_USER_OVERRIDES — the five canned identities (Super, Admin, Org,
//     Facilitator, Facilitator-Pure, Leader)
//   - ADMIN_MOCK_PARTICIPANTS — the seeded participant directory
//
// We dedupe by email so a participant who's also seeded as a demo override
// only appears once.
// ---------------------------------------------------------------------------

export default function ViewAsUserPicker({ open, onClose }) {
  const { user } = useAuth();
  const { setUser: setViewAsTargetUser, viewAsUser } = useViewAs(user);
  const [query, setQuery] = useState("");

  const candidates = useMemo(() => buildCandidates(), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) => {
      return (
        (c.name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (VIEW_AS_LABELS[c.role] || c.role || "").toLowerCase().includes(q) ||
        (c.organization || "").toLowerCase().includes(q)
      );
    });
  }, [candidates, query]);

  if (!open) return null;

  function pick(candidate) {
    setViewAsTargetUser({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      role: candidate.role,
    });
    onClose?.();
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in-up">
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-surface-card border border-soft shadow-lift overflow-hidden">
        <header className="px-5 py-4 border-b border-soft flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10.5px] font-heading font-bold uppercase tracking-wider text-amber-700 mb-1">
              <Eye className="w-3 h-3" strokeWidth={2.5} />
              View as · pick a user
            </div>
            <h2 className="font-heading text-[18px] font-extrabold text-ink leading-tight">
              Who do you want to preview as?
            </h2>
            <p className="text-[12.5px] text-ink-muted mt-1 leading-relaxed">
              Demo only — no audit log yet. Banner will show their name + role.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-soft"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </header>

        <div className="px-5 pt-3 pb-3 border-b border-soft">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted"
              strokeWidth={2.5}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, role…"
              autoFocus
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-soft bg-surface-card text-ink text-[13.5px] font-body focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-5 py-8 text-center text-[12.5px] text-ink-muted">
              No users match "{query}".
            </div>
          ) : (
            <ul>
              {filtered.map((c) => {
                const active = viewAsUser?.id === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => pick(c)}
                      className={`w-full px-5 py-3 text-left hover:bg-surface-soft transition-colors flex items-center gap-3 border-b border-soft last:border-0 ${active ? "bg-amber-50/60" : ""}`}
                    >
                      <Avatar name={c.name} url={c.headshotUrl} />
                      <div className="flex-1 min-w-0">
                        <div className="font-heading text-[14px] font-bold text-ink truncate">
                          {c.name}
                        </div>
                        <div className="text-[11.5px] text-ink-muted truncate">
                          {c.email}
                          {c.organization && ` · ${c.organization}`}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ink/5 text-ink text-[10.5px] font-heading font-bold uppercase tracking-wider shrink-0">
                        {VIEW_AS_LABELS[c.role] || c.role}
                      </span>
                      {active && (
                        <span className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-amber-700 shrink-0">
                          Active
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="px-5 py-3 border-t border-soft flex items-center justify-between gap-3 text-[11.5px] text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" strokeWidth={2.5} />
            {candidates.length} users available
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink"
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Build the candidate list from demo identities + seeded participants.
// ---------------------------------------------------------------------------
function buildCandidates() {
  const out = [];
  const seenEmails = new Set();

  // Demo identities — one per flavor.
  for (const [flavor, def] of Object.entries(DEMO_USER_OVERRIDES)) {
    if (flavor === "leader") continue; // covered by participants below
    const email = (def.email || "").toLowerCase();
    if (email && seenEmails.has(email)) continue;
    if (email) seenEmails.add(email);
    out.push({
      id: `demo-${flavor}`,
      name: def.name,
      email: def.email,
      role: def.role,
      organization: def.organization,
      headshotUrl: null,
    });
  }

  // Seeded participants.
  for (const p of ADMIN_MOCK_PARTICIPANTS) {
    const email = (p.email || "").toLowerCase();
    if (email && seenEmails.has(email)) continue;
    if (email) seenEmails.add(email);
    out.push({
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role || "participant",
      organization: p.organization || p.cohortSlug,
      headshotUrl: p.headshotUrl || null,
    });
  }

  // Stable sort: role first (super > admin > org > facilitator > participant),
  // then name.
  const roleRank = {
    super: 0,
    admin: 1,
    org: 2,
    facilitator: 3,
    "cohort-leader": 4,
    participant: 5,
  };
  return out.sort((a, b) => {
    const ra = roleRank[a.role] ?? 99;
    const rb = roleRank[b.role] ?? 99;
    if (ra !== rb) return ra - rb;
    return (a.name || "").localeCompare(b.name || "");
  });
}

// ---------------------------------------------------------------------------
// Avatar — headshot if available, else initials. Same pattern as elsewhere.
// ---------------------------------------------------------------------------
function Avatar({ name, url }) {
  const initials = (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="w-9 h-9 rounded-full object-cover shrink-0 border border-soft"
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-heading text-[11.5px] font-bold shrink-0 border border-soft">
      {initials || "?"}
    </div>
  );
}
