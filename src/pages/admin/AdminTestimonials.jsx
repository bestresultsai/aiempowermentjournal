import { useMemo, useState } from "react";
import {
  Quote, Check, X, Download, Megaphone, EyeOff, ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useScopeFilters } from "../../lib/useScopeFilters";
import { getAllCohortsForAdmin } from "../../lib/cohortAdmin";
import {
  getTestimonialsInScope,
  approveTestimonial,
  declineTestimonial,
  useTestimonialVersion,
} from "../../lib/testimonials";
import { canManageRoles, canCreateCohorts } from "../../lib/adminRoles";
import ScopeFilterBar from "../../components/admin/ScopeFilterBar";
import SegmentedControl from "../../components/admin/SegmentedControl";
import { downloadCSV } from "../../lib/csvExport";

// ---------------------------------------------------------------------------
// /admin/testimonials — review queue + approval flow.
//
// Layout:
//   1. Header + KPI tiles
//   2. Filter toolbar (status segmented + universal scope chips)
//   3. List of testimonials in scope, each with Approve / Decline action
//
// Only super + admin can approve. Facilitators see the page (read-only)
// because they have a stake in their cohorts' wins, but the action buttons
// don't render for them.
// ---------------------------------------------------------------------------

const STATUS_FILTERS = [
  { key: "pending",  label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "declined", label: "Declined" },
  { key: "all",      label: "All" },
];

export default function AdminTestimonials() {
  const { user } = useAuth();
  useTestimonialVersion();

  const scope = useScopeFilters(user, getAllCohortsForAdmin());
  const { cohorts, effectiveCohorts, effectiveSlugs: cohortSlugs, orgs, facilitators } = scope;

  const [status, setStatus] = useState("pending");
  const canApprove = canManageRoles(user) || canCreateCohorts(user);

  const list = useMemo(
    () => getTestimonialsInScope(cohortSlugs, status),
    [cohortSlugs, status],
  );
  const allInScope = useMemo(
    () => getTestimonialsInScope(cohortSlugs, "all"),
    [cohortSlugs],
  );
  const counts = useMemo(() => {
    const out = { pending: 0, approved: 0, declined: 0 };
    for (const t of allInScope) {
      if (out[t.status] != null) out[t.status]++;
    }
    return out;
  }, [allInScope]);
  const marketingApproved = useMemo(
    () => allInScope.filter((t) => t.status === "approved" && t.allowMarketingUse).length,
    [allInScope],
  );

  const cohortBySlug = useMemo(
    () => Object.fromEntries(getAllCohortsForAdmin().map((c) => [c.slug, c])),
    [],
  );

  function handleExportCSV() {
    const header = [
      "Submitted", "Status", "Participant", "Role", "Organization",
      "Cohort", "Quote", "Marketing OK", "Approved by",
    ];
    const rows = allInScope.map((t) => [
      new Date(t.submittedAt).toISOString().slice(0, 10),
      t.status,
      t.participantName || t.participantEmail,
      t.role || "",
      t.organization || "",
      cohortBySlug[t.cohortSlug]?.name || t.cohortSlug,
      t.quote.replace(/\n+/g, " "),
      t.allowMarketingUse ? "Yes" : "No",
      t.approvedBy || "",
    ]);
    downloadCSV("testimonials.csv", [header, ...rows]);
  }

  function onApprove(id) {
    approveTestimonial(id, user?.email || null);
  }
  function onDecline(id) {
    declineTestimonial(id, user?.email || null);
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <header className="flex items-start gap-3 flex-wrap">
        <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
          <Quote className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-eyebrow">Admin · Testimonials</div>
          <h1 className="font-heading text-[28px] lg:text-[34px] font-extrabold tracking-tight text-ink leading-tight">
            Testimonials
          </h1>
          <p className="text-[14px] text-ink-muted mt-1.5 max-w-2xl">
            {effectiveCohorts.length} of {cohorts.length}{" "}
            {cohorts.length === 1 ? "cohort" : "cohorts"}. Review the
            statements participants share after earning their certificate.
            Approve to feed downstream marketing surfaces.
          </p>
        </div>
        {allInScope.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-soft text-[12.5px] font-heading font-semibold text-ink hover:bg-surface-soft hover:border-brand-500 transition-all duration-200 shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-brand-600" strokeWidth={2.5} />
            Export CSV
          </button>
        )}
      </header>

      {/* Filter toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <SegmentedControl
          options={STATUS_FILTERS}
          value={status}
          onChange={setStatus}
        />
        <ScopeFilterBar
          cohorts={cohorts}
          orgs={orgs}
          facilitators={facilitators}
          orgFilter={scope.orgFilter}
          cohortFilter={scope.cohortFilter}
          facilitatorFilter={scope.facilitatorFilter}
          setOrgFilter={scope.setOrgFilter}
          setCohortFilter={scope.setCohortFilter}
          setFacilitatorFilter={scope.setFacilitatorFilter}
        />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Quote}        label="Pending review"      value={counts.pending}      accent="bg-amber-50 text-amber-700" />
        <KpiCard icon={ShieldCheck}  label="Approved"            value={counts.approved}     accent="bg-emerald-50 text-emerald-700" />
        <KpiCard icon={EyeOff}       label="Declined"            value={counts.declined}     accent="bg-rose-50 text-rose-700" />
        <KpiCard icon={Megaphone}    label="Marketing-cleared"   value={marketingApproved}   sub="approved + opt-in" accent="bg-brand-50 text-brand-700" />
      </div>

      {/* List */}
      {list.length === 0 ? (
        <EmptyState status={status} />
      ) : (
        <section className="space-y-3">
          {list.map((t) => (
            <TestimonialRow
              key={t.id}
              testimonial={t}
              cohort={cohortBySlug[t.cohortSlug]}
              canApprove={canApprove}
              onApprove={() => onApprove(t.id)}
              onDecline={() => onDecline(t.id)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row.
// ---------------------------------------------------------------------------
function TestimonialRow({ testimonial: t, cohort, canApprove, onApprove, onDecline }) {
  const status = t.status || "pending";
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-5 lg:p-6">
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <StatusChip status={status} />
            {t.allowMarketingUse && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10.5px] font-heading font-bold uppercase tracking-wider">
                <Megaphone className="w-3 h-3" strokeWidth={2.5} />
                Marketing OK
              </span>
            )}
          </div>
          <div className="font-heading text-[15px] font-extrabold text-ink leading-tight">
            {t.participantName || t.participantEmail}
          </div>
          <div className="text-[12.5px] text-ink-muted mt-0.5">
            {t.role && <>{t.role}</>}
            {t.role && t.organization && " · "}
            {t.organization}
          </div>
          <div className="text-[11px] text-ink-subtle mt-0.5">
            {cohort?.name || t.cohortSlug} · Submitted{" "}
            {new Date(t.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>

        {canApprove && status !== "approved" && (
          <button
            type="button"
            onClick={onApprove}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-[12.5px] font-heading font-bold hover:bg-emerald-700 shrink-0"
          >
            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
            Approve
          </button>
        )}
        {canApprove && status !== "declined" && (
          <button
            type="button"
            onClick={onDecline}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-soft text-rose-700 text-[12.5px] font-heading font-bold hover:bg-rose-50 shrink-0"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.5} />
            Decline
          </button>
        )}
      </div>

      <blockquote className="rounded-xl bg-surface-soft/40 border-l-4 border-amber-300 px-4 py-3 text-[14px] text-ink leading-relaxed">
        “{t.quote}”
      </blockquote>

      {status === "approved" && t.approvedBy && (
        <div className="text-[11px] text-ink-subtle mt-2">
          Approved by {t.approvedBy}
          {t.approvedAt && ` · ${new Date(t.approvedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
        </div>
      )}
      {status === "declined" && t.declinedBy && (
        <div className="text-[11px] text-ink-subtle mt-2">
          Declined by {t.declinedBy}
          {t.declinedAt && ` · ${new Date(t.declinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }) {
  const map = {
    pending:  { label: "Pending",  cls: "bg-amber-100 text-amber-800" },
    approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-800" },
    declined: { label: "Declined", cls: "bg-rose-100 text-rose-800" },
  };
  const t = map[status] || map.pending;
  return (
    <span className={"inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-heading font-bold uppercase tracking-wider " + t.cls}>
      {t.label}
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className={"w-8 h-8 rounded-lg flex items-center justify-center " + accent}>
          <Icon className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
          {label}
        </div>
      </div>
      <div className="font-heading text-[26px] font-extrabold text-ink leading-none">{value}</div>
      {sub && <div className="text-[11.5px] text-ink-muted mt-1">{sub}</div>}
    </div>
  );
}

function EmptyState({ status }) {
  const copy = {
    pending:  "No testimonials waiting on review.",
    approved: "No approved testimonials in scope yet.",
    declined: "Nothing declined here — clean slate.",
    all:      "No testimonials in scope.",
  };
  return (
    <div className="rounded-2xl border border-dashed border-soft bg-surface-card p-10 text-center">
      <div className="inline-flex w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 items-center justify-center mb-3">
        <Quote className="w-6 h-6" strokeWidth={2} />
      </div>
      <h2 className="font-heading text-[18px] font-extrabold text-ink mb-1">
        {copy[status]}
      </h2>
      <p className="text-[13px] text-ink-muted max-w-md mx-auto">
        Testimonials are collected after a participant earns their certificate.
        Widen your scope filter or wait for the next cohort to graduate.
      </p>
    </div>
  );
}
