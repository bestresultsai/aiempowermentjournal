import { useMemo } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Library } from "lucide-react";
import ResourceForm from "../../components/admin/ResourceForm";
import {
  getResourceById,
  updateResource,
  archiveResource,
  useResourceVersion,
} from "../../lib/resources";

// ---------------------------------------------------------------------------
// /admin/resources/:id/edit — edit a resource. Archive also lives here.
// ---------------------------------------------------------------------------

export default function AdminResourceEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const version = useResourceVersion();

  const resource = useMemo(
    () => getResourceById(id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, version],
  );

  if (!resource) return <Navigate to="/admin/resources" replace />;

  function handleSubmit(payload) {
    updateResource(id, payload);
    navigate("/admin/resources");
  }

  function handleArchive() {
    if (!window.confirm("Archive this resource? Participants will no longer see it.")) return;
    archiveResource(id);
    navigate("/admin/resources");
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <header className="space-y-2">
        <Link
          to="/admin/resources"
          className="inline-flex items-center gap-1 text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
          All resources
        </Link>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
            <Library className="w-5 h-5" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <div className="h-eyebrow">Edit · {resource.category}</div>
            <h1 className="font-heading text-[24px] lg:text-[28px] font-extrabold tracking-tight text-ink leading-tight truncate">
              {resource.title}
            </h1>
          </div>
        </div>
      </header>

      <ResourceForm
        mode="edit"
        initial={resource}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/resources")}
        onArchive={handleArchive}
      />
    </div>
  );
}
