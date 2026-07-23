import { useState } from "react";
import { signUp, signIn } from "../lib/auth.js";

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
  fontSize: 15,
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
  fontSize: 15,
  cursor: "pointer",
};

export default function AuthScreen({ supabase }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [driverNumber, setDriverNumber] = useState("");
  const [garage, setGarage] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await signUp(supabase, { email, password, driverNumber, garage });
        if (signUpError) { setError(signUpError.message); return; }
        setAwaitingVerification(true);
      } else {
        const { error: signInError } = await signIn(supabase, { email, password });
        if (signInError) { setError(signInError.message); return; }
        // On success, App.jsx's onAuthStateChange subscription picks up the
        // new session and swaps this screen out — nothing further to do here.
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (awaitingVerification) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ background: CARD, borderRadius: 16, padding: 28, maxWidth: 380, textAlign: "center" }}>
          <h1 style={{ color: TEXT, fontSize: 20, marginBottom: 12 }}>Check your email</h1>
          <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.5 }}>
            We sent a verification link to <strong style={{ color: TEXT }}>{email}</strong>. Confirm it, then come back and log in.
          </p>
          <button style={{ ...buttonStyle, marginTop: 20 }} onClick={() => { setAwaitingVerification(false); setMode("login"); }}>
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form onSubmit={handleSubmit} style={{ background: CARD, borderRadius: 16, padding: 28, width: "100%", maxWidth: 380 }}>
        <h1 style={{ color: TEXT, fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
          {mode === "signup" ? "Create account" : "Log in"}
        </h1>
        <p style={{ color: MUTED, fontSize: 13, marginBottom: 20 }}>
          {mode === "signup" ? "Sync your duty logs and settings across devices." : "Welcome back."}
        </p>

        <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />

        {mode === "signup" && (
          <>
            <input style={inputStyle} type="text" placeholder="Driver number" value={driverNumber} onChange={(e) => setDriverNumber(e.target.value)} required />
            <input style={inputStyle} type="text" placeholder="Garage" value={garage} onChange={(e) => setGarage(e.target.value)} required />
          </>
        )}

        {error && <p style={{ color: DANGER, fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button style={buttonStyle} type="submit" disabled={submitting}>
          {submitting ? "Please wait…" : mode === "signup" ? "Sign up" : "Log in"}
        </button>

        <p style={{ color: MUTED, fontSize: 13, marginTop: 16, textAlign: "center" }}>
          {mode === "signup" ? "Already have an account?" : "New driver?"}{" "}
          <button
            type="button"
            onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(null); }}
            style={{ background: "none", border: "none", color: ACCENT, cursor: "pointer", fontSize: 13, fontWeight: 700, padding: 0 }}
          >
            {mode === "signup" ? "Log in" : "Sign up"}
          </button>
        </p>
      </form>
    </div>
  );
}
