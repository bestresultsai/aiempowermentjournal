import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { verifyToken } from "../lib/api";
import Logo from "../components/Logo";

export default function AuthVerify() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying");
  const [errorMsg, setErrorMsg] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setErrorMsg("No token provided");
      return;
    }

    verifyToken(token)
      .then(data => {
        login(data.token, data.user);
        setStatus("success");
        setTimeout(() => navigate("/dashboard"), 1000);
      })
      .catch(err => {
        setStatus("error");
        setErrorMsg(err.message);
      });
  }, []);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#F8FAFC", padding: 20,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "40px 32px",
        border: "1px solid #E2E8F0", maxWidth: 400, width: "100%",
        textAlign: "center",
      }}>
        <Logo size="md" />
        <div style={{ marginTop: 24 }}>
          {status === "verifying" && (
            <>
              <div style={{ fontSize: 28, marginBottom: 12 }}>🔐</div>
              <div style={{ fontWeight: 600, color: "#0F172A" }}>Verifying your login...</div>
            </>
          )}
          {status === "success" && (
            <>
              <div style={{ fontSize: 28, marginBottom: 12 }}>✅</div>
              <div style={{ fontWeight: 600, color: "#059669" }}>You're signed in! Redirecting...</div>
            </>
          )}
          {status === "error" && (
            <>
              <div style={{ fontSize: 28, marginBottom: 12 }}>❌</div>
              <div style={{ fontWeight: 600, color: "#DC2626", marginBottom: 8 }}>Login Failed</div>
              <div style={{ fontSize: 13, color: "#64748B" }}>{errorMsg}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
