import { Component } from "react";
import { BG, TEXT, MUTED, ACCENT, DANGER } from "../lib/theme.js";
import { BusLogo } from "./shared.jsx";

// Last line of defence. Without this, any render throw anywhere in the tree
// unmounts React and leaves the driver staring at a blank white screen with
// no explanation and nothing to tap — which is exactly what happened in the
// 2026-07-18 stale-shell incident, and how it was found: a driver reported it.
//
// Deliberately plain: no hooks, no context, no theme subscription, no data
// access. Whatever just failed, this must still render. It reads the theme
// tokens once at render (plain module values) and touches nothing else.
//
// It does NOT try to recover state — a thrown render means the tree's state
// is untrustworthy. It offers a reload, which re-reads the driver's data from
// local storage and their account, both untouched by a render crash.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // No reporting service is wired up yet, so at minimum make the failure
    // recoverable from a driver's own device: the console keeps the stack for
    // a remote-debugging session, and the message is shown below so a driver
    // can read it out over the phone.
    console.error("[ErrorBoundary] render failed:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const message = this.state.error?.message || String(this.state.error);

    return (
      <div style={{
        background: BG, minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center",
      }}>
        <div style={{ marginBottom: 20 }}><BusLogo size={56} /></div>
        <p style={{ color: TEXT, fontSize: 17, fontWeight: 700, margin: "0 0 10px" }}>
          Something went wrong
        </p>
        <p style={{ color: MUTED, fontSize: 14, margin: "0 0 4px", maxWidth: 320, lineHeight: 1.6 }}>
          The app hit a problem and couldn't finish loading this screen.
        </p>
        <p style={{ color: MUTED, fontSize: 14, margin: "0 0 24px", maxWidth: 320, lineHeight: 1.6 }}>
          <strong style={{ color: TEXT }}>Your shifts and leave are safe</strong> — they're stored on
          this phone and on your account, and nothing here has changed them.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: ACCENT, color: "#07090F", border: "none", borderRadius: 12,
            padding: "16px 20px", fontSize: 16, fontWeight: 800, cursor: "pointer",
            width: "100%", maxWidth: 280, letterSpacing: "0.3px",
          }}
        >
          Reload the app
        </button>
        <details style={{ marginTop: 28, maxWidth: 320, width: "100%" }}>
          <summary style={{ color: MUTED, fontSize: 12, cursor: "pointer" }}>
            Details to report
          </summary>
          <p style={{
            color: DANGER, fontSize: 11, margin: "10px 0 0", wordBreak: "break-word",
            fontFamily: "monospace", textAlign: "left", lineHeight: 1.5,
          }}>
            {message}
          </p>
        </details>
      </div>
    );
  }
}
