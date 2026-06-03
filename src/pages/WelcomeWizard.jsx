import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { saveOnboarding } from "../lib/onboardingApi";
import Logo from "../components/Logo";
import StepperHeader from "../components/onboarding/StepperHeader";
import StepWelcome from "../components/onboarding/StepWelcome";
import StepProfile from "../components/onboarding/StepProfile";
import StepGoals from "../components/onboarding/StepGoals";

// ---------------------------------------------------------------------------
// /welcome — first-login wizard.
//
// Three steps:
//   1) Welcome  — orientation, no fields
//   2) Profile  — name, role, LinkedIn, headshot
//   3) Goals    — why AI + main cohort goal
//
// Step 3 submit calls saveOnboarding() and then completeOnboarding() on the
// AuthContext, which sets onboardingCompletedAt → the OnboardingGate stops
// redirecting here and lets the user into /home.
// ---------------------------------------------------------------------------

const STEPS = ["Welcome", "Profile", "Goals"];

export default function WelcomeWizard() {
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: user?.name || "",
    title: user?.title || "",
    linkedin: user?.linkedin || "",
    headshotUrl: user?.headshotUrl || null,
    whyAi: user?.whyAi || "",
    mainGoal: user?.mainGoal || "",
  });

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Validation per step. Step 1 is just a CTA, Step 2 needs a name, Step 3
  // needs both prompts answered. The submit button on Step 3 stays enabled
  // but submission itself surfaces a friendly error if anything is empty.
  function isStepValid(s = step) {
    if (s === 1) return true;
    if (s === 2) return form.name.trim().length > 0;
    if (s === 3) {
      return form.whyAi.trim().length > 0 && form.mainGoal.trim().length > 0;
    }
    return true;
  }

  function handleNext() {
    setError(null);
    if (!isStepValid()) {
      setError(
        step === 2
          ? "Add your name so your cohort can recognize you."
          : "Please fill in both prompts before continuing.",
      );
      return;
    }
    if (step < STEPS.length) setStep(step + 1);
  }

  function handleBack() {
    setError(null);
    if (step > 1) setStep(step - 1);
  }

  async function handleFinish() {
    setError(null);
    if (!isStepValid(3)) {
      setError("Please answer both prompts before finishing.");
      return;
    }
    setSubmitting(true);
    try {
      const { profile } = await saveOnboarding(form);
      completeOnboarding(profile);
      navigate("/home", { replace: true });
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const firstName = (user?.name || form.name || "").split(" ")[0] || "";

  return (
    <div className="min-h-screen bg-surface-paper flex flex-col">
      {/* Top bar — just the logo so the wizard feels distinct from the app. */}
      <header className="px-6 lg:px-10 py-6 flex items-center justify-between">
        <Logo size="md" />
        <div className="text-[12px] font-heading text-ink-subtle">
          Setting up your profile
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-6 lg:px-10 pb-16">
        <div className="w-full max-w-2xl">
          {/* Stepper */}
          <div className="mb-10 animate-fade-in-up">
            <StepperHeader steps={STEPS} current={step} />
          </div>

          {/* Active step content */}
          <div key={step} className="animate-fade-in-up">
            {step === 1 && <StepWelcome firstName={firstName} />}
            {step === 2 && <StepProfile form={form} update={update} />}
            {step === 3 && <StepGoals form={form} update={update} />}
          </div>

          {/* Inline error */}
          {error && (
            <div className="mt-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-heading font-medium">
              {error}
            </div>
          )}

          {/* Footer nav */}
          <div className="mt-10 flex items-center justify-between gap-3 pt-6 border-t border-soft">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1 || submitting}
              className={
                "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[14px] font-heading font-semibold transition-all duration-200 " +
                (step === 1 || submitting
                  ? "text-ink-subtle cursor-not-allowed"
                  : "text-ink-muted hover:text-ink hover:bg-ink/5")
              }
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
              Back
            </button>

            <div className="text-[12px] font-heading text-ink-subtle">
              Step {step} of {STEPS.length}
            </div>

            {step < STEPS.length ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={submitting}
                className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink text-white text-[14px] font-heading font-semibold hover:bg-brand-700 transition-colors duration-200"
              >
                {step === 1 ? "Let's go" : "Continue"}
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={submitting}
                className={
                  "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-heading font-semibold transition-colors duration-200 " +
                  (submitting
                    ? "bg-ink/60 text-white cursor-wait"
                    : "bg-brand-600 text-white hover:bg-brand-700")
                }
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                    Finish &amp; enter cohort
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
