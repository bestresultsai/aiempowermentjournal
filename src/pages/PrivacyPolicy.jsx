import { Link } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";
import NavBar from "../components/NavBar";

// ---------------------------------------------------------------------------
// /privacy — Privacy Policy. Public-route accessible (no AuthGate).
//
// IMPORTANT: copy here is a DRAFT scaffold tracked by task #468. Replace
// with legal-approved language before public launch. The structure should
// stay stable so links don't break.
// ---------------------------------------------------------------------------

const LAST_UPDATED = "June 17, 2026";

export default function PrivacyPolicy() {
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
              <Shield className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="h-eyebrow">Privacy</div>
          </div>
          <h1 className="font-heading text-[34px] lg:text-[40px] font-extrabold tracking-tight text-ink leading-tight">
            Privacy Policy
          </h1>
          <p className="text-[13.5px] text-ink-muted mt-2">Last updated {LAST_UPDATED}</p>
        </div>

        <DraftBanner />

        <article className="prose-policy animate-fade-in-up delay-100">
          <Section title="Who we are">
            <p>
              BestResults.AI ("we", "us") operates the AI Empowerment platform
              at platform.bestresults.ai (and any successor domain). This policy
              describes what personal information we collect, why we collect
              it, and what choices you have about it.
            </p>
          </Section>

          <Section title="Information we collect">
            <ul>
              <li>
                <strong>Account information</strong> — your name, email
                address, role/title, organization, time zone, and the
                headshot or profile image you upload.
              </li>
              <li>
                <strong>Program activity</strong> — your session progress,
                homework submissions, journal entries, feedback, and any
                files you attach.
              </li>
              <li>
                <strong>Onboarding responses</strong> — the goals and
                motivations you share with your facilitator at sign-up.
              </li>
              <li>
                <strong>Technical data</strong> — basic device and browser
                information needed to deliver the app and diagnose errors.
              </li>
            </ul>
          </Section>

          <Section title="How we use your information">
            <ul>
              <li>Deliver the cohort experience you signed up for.</li>
              <li>
                Show progress, feedback, and aggregate impact to you, your
                facilitator, your cohort leader (if any), and your
                organization administrator.
              </li>
              <li>
                Surface program insights — hours saved, innovations
                shipped, and gamification milestones — to motivate
                participation.
              </li>
              <li>
                Operate, secure, and improve the platform (including
                troubleshooting via aggregated diagnostics).
              </li>
            </ul>
          </Section>

          <Section title="Who can see your data">
            <ul>
              <li>
                <strong>You</strong> see everything you've submitted.
              </li>
              <li>
                <strong>Your facilitator + BRAI admins</strong> see your
                progress, journal entries, homework, and feedback for the
                cohorts you participate in.
              </li>
              <li>
                <strong>Your organization administrator</strong> (if any)
                sees engagement and impact across cohorts they own, but
                does not have access to your private settings or login
                credentials.
              </li>
              <li>
                <strong>Cohort leaders</strong> (peer participants
                designated by your org) see roster-level activity but not
                personal settings.
              </li>
              <li>
                We do <strong>not</strong> sell your information, and we do
                not share it with third parties for marketing.
              </li>
            </ul>
          </Section>

          <Section title="Retention">
            <p>
              We keep your account and program data while you have an
              active enrollment plus a reasonable post-program window so
              you can revisit your work and certificates. You can request
              deletion at any time using the support link below.
            </p>
          </Section>

          <Section title="Your rights">
            <p>
              Depending on your jurisdiction, you may have the right to
              access, correct, export, or delete your personal information.
              To exercise any of these rights, email{" "}
              <a href="mailto:support@bestresults.ai" className="text-brand-700 hover:text-brand-800">
                support@bestresults.ai
              </a>
              .
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              We may update this policy as the platform evolves. When we do,
              we'll update the "Last updated" date above and, for material
              changes, notify you in-app or by email.
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
