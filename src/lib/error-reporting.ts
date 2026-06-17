// Lightweight client-side error logger for the root error boundary.
// Swap the body of `reportError` for your error-tracking provider of
// choice (Sentry, Bugsnag, a custom endpoint, etc.) when you're ready.

type ErrorContext = Record<string, unknown>;

export function reportError(error: unknown, context: ErrorContext = {}) {
  if (typeof window === "undefined") return;
  console.error("[app error]", error, {
    route: window.location.pathname,
    ...context,
  });
}
