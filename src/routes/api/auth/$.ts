import { createFileRoute } from "@tanstack/react-router";
import { auth } from "../../../lib/auth";

// Mounts every Better Auth endpoint (sign-in, sign-up, sign-out, session,
// etc.) under /api/auth/*. Better Auth ships its own request handler, so
// this file just forwards the raw request to it for both GET and POST.
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
});
