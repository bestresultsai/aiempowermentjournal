import { useMemo } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Library } from "lucide-react";
import ProgramForm from "../../components/admin/ProgramForm";
import {
  getProgramForAdminByCode,
  updateProgram,
  useProgramVersion,
} from "../../lib/programs";

// ---------------------------------------------------------------------------
// /admin/programs/:code/edit — edit a program's meta + sessions.
//
// All edits write through updateProgram() to the localStorage overlay (and
// the in-memory program store). Because getProgramByCode now reads the
// overlay-merged catalog, every cohort using this program inherits the
// changes immediately.
// ---------------------------------------------------------------------------

export default function AdminProgramEdit() {
  const { code } = useParams();
  const navigate = useNavigate();
  const version = useProgramVersion();

  const program = useMemo(
    () => getProgramForAdminByCode(code),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [code, version],
  );

  if (!program) {
    // Unknown code → bounce back to the list.
    return <Navigate to="/admin/programs" replace />;
  }

  function handleSubmit(payload) {
    updateProgram(code, payload);
    navigate("/admin/programs");
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <header className="space-y-2">
        <Link
          to="/admin/programs"
          className="inline-flex items-center gap-1 text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
          All programs
        </Link>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
            <Library className="w-5 h-5" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <div className="h-eyebrow">Edit · {program.code}</div>
            <h1 className="font-heading text-[28px] lg:text-[32px] font-extrabold tracking-tight text-ink leading-tight truncate">
              {program.name}
            </h1>
          </div>
        </div>
      </header>

      <ProgramForm
        mode="edit"
        initial={program}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/programs")}
      />
    </div>
  );
}
