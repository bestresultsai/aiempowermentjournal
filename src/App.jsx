import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import DemoBanner from "./components/DemoBanner";
import Footer from "./components/Footer";
import OnboardingGate from "./components/OnboardingGate";
import AdminGate from "./components/AdminGate";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCohorts from "./pages/admin/AdminCohorts";
import AdminCohortRoster from "./pages/admin/AdminCohortRoster";
import AdminCohortNew from "./pages/admin/AdminCohortNew";
import AdminCohortEdit from "./pages/admin/AdminCohortEdit";
import AdminCohortAddParticipants from "./pages/admin/AdminCohortAddParticipants";
import AdminJournalDashboard from "./pages/admin/AdminJournalDashboard";
import AdminHomeworkQueue from "./pages/admin/AdminHomeworkQueue";
import AdminParticipants from "./pages/admin/AdminParticipants";
import AdminParticipantDetail from "./pages/admin/AdminParticipantDetail";
import AdminParticipantNew from "./pages/admin/AdminParticipantNew";
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
import CohortLeaderDashboard from "./pages/leader/CohortLeaderDashboard";
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
//   /admin                    ADMIN PANEL — gated by AdminGate (role !== participant)
//   /admin/cohorts            List of cohorts in scope
//   /admin/cohorts/new        Create cohort (super + admin only)
//   /admin/cohorts/:slug      Roster: participants + per-belt progress
//   /admin/cohorts/:slug/edit Edit cohort (gated by canEditCohort)
//   /admin/journal            AI Journal dashboard — hours saved, leaderboard, stale
//   /admin/homework           Pending homework queue (read-only round 1)
//   /admin/users              Directory of all participants in scope (with search)
//   /admin/users/:id          Participant detail — profile + progress + submissions
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

            {/* COHORT LEADER — aggregate view, only for participants flagged as leader */}
            <Route path="/leader/cohort" element={<CohortLeaderDashboard />} />

            {/* Explicit cohort routes (admin / multi-cohort) */}
            <Route path="/cohort/:slug" element={<CohortLanding />} />
            <Route path="/cohort/:slug/session/:order" element={<SessionDetail />} />

            {/* ADMIN PANEL — role-gated; participants are redirected to /home */}
            <Route
              path="/admin"
              element={
                <AdminGate>
                  <AdminLayout />
                </AdminGate>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="cohorts" element={<AdminCohorts />} />
              <Route path="cohorts/new" element={<AdminCohortNew />} />
              <Route path="cohorts/:slug" element={<AdminCohortRoster />} />
              <Route path="cohorts/:slug/edit" element={<AdminCohortEdit />} />
              <Route path="cohorts/:slug/participants/add" element={<AdminCohortAddParticipants />} />
              <Route path="journal" element={<AdminJournalDashboard />} />
              <Route path="homework" element={<AdminHomeworkQueue />} />
              <Route path="users" element={<AdminParticipants />} />
              <Route path="users/new" element={<AdminParticipantNew />} />
              <Route path="users/:id" element={<AdminParticipantDetail />} />
            </Route>

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
