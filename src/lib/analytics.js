import posthog from "posthog-js";

// Missing key = analytics silently no-op (local dev, CI, forks without a
// PostHog project). Never throw or block the app over a missing env var.
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

let initialized = false;

export function initAnalytics() {
  if (initialized || !POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    // Production routes through /ingest (see public/_redirects), which
    // Netlify rewrites to POSTHOG_HOST server-side — dodges ad blockers
    // that drop requests to known tracker domains. The rewrite only exists
    // on the deployed site, so dev talks to POSTHOG_HOST directly.
    api_host: import.meta.env.PROD ? "/ingest" : POSTHOG_HOST,
    ui_host: POSTHOG_HOST,
    // This is a single-page app — there's no real page load per screen, so
    // the library's own history-based autocapture never fires. We call
    // trackScreen() ourselves whenever the `screen` state changes instead.
    capture_pageview: false,
    // capture_pageleave defaults to "if_capture_pageview" — disabling
    // capture_pageview above silently disables this too unless forced on.
    // Without it, PostHog can't compute session duration or bounce rate.
    capture_pageleave: true,
    autocapture: true,
    persistence: "localStorage+cookie",
  });
  initialized = true;
}

// One event per screen switch, with time-on-screen implied by the gap
// between consecutive events (PostHog computes this from event timestamps
// in session/funnel views — no separate duration tracking needed).
export function trackScreen(screen, props = {}) {
  if (!initialized) return;
  posthog.capture("$pageview", { screen, ...props });
}

export function trackEvent(name, props = {}) {
  if (!initialized) return;
  posthog.capture(name, props);
}

// Ties anonymous pre-login activity to the real driver once they sign in,
// so a session that starts on AuthScreen and ends on HomeScreen stays one
// person in PostHog instead of splitting into two.
export function identifyUser(userId, props = {}) {
  if (!initialized || !userId) return;
  posthog.identify(userId, props);
}

// Call on sign-out — otherwise the next driver on a shared device inherits
// the previous driver's PostHog identity.
export function resetAnalytics() {
  if (!initialized) return;
  posthog.reset();
}
