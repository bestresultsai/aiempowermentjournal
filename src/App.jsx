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
import AdminCalendar from "./pages/admin/AdminCalendar";
import AdminParticipants from "./pages/admin/AdminParticipants";
import AdminParticipantDetail from "./pages/admin/AdminParticipantDetail";
import AdminParticipantNew from "./pages/admin/AdminParticipantNew";
import AdminOrgs from "./pages/admin/AdminOrgs";
import AdminFacilitators from "./pages/admin/AdminFacilitators";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserNew from "./pages/admin/AdminUserNew";
import AdminPermissions from "./pages/admin/AdminPermissions";
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
import NotFound from "./pages/NotFound";

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
//   /admin/participants       Directory of all participants in scope (with search)
//   /admin/participants/:id   Participant detail — profile + progress + submissions
//   /admin/users              Cross-cutting Users directory (was "Super Admin")
//
//   /dashboard                Legacy redirect → /journal
//   /design/belts             Design reference page
//
// The OnboardingGate wraps all routes and redirects signed-in users who
// haven't finished /welcome to the wizard, and bounces already-onboarded
// users back to /home if they manually visit /welcome.
// ---------------------------------------------------------------------------

// Backward-compat redirect for /admin/users/:id → /admin/participants/:id.
// Need a tiny wrapper to forward the :id route param.
import { useParams } from "react-router-dom";
function NavigateParticipant() {
  const { id } = useParams();
  return <Navigate to={`/admin/participants/${id}`} replace />;
}

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
              <Route path="calendar" element={<AdminCalendar />} />
              {/* Participants list + per-participant detail. */}
              <Route path="participants" element={<AdminParticipants />} />
              <Route path="participants/new" element={<AdminParticipantNew />} />
              <Route path="participants/:id" element={<AdminParticipantDetail />} />
              {/* Backward-compat redirect from the old /admin/users/:id path
                  (used to be the participant detail route). */}
              <Route path="users/:id" element={<NavigateParticipant />} />
              {/* Users — cross-cutting directory + unified user creation. */}
              <Route path="users" element={<AdminUsers />} />
              <Route path="users/new" element={<AdminUserNew />} />
              <Route path="permissions" element={<AdminPermissions />} />
              <Route path="orgs" element={<AdminOrgs />} />
              <Route path="facilitators" element={<AdminFacilitators />} />
            </Route>

            {/* Legacy + utility */}
            <Route path="/dashboard" element={<Navigate to="/journal" replace />} />
            <Route path="/design/belts" element={<BeltsPreview />} />

            {/* Catch-all */}
            {/* 404 — brand-styled "page not found" with quick links back. */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </OnboardingGate>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}
