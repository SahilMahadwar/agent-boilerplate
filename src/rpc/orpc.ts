import { os } from "@orpc/server";

// Bindings are read from `cloudflare:workers` `env` where needed, so the context
// carries only what is request-scoped.
export type RpcContext = {
  /** Keeps background work (e.g. a manual schedule run) alive after the response. */
  waitUntil: (promise: Promise<unknown>) => void;
  headers: Headers;
};

export const o = os.$context<RpcContext>();

export const publicProcedure = o;

// To protect procedures, add a middleware and build routers from it instead:
//
//   const requireAuth = o.middleware(async ({ context, next }) => {
//     const user = await getUser(context.headers);
//     if (!user) throw new ORPCError("UNAUTHORIZED");
//     return next({ context: { user } });
//   });
//   export const protectedProcedure = publicProcedure.use(requireAuth);
