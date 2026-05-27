import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import DemoBanner from "./components/DemoBanner";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AuthVerify from "./pages/AuthVerify";
import Journal from "./pages/Journal";
import JournalResult from "./pages/JournalResult";
import Dashboard from "./pages/Dashboard";
import CohortLanding from "./pages/cohort/CohortLanding";
import SessionDetail from "./pages/cohort/SessionDetail";
import BeltsPreview from "./pages/design/BeltsPreview";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <DemoBanner />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/verify" element={<AuthVerify />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/journal/result" element={<JournalResult />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cohort/:slug" element={<CohortLanding />} />
          <Route path="/cohort/:slug/session/:order" element={<SessionDetail />} />
          <Route path="/design/belts" element={<BeltsPreview />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
