import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { sendMagicLink } from "../lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle, sending, sent, error
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    try {
      await sendMagicLink(email.trim());
      setStatus("sent");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#F8FAFC", padding: 20,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "40px 32px",
        border: "1px solid #E2E8F0", maxWidth: 400, width: "100%",
        boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Logo size="md" showTagline />
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", textAlign: "center", margin: "0 0 6px" }}>
          Sign In
        </h2>
        <p style={{ fontSize: 13, color: "#64748B", textAlign: "center", margin: "0 0 24px" }}>
          Enter your email to receive a magic login link
        </p>

        {status === "sent" ? (
          <div style={{
            background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10,
            padding: 20, textAlign: "center",
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✉️</div>
            <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 15, marginBottom: 6 }}>Check your email</div>
            <div style={{ fontSize: 13, color: "#64748B" }}>
              We sent a login link to <strong>{email}</strong>. Click it to sign in.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 8,
                border: "1px solid #E2E8F0", fontSize: 14, outline: "none",
                boxSizing: "border-box", marginBottom: 16,
              }}
            />
            {status === "error" && (
              <div style={{ color: "#DC2626", fontSize: 12, marginBottom: 12 }}>{errorMsg}</div>
            )}
            <button type="submit" disabled={status === "sending"} style={{
              width: "100%", padding: "12px 0", borderRadius: 10,
              background: status === "sending" ? "#93C5FD" : "#2563EB",
              color: "#fff", border: "none", fontSize: 14, fontWeight: 700,
              cursor: status === "sending" ? "not-allowed" : "pointer",
            }}>
              {status === "sending" ? "Sending..." : "Send Magic Link"}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span style={{ fontSize: 12, color: "#94A3B8" }}>Are you a workshop participant? </span>
          <Link to="/journal" style={{ fontSize: 12, color: "#2563EB", fontWeight: 600 }}>
            Go to Journal Form →
          </Link>
        </div>
      </div>
    </div>
  );
}
