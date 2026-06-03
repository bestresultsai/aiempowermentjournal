import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import DemoBanner from "./components/DemoBanner";
import Footer from "./components/Footer";
import OnboardingGate from "./components/OnboardingGate";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AuthVerify from "./pages/AuthVerify";
import Journal from "./pages/Journal";
import JournalResult from "./pages/JournalResult";
import JournalDashboard from "./pages/JournalDashboard";
import JourneyPage from "./pages/JourneyPage";
import Resources from "./pages/Resources";
import Settings from "./pages/Settings";
import WelcomeWizard from "./pages/WelcomeWizard";
import CohortLanding from "./pages/cohort/CohortLanding";
import SessionDetail from "./pages/cohort/SessionDetail";
import BeltsPreview from "./pages/design/BeltsPreview";

// ---------------------------------------------------------------------------
// Route map (Round B + onboarding):
//
//   /                         Marketing splash; redirects signed-in users to /home
//   /login                    Two-column magic-link sign-in
//   /auth/verify              Magic-link token verification
//
//   /welcome                  ONBOARDING WIZARD — fires on first login, gated
//                             by OnboardingGate via user.onboardingCompletedAt
//
//   /home                     HOME — comprehensive overview
//   /journey                  AI EMPOWERMENT JOURNEY — workshop-focused
//   /session/:order           Session detail (generic; resolves to user's primary cohort)
//
//   /journal                  AI EMPOWERMENT JOURNAL — dashboard
//   /journal/new              Log a new journal entry (form)
//   /journal/result           Post-submit confirmation
//
//   /resources                Resource library (placeholder)
//   /settings                 Profile editor (name, title, phone, headshot)
//
//   /cohort/:slug             Explicit cohort access — same UI as /home
//   /cohort/:slug/session/:n  Session detail
//
//   /dashboard                Legacy redirect → /journal
//   /design/belts             Design reference page
//
// The OnboardingGate wraps all routes and redirects signed-in users who
// haven't finished /welcome to the wizard, and bounces already-onboarded
// users back to /home if they manually visit /welcome.
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <DemoBanner />
        <OnboardingGate>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/verify" element={<AuthVerify />} />

            {/* ONBOARDING */}
            <Route path="/welcome" element={<WelcomeWizard />} />

            {/* HOME — comprehensive overview */}
            <Route path="/home" element={<CohortLanding />} />

            {/* JOURNEY — workshop-focused */}
            <Route path="/journey" element={<JourneyPage />} />
            <Route path="/session/:order" element={<SessionDetail />} />

            {/* JOURNAL — gamified impact tracking */}
            <Route path="/journal" element={<JournalDashboard />} />
            <Route path="/journal/new" element={<Journal />} />
            <Route path="/journal/result" element={<JournalResult />} />

            {/* Resources + Settings */}
            <Route path="/resources" element={<Resources />} />
            <Route path="/settings" element={<Settings />} />

            {/* Explicit cohort routes (admin / multi-cohort) */}
            <Route path="/cohort/:slug" element={<CohortLanding />} />
            <Route path="/cohort/:slug/session/:order" element={<SessionDetail />} />

            {/* Legacy + utility */}
            <Route path="/dashboard" element={<Navigate to="/journal" replace />} />
            <Route path="/design/belts" element={<BeltsPreview />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </OnboardingGate>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}
