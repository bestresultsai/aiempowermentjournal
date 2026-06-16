import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Library } from "lucide-react";
import ProgramForm from "../../components/admin/ProgramForm";
import { createProgram } from "../../lib/programs";

// ---------------------------------------------------------------------------
// /admin/programs/new — create a brand-new program.
//
// Shares ProgramForm with the edit page. On submit, calls createProgram()
// which throws on duplicate code; ProgramForm surfaces the error inline.
// ---------------------------------------------------------------------------

const STARTER_INITIAL = {
  code: "",
  name: "",
  methodName: "AI Empowerment Method",
  tagline: "",
  sessionDurationMinutes: 75,
  belts: [],
  sessions: [
    {
      belt: "",
      title: "",
      summary: "",
      materials: [],
      homework: "",
    },
  ],
};

export default function AdminProgramNew() {
  const navigate = useNavigate();

  function handleSubmit(payload) {
    const created = createProgram(payload);
    navigate(`/admin/programs/${encodeURIComponent(created.code)}/edit`);
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <header className="space-y-2">
        <Link
          to="/admin/programs"
          className="inline-flex items-center gap-1 text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
          All programs
        </Link>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Library className="w-5 h-5" strokeWidth={2.25} />
          </div>
          <div>
            <div className="h-eyebrow text-emerald-700">New program</div>
            <h1 className="font-heading text-[28px] lg:text-[32px] font-extrabold tracking-tight text-ink leading-tight">
              Add a curriculum template.
            </h1>
            <p className="text-[13px] text-ink-muted mt-1.5 max-w-xl leading-relaxed">
              Define the program once. Every cohort you spin up with this code
              picks up its sessions, belts, and homework automatically.
            </p>
          </div>
        </div>
      </header>

      <ProgramForm
        mode="create"
        initial={STARTER_INITIAL}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/programs")}
        submitLabel="Create program"
      />
    </div>
  );
}
