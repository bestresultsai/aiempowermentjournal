import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import DemoBanner from "./components/DemoBanner";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AuthVerify from "./pages/AuthVerify";
import Journal from "./pages/Journal";
import JournalResult from "./pages/JournalResult";
import JournalDashboard from "./pages/JournalDashboard";
import JourneyPage from "./pages/JourneyPage";
import Resources from "./pages/Resources";
import Settings from "./pages/Settings";
import CohortLanding from "./pages/cohort/CohortLanding";
import SessionDetail from "./pages/cohort/SessionDetail";
import BeltsPreview from "./pages/design/BeltsPreview";

// ---------------------------------------------------------------------------
// Route map (Round B + architecture revision):
//
//   /                         Marketing splash; redirects signed-in users to /home
//   /login                    Two-column magic-link sign-in
//   /auth/verify              Magic-link token verification
//
//   /home                     HOME — comprehensive overview (formerly /journey)
//                             Welcome banner + Hero + Facilitator + Next Live +
//                             Missing Homework + Progress + NDA + Curriculum
//                             (CohortLanding component)
//
//   /journey                  AI EMPOWERMENT JOURNEY — workshop-focused
//                             Page header + Next Live + Missing Homework + Curriculum
//                             (JourneyPage component)
//
//   /journal                  AI EMPOWERMENT JOURNAL — dashboard
//                             Header + Journal Game Card + Next Milestone +
//                             Cohort Impact + Innovation Spotlight
//                             (JournalDashboard component)
//   /journal/new              Log a new journal entry (form)
//   /journal/result           Post-submit confirmation
//
//   /resources                Resource library (currently a coming-soon placeholder)
//   /settings                 Profile editor (name, title, phone, headshot)
//
//   /cohort/:slug             Explicit cohort access — same UI as /home, slug-locked
//   /cohort/:slug/session/:n  Session detail
//
//   /dashboard                Legacy redirect → /journal
//
//   /design/belts             Design reference page
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <DemoBanner />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/verify" element={<AuthVerify />} />

          {/* HOME — comprehensive overview */}
          <Route path="/home" element={<CohortLanding />} />

          {/* JOURNEY — workshop-focused */}
          <Route path="/journey" element={<JourneyPage />} />
          {/* Generic session URL — resolves to the user's primary cohort */}
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
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}
