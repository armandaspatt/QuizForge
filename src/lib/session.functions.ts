import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "./auth";

/** Returns the current session (or null), for use in route `beforeLoad` guards. */
export const getCurrentSession = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user
    ? { id: session.user.id, email: session.user.email, name: session.user.name }
    : null;
});
