import { queryOptions } from "@tanstack/react-query";
import { createAuthClient } from "better-auth/react";

// Same origin as the Worker. The base path matches AUTH_BASE_PATH in src/auth.ts
// (not `/api/auth`, which Mastra owns).
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/better-auth",
});

/** The signed-in session, or null. Route guards read it with `ensureQueryData`. */
export const sessionQuery = queryOptions({
  queryKey: ["session"],
  queryFn: async () => {
    const { data, error } = await authClient.getSession();
    if (error) throw new Error(error.message ?? error.statusText);
    return data;
  },
  staleTime: 60_000,
});
