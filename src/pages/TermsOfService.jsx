import { Link } from "react-router-dom";
import { ScrollText, ArrowLeft } from "lucide-react";
import NavBar from "../components/NavBar";

// ---------------------------------------------------------------------------
// /terms — Terms of Service. Public-route accessible (no AuthGate).
//
// IMPORTANT: copy here is a DRAFT scaffold tracked by task #468. Replace
// with legal-approved language before public launch.
// ---------------------------------------------------------------------------

const LAST_UPDATED = "June 17, 2026";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-surface-paper">
      <NavBar />
      <main className="max-w-3xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
        <div className="mb-10 animate-fade-in-up">
          <Link
            to="/home"
            className="inline-flex items-center gap-1 text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
            Back to platform
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center">
              <ScrollText className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="h-eyebrow">Legal</div>
          </div>
          <h1 className="font-heading text-[34px] lg:text-[40px] font-extrabold tracking-tight text-ink leading-tight">
            Terms of Service
          </h1>
          <p className="text-[13.5px] text-ink-muted mt-2">Last updated {LAST_UPDATED}</p>
        </div>

        <DraftBanner />

        <article className="prose-policy animate-fade-in-up delay-100">
          <Section title="Acceptance of terms">
            <p>
              By signing in to the BestResults.AI platform you agree to be
              bound by these terms and by our{" "}
              <Link to="/privacy" className="text-brand-700 hover:text-brand-800">
                Privacy Policy
              </Link>
              .
            </p>
          </Section>

          <Section title="What the platform does">
            <p>
              The BestResults.AI platform hosts the AI Empowerment Workshop
              programs and supporting tools — session content, homework
              submissions, the AI Journal, feedback, and a curated resource
              library. Access is granted to participants enrolled in a
              cohort by their organization or by BestResults.AI directly.
            </p>
          </Section>

          <Section title="Your account">
            <ul>
              <li>
                Keep your login credentials private. You're responsible for
                activity that happens under your account.
              </li>
              <li>
                Provide accurate information at sign-up and keep it current
                in your profile settings.
              </li>
              <li>
                Don't share your account with anyone else.
              </li>
            </ul>
          </Section>

          <Section title="Acceptable use">
            <ul>
              <li>
                Use the platform for your own learning and the goals of
                your cohort. Don't use it to harass, harm, or deceive
                others.
              </li>
              <li>
                Don't upload content you don't have the right to share,
                including confidential information that belongs to a third
                party.
              </li>
              <li>
                Don't attempt to access other users' accounts, scrape the
                platform, or interfere with its operation.
              </li>
            </ul>
          </Section>

          <Section title="Content you submit">
            <p>
              You keep ownership of the homework, journal entries,
              feedback, and files you submit. You grant BestResults.AI a
              limited license to host, display, and share that content
              within the platform's role-based visibility model so your
              facilitator, cohort, and organization administrators can
              see it as the platform intends.
            </p>
          </Section>

          <Section title="Confidentiality + NDAs">
            <p>
              Cohorts that share commercially sensitive information may
              require a Non-Disclosure Agreement. If your cohort requires
              one, the platform will surface a reminder; signing remains a
              separate legal obligation between you, your organization,
              and BestResults.AI.
            </p>
          </Section>

          <Section title="Termination">
            <p>
              We may suspend or terminate access for violations of these
              terms, abuse of the platform, or expiration of your cohort
              enrollment. You can request account deletion at any time via{" "}
              <a href="mailto:support@bestresults.ai" className="text-brand-700 hover:text-brand-800">
                support@bestresults.ai
              </a>
              .
            </p>
          </Section>

          <Section title="Disclaimer">
            <p>
              The platform is provided on an "as is" basis. BestResults.AI
              makes no warranties beyond those required by applicable law.
              We aren't liable for any indirect or consequential losses
              arising from use of the platform.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              We may update these terms as the platform evolves. Material
              changes will be communicated via email or in-app notice
              before they take effect.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions? Email{" "}
              <a href="mailto:support@bestresults.ai" className="text-brand-700 hover:text-brand-800">
                support@bestresults.ai
              </a>
              .
            </p>
          </Section>
        </article>
      </main>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="font-heading text-[20px] font-extrabold tracking-tight text-ink mb-3">
        {title}
      </h2>
      <div className="space-y-3 text-[14px] text-ink-muted leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_strong]:text-ink">
        {children}
      </div>
    </section>
  );
}

function DraftBanner() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-10 text-[13px] text-amber-900 leading-relaxed">
      <strong className="font-heading font-bold">DRAFT — pending legal review.</strong>{" "}
      This scaffold uses BestResults.AI placeholder language and must be
      reviewed by counsel before the platform accepts real participants.
    </div>
  );
}
