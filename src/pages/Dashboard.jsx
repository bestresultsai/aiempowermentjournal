import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NavBar from "../components/NavBar";
import AdminDashboard from "../dashboards/AdminDashboard";
import TrainerDashboard from "../dashboards/TrainerDashboard";
import OrgLeaderDashboard from "../dashboards/OrgLeaderDashboard";
import IndividualDashboard from "../dashboards/IndividualDashboard";
import { getEntries, getCohorts } from "../lib/api";

export default function Dashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const participantEmail = searchParams.get("email");

  const [entries, setEntries] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOpts = {};
    if (user?.role === "org_leader") fetchOpts.org = user.organization;
    if (participantEmail && !user) fetchOpts.email = participantEmail;

    Promise.all([getEntries(fetchOpts), getCohorts()])
      .then(([e, c]) => {
        setEntries(e);
        setCohorts(c);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <>
        <NavBar />
        <div style={{ textAlign: "center", padding: 60, color: "#64748B" }}>Loading dashboard...</div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <NavBar />
        <div style={{ textAlign: "center", padding: 60, color: "#DC2626" }}>Error: {error}</div>
      </>
    );
  }

  // If no auth but has email param, show individual view
  if (!user && participantEmail) {
    const myEntries = entries.filter(e =>
      e.participantEmail?.toLowerCase() === participantEmail.toLowerCase()
    );
    return (
      <>
        <NavBar />
        <IndividualDashboard entries={myEntries} allEntries={entries} cohorts={cohorts} email={participantEmail} />
      </>
    );
  }

  // If no auth at all, redirect to login would normally happen via route guard
  // But we'll show individual if entries exist from URL
  if (!user) {
    return (
      <>
        <NavBar />
        <div style={{ textAlign: "center", padding: 60, color: "#64748B" }}>
          Please sign in to view the dashboard.
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar />
      {user.role === "admin" && (
        <AdminDashboard entries={entries} cohorts={cohorts} />
      )}
      {user.role === "trainer" && (
        <TrainerDashboard entries={entries} cohorts={cohorts} user={user} />
      )}
      {user.role === "org_leader" && (
        <OrgLeaderDashboard entries={entries} cohorts={cohorts} user={user} />
      )}
    </>
  );
}
