import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2, Plus, Users, GraduationCap, Pencil, Check, X, AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCohortVersion } from "../../lib/cohortAdmin";
import {
  getAllOrganizations,
  getAllCohortsForAdmin,
  createOrganization,
  updateOrganization,
} from "../../lib/cohortAdmin";
import { getParticipantsForCohort } from "../../lib/adminMockData";
import { clampString, LIMITS } from "../../lib/inputValidation";
import { canCreateCohorts } from "../../lib/adminRoles";

// ---------------------------------------------------------------------------
// /admin/orgs — Organizations management.
//
// Lists every organization that's either seeded or created via an admin.
// Inline create + edit. Stats per org: # cohorts, # participants.
// ---------------------------------------------------------------------------
export default function AdminOrgs() {
  const { user } = useAuth();
  const version = useCohortVersion(); // re-renders on create/update
  const orgs = useMemo(() => getAllOrganizations(), [version]);
  const cohorts = useMemo(() => getAllCohortsForAdmin(), [version]);
  const [editing, setEditing] = useState(null); // org id being edited inline
  const [creating, setCreating] = useState(false);

  // Compute stats per org.
  const rows = useMemo(() => {
    return orgs.map((org) => {
      const orgCohorts = cohorts.filter((c) => c.organization?.id === org.id);
      const participantCount = orgCohorts.reduce(
        (sum, c) => sum + getParticipantsForCohort(c.slug).length,
        0,
      );
      return { org, cohortCount: orgCohorts.length, participantCount };
    });
  }, [orgs, cohorts]);

  if (!canCreateCohorts(user)) {
    return (
      <div className="space-y-3">
        <h1 className="font-heading text-[24px] font-extrabold text-ink">Organizations</h1>
        <p className="text-[14px] text-ink-muted">
          You don't have permission to manage organizations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <header className="flex items-start gap-3 flex-wrap">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
          <Building2 className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-eyebrow">Admin · Organizations</div>
          <h1 className="font-heading text-[28px] lg:text-[34px] font-extrabold tracking-tight text-ink leading-tight">
            Organizations
          </h1>
          <p className="text-[14px] text-ink-muted mt-1.5 max-w-2xl">
            {orgs.length} {orgs.length === 1 ? "organization" : "organizations"} on the platform.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 text-white text-[12.5px] font-heading font-semibold hover:bg-brand-700 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          New organization
        </button>
      </header>

      {creating && (
        <NewOrgRow
          onCancel={() => setCreating(false)}
          onCreated={() => setCreating(false)}
        />
      )}

      <section>
        <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_120px_120px_60px] gap-4 px-5 py-3 border-b border-soft bg-surface-soft text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
            <div>Organization</div>
            <div className="text-right">Cohorts</div>
            <div className="text-right">Participants</div>
            <div />
          </div>
          {rows.length === 0 ? (
            <div className="p-8 text-center text-[14px] text-ink-muted">
              No organizations yet. Click "New organization" to create the first one.
            </div>
          ) : (
            rows.map(({ org, cohortCount, participantCount }) => (
              <OrgRow
                key={org.id}
                org={org}
                cohortCount={cohortCount}
                participantCount={participantCount}
                editing={editing === org.id}
                onEdit={() => setEditing(org.id)}
                onCancel={() => setEditing(null)}
                onSaved={() => setEditing(null)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function OrgRow({ org, cohortCount, participantCount, editing, onEdit, onCancel, onSaved }) {
  const [name, setName] = useState(org.name);
  const [shortName, setShortName] = useState(org.shortName);
  const [error, setError] = useState("");

  function handleSave() {
    try {
      updateOrganization(org.id, { name, shortName });
      onSaved?.();
    } catch (e) {
      setError(e.message);
    }
  }

  if (editing) {
    return (
      <div className="px-5 py-4 border-b border-soft last:border-b-0 bg-brand-50/30">
        <div className="grid md:grid-cols-[1fr_180px_auto] gap-2 items-start">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(clampString(e.target.value, LIMITS.shortText))}
            maxLength={LIMITS.shortText}
            placeholder="Organization name"
            className="w-full px-3 py-2 rounded-lg border border-soft bg-white text-[14px] text-ink focus:outline-none focus:border-brand-500"
          />
          <input
            type="text"
            value={shortName}
            onChange={(e) => setShortName(clampString(e.target.value, 40))}
            maxLength={40}
            placeholder="Short name"
            className="w-full px-3 py-2 rounded-lg border border-soft bg-white text-[14px] text-ink focus:outline-none focus:border-brand-500"
          />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-[12.5px] font-heading font-bold hover:bg-emerald-700 transition-colors"
            >
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
              Save
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-soft transition-colors"
              aria-label="Cancel"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-2 inline-flex items-center gap-1 text-[12px] text-rose-700">
            <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-5 py-4 grid md:grid-cols-[1fr_120px_120px_60px] gap-4 items-center border-b border-soft last:border-b-0 hover:bg-surface-soft transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <div className="font-heading text-[14px] font-bold text-ink truncate">
            {org.name}
          </div>
          <div className="text-[11.5px] text-ink-muted truncate">
            {org.shortName}
          </div>
        </div>
      </div>
      <div className="text-right text-[14px] font-heading font-bold text-ink inline-flex items-center justify-end gap-1.5">
        <GraduationCap className="w-3.5 h-3.5 text-ink-muted" strokeWidth={2.5} />
        {cohortCount}
      </div>
      <div className="text-right text-[14px] font-heading font-bold text-ink inline-flex items-center justify-end gap-1.5">
        <Users className="w-3.5 h-3.5 text-ink-muted" strokeWidth={2.5} />
        {participantCount}
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-white transition-colors shrink-0"
        aria-label="Edit"
      >
        <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function NewOrgRow({ onCancel, onCreated }) {
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [error, setError] = useState("");

  function handleCreate() {
    try {
      createOrganization({ name, shortName });
      onCreated?.();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section className="rounded-2xl bg-brand-50/40 border border-brand-200 p-4">
      <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-brand-700 mb-2">
        New organization
      </div>
      <div className="grid md:grid-cols-[1fr_180px_auto] gap-2">
        <input
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(clampString(e.target.value, LIMITS.shortText))}
          maxLength={LIMITS.shortText}
          placeholder="e.g. International Alliance of Healthcare Educators"
          className="w-full px-3 py-2 rounded-lg border border-soft bg-white text-[14px] text-ink focus:outline-none focus:border-brand-500"
        />
        <input
          type="text"
          value={shortName}
          onChange={(e) => setShortName(clampString(e.target.value, 40))}
          maxLength={40}
          placeholder="Short name (IAHE)"
          className="w-full px-3 py-2 rounded-lg border border-soft bg-white text-[14px] text-ink focus:outline-none focus:border-brand-500"
        />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCreate}
            disabled={!name.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 text-white text-[12.5px] font-heading font-bold hover:bg-brand-700 transition-colors disabled:bg-brand-300 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            Create
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-white transition-colors"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
      {error && (
        <div className="mt-2 inline-flex items-center gap-1 text-[12px] text-rose-700">
          <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
          {error}
        </div>
      )}
    </section>
  );
}
