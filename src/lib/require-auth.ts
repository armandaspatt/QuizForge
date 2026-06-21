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
