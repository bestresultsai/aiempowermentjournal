import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Library } from "lucide-react";
import ResourceForm from "../../components/admin/ResourceForm";
import { createResource } from "../../lib/resources";

// ---------------------------------------------------------------------------
// /admin/resources/new — create a new resource.
// ---------------------------------------------------------------------------

const STARTER = {
  title: "",
  description: "",
  type: "link",
  url: "",
  programCode: "",
  category: "",
};

export default function AdminResourceNew() {
  const navigate = useNavigate();

  function handleSubmit(payload) {
    createResource(payload);
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
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Library className="w-5 h-5" strokeWidth={2.25} />
          </div>
          <div>
            <div className="h-eyebrow text-emerald-700">New resource</div>
            <h1 className="font-heading text-[28px] lg:text-[32px] font-extrabold tracking-tight text-ink leading-tight">
              Add to the library.
            </h1>
          </div>
        </div>
      </header>

      <ResourceForm
        mode="create"
        initial={STARTER}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/resources")}
      />
    </div>
  );
}
