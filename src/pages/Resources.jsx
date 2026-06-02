import { Link } from "react-router-dom";
import { Library, FileText, Video, Wrench, Sparkles, ArrowRight } from "lucide-react";
import NavBar from "../components/NavBar";

// ---------------------------------------------------------------------------
// RESOURCES PAGE — /resources
//
// Placeholder until we wire it to Notion. Designed to communicate intent
// (prompt files, extra videos, templates) without faking content. When the
// real resource library is ready, swap the empty-state grid for a list
// pulled from Notion's Resources DB.
// ---------------------------------------------------------------------------

export default function Resources() {
  return (
    <div className="min-h-screen bg-surface-paper">
      <NavBar />
      <main className="max-w-[1180px] mx-auto px-6 lg:px-8 py-8">
        <header className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Library className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="h-eyebrow">Resources</div>
          </div>
          <h1 className="font-heading text-[32px] lg:text-[36px] font-extrabold tracking-tight text-ink leading-tight">
            The library.
          </h1>
          <p className="text-[14.5px] text-ink-muted mt-2 max-w-2xl leading-relaxed">
            Prompt files, extra videos, templates, and valuable content curated by the BestResults.AI team.
            New material lands here regularly.
          </p>
        </header>

        {/* Coming-soon empty state with category previews */}
        <section className="animate-fade-in-up delay-100">
          <div className="rounded-3xl bg-surface-card border border-soft p-10 lg:p-14 text-center shadow-card">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 items-center justify-center mb-5">
              <Sparkles className="w-7 h-7" strokeWidth={2} />
            </div>
            <h2 className="font-heading text-[24px] font-extrabold tracking-tight text-ink mb-3">
              Coming soon.
            </h2>
            <p className="text-[14.5px] text-ink-muted max-w-xl mx-auto leading-relaxed mb-8">
              We're curating the first batch of resources. In the meantime, your cohort sessions and
              the AI Journal have plenty to chew on.
            </p>

            <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
              <CategoryPreview
                icon={FileText}
                title="Prompt Files"
                description="Ready-to-paste prompt templates organized by workflow type."
              />
              <CategoryPreview
                icon={Video}
                title="Bonus Videos"
                description="Deep dives, tutorials, and recordings beyond the live workshops."
              />
              <CategoryPreview
                icon={Wrench}
                title="Templates"
                description="Project briefs, role matrices, and accelerators in editable formats."
              />
            </div>

            <div className="mt-10">
              <Link
                to="/journey"
                className="group inline-flex items-center gap-1.5 text-[14px] font-heading font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                Back to your Journey
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function CategoryPreview({ icon: Icon, title, description }) {
  return (
    <div className="rounded-2xl bg-surface-paper border border-soft p-5 transition-shadow duration-300 hover:shadow-card">
      <div className="w-9 h-9 rounded-xl bg-white border border-soft flex items-center justify-center mb-3">
        <Icon className="w-4 h-4 text-ink-muted" strokeWidth={2} />
      </div>
      <h3 className="font-heading text-[15px] font-bold text-ink mb-1.5">{title}</h3>
      <p className="text-[12.5px] text-ink-muted leading-relaxed">{description}</p>
    </div>
  );
}
