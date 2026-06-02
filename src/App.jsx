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
import CohortLanding from "./pages/cohort/CohortLanding";
import SessionDetail from "./pages/cohort/SessionDetail";
import BeltsPreview from "./pages/design/BeltsPreview";

// ---------------------------------------------------------------------------
// Route map (Round B):
//
//   /                          Marketing home / public landing
//   /login                     Two-column magic-link sign-in
//   /auth/verify               Magic-link token verification
//
//   /journey                   AI Empowerment Journey — generic (resolves to user's cohort)
//   /journal                   AI Empowerment Journal dashboard (entries + impact)
//   /journal/new               Log a new journal entry (form)
//   /journal/result            Post-submit confirmation (existing)
//
//   /cohort/:slug              Explicit cohort access (admin / multi-cohort)
//   /cohort/:slug/session/:n   Session detail within a specific cohort
//
//   /dashboard                 Legacy — redirects to /journal
//
//   /design/belts              Design reference page (belt gradients)
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

          {/* JOURNEY — workshop curriculum */}
          <Route path="/journey" element={<CohortLanding />} />
          <Route path="/cohort/:slug" element={<CohortLanding />} />
          <Route path="/cohort/:slug/session/:order" element={<SessionDetail />} />

          {/* JOURNAL — gamified impact tracking */}
          <Route path="/journal" element={<JournalDashboard />} />
          <Route path="/journal/new" element={<Journal />} />
          <Route path="/journal/result" element={<JournalResult />} />

          {/* Legacy redirects */}
          <Route path="/dashboard" element={<Navigate to="/journal" replace />} />

          {/* Design system */}
          <Route path="/design/belts" element={<BeltsPreview />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}
