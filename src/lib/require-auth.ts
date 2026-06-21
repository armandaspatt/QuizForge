import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "./auth";

/**
 * Attaches the current session to server function context. Throws a 401 if
 * there's no logged-in user — every server function that touches per-user
 * data (question sets, attempts, review state) should chain this in.
 *
 * Usage: createServerFn().middleware([requireAuth]).handler(({ context }) => {
 *   const userId = context.userId;
 * })
 */
export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return next({
    context: {
      userId: session.user.id,
      userEmail: session.user.email,
    },
  });
});

/**
 * Like `requireAuth`, but never throws. Attaches `userId`/`userEmail` when a
 * session exists, otherwise `null`. Use this for server functions that have
 * both a saved (DB, per-user) and an anonymous (caller-supplied, ephemeral)
 * path — e.g. quiz-taking, which works without an account but persists for
 * users who are signed in.
 */
export const optionalAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  const session = await auth.api.getSession({ headers: request.headers });

  return next({
    context: {
      userId: session?.user?.id ?? null,
      userEmail: session?.user?.email ?? null,
    },
  });
});
