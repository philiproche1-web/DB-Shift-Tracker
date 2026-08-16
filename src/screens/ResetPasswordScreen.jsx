import { useState } from "react";
import { updatePassword } from "../lib/auth.js";

const BG = "#07090F";
const CARD = "#11141B";
const TEXT = "#F5F6F8";
const MUTED = "#8A90A0";
const ACCENT = "#F5C244";
const DANGER = "#EF4444";

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #262B36",
  background: "#0D1017",
  color: TEXT,
  fontSize:"0.9375rem",
  marginBottom: 12,
  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: 10,
  border: "none",
  background: ACCENT,
  color: "#07090F",
  fontWeight: 700,
  fontSize:"0.9375rem",
  cursor: "pointer",
};

export default function ResetPasswordScreen({ supabase, onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setSubmitting(true);
    try {
      const { error: updateError } = await updatePassword(supabase, password);
      if (updateError) { setError(updateError.message); return; }
      onDone();
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form onSubmit={handleSubmit} style={{ background: CARD, borderRadius: 16, padding: 28, width: "100%", maxWidth: 380 }}>
        <h1 style={{ color: TEXT, fontSize:"1.375rem", fontWeight: 800, marginBottom: 4 }}>Set a new password</h1>
        <p style={{ color: MUTED, fontSize:"0.8125rem", marginBottom: 20 }}>Choose a new password for your account.</p>

        <input style={inputStyle} type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoFocus />
        <input style={inputStyle} type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
        <p style={{ color: MUTED, fontSize:"0.75rem", marginTop: -8, marginBottom: 12 }}>
          Use at least 8 characters, mixing letters, numbers, and a symbol.
        </p>

        {error && <p style={{ color: DANGER, fontSize:"0.8125rem", marginBottom: 12 }}>{error}</p>}

        <button style={buttonStyle} type="submit" disabled={submitting}>
          {submitting ? "Please wait…" : "Save new password"}
        </button>
      </form>
    </div>
  );
}
