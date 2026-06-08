import SelectChip from "./SelectChip";

// ---------------------------------------------------------------------------
// ScopeFilterBar — the universal Org × Cohort × Facilitator filter.
//
// Each dimension chip auto-hides when there's only one option in scope
// (e.g. as the org admin demo only has IAHE, no org/facilitator chips show).
//
// Props:
//   cohorts: full list of cohorts the admin can access (already role-scoped)
//   orgs, facilitators: distinct objects available as filter options
//   orgFilter, cohortFilter, facilitatorFilter: current values (null = "all")
//   set*Filter: setters from the parent page
//   includeCohort: optional boolean, default true. /admin/cohorts hides this.
// ---------------------------------------------------------------------------

export default function ScopeFilterBar({
  cohorts,
  orgs,
  facilitators,
  orgFilter,
  cohortFilter,
  facilitatorFilter,
  setOrgFilter,
  setCohortFilter,
  setFacilitatorFilter,
  includeCohort = true,
}) {
  const showOrg = orgs && orgs.length > 1;
  const showCohort = includeCohort && cohorts && cohorts.length > 1;
  const showFacilitator = facilitators && facilitators.length > 1;

  // When org changes, narrow visible cohorts. Same for facilitator.
  const filteredCohorts = (cohorts || [])
    .filter((c) => !orgFilter || c.organization?.id === orgFilter)
    .filter((c) => !facilitatorFilter || c.facilitator?.id === facilitatorFilter);

  // Nothing visible? Render nothing so we don't leave an empty gap.
  if (!showOrg && !showCohort && !showFacilitator) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {showOrg && (
        <SelectChip
          label="Organization"
          value={orgFilter}
          onChange={(v) => {
            setOrgFilter(v);
            // If the current cohort no longer matches the org, clear it.
            if (cohortFilter) {
              const stillValid = cohorts.some(
                (c) => c.slug === cohortFilter && (!v || c.organization?.id === v),
              );
              if (!stillValid) setCohortFilter && setCohortFilter(null);
            }
          }}
          active={orgFilter !== null}
          options={[
            { value: null, label: "All orgs" },
            ...orgs.map((o) => ({ value: o.id, label: o.shortName || o.name })),
          ]}
        />
      )}
      {showCohort && (
        <SelectChip
          label="Cohort"
          value={cohortFilter}
          onChange={setCohortFilter}
          active={cohortFilter !== null}
          options={[
            { value: null, label: "All cohorts" },
            ...filteredCohorts.map((c) => ({
              value: c.slug,
              label: c.organization?.shortName
                ? `${c.organization.shortName} · ${c.programCode}`
                : c.name,
            })),
          ]}
        />
      )}
      {showFacilitator && (
        <SelectChip
          label="Facilitator"
          value={facilitatorFilter}
          onChange={setFacilitatorFilter}
          active={facilitatorFilter !== null}
          options={[
            { value: null, label: "All facilitators" },
            ...facilitators.map((f) => ({ value: f.id, label: f.name })),
          ]}
        />
      )}
    </div>
  );
}
