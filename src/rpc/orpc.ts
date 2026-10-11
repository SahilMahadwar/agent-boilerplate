import { ORPCError, os } from "@orpc/server";
import { apiKeyFrom, type Auth, getAuth, isValidApiKey } from "../auth.js";

// Bindings are read from `cloudflare:workers` `env` where needed, so the context
// carries only what is request-scoped.
export type RpcContext = {
  /** Keeps background work (e.g. a manual schedule run) alive after the response. */
  waitUntil: (promise: Promise<unknown>) => void;
  headers: Headers;
};

export const o = os.$context<RpcContext>();

export const publicProcedure = o;

type Session = Auth["$Infer"]["Session"];

/** A valid API key (API_KEYS), else the dashboard's Better Auth session. */
const requireAuth = o.middleware(async ({ context, next }) => {
  const key = apiKeyFrom(context.headers);
  if (key !== undefined) {
    if (!(await isValidApiKey(key))) throw new ORPCError("UNAUTHORIZED");
    return next({ context: { session: null as Session | null } });
  }
  const session = await getAuth().api.getSession({ headers: context.headers });
  if (!session) throw new ORPCError("UNAUTHORIZED");
  return next({ context: { session: session as Session | null } });
});

/** Every procedure except health checks. `context.session` is null for API keys. */
export const protectedProcedure = publicProcedure.use(requireAuth);
