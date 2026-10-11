import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { d1 } from "./db/index.js";
import * as authSchema from "./db/schema/auth.js";

// Auth for everything the Worker serves except the MCP OAuth flow:
// - people sign in with Google through Better Auth (`getAuth()`, mounted at
//   AUTH_BASE_PATH). Sign-up is closed: only emails in AUTH_ALLOWED_EMAILS get an
//   account, and removing one ends that user's next sign-in
// - Mastra `/api/*` routes take that session or an API key (`AppAuthProvider`,
//   src/mastra/auth.ts, Mastra's `server.auth`)
// - oRPC procedures take the same (`protectedProcedure`, src/rpc/orpc.ts)
// Secrets are read per request: the `cloudflare:workers` env proxy is unusable at module scope.

/** The MCP endpoint, which `OAuthProvider` only lets through with a valid token. */
export const MCP_PATH = "/api/mcp/weather-mcp/mcp";

/** Better Auth's routes. Not `/api/auth`: Mastra registers its own routes there. */
export const AUTH_BASE_PATH = "/api/better-auth";

export async function sha256(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
}

/** Compares digests so the time taken doesn't leak how much of a secret matched. */
async function safeEqual(a: string, b: string) {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

function list(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** True when `key` is one of the comma-separated `API_KEYS`. */
export async function isValidApiKey(key: string) {
  let valid = false;
  for (const candidate of list(env.API_KEYS)) {
    valid = (await safeEqual(candidate, key)) || valid;
  }
  return valid;
}

/** An API key sent as `X-API-Key` or `Authorization: Bearer`. */
export function apiKeyFrom(headers: Headers) {
  const header = headers.get("X-API-Key");
  if (header) return header;
  return headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
}

/** Fails closed: nobody may sign in while AUTH_ALLOWED_EMAILS is unset. */
function assertAllowed(email: string | undefined) {
  const allowed = list(env.AUTH_ALLOWED_EMAILS).map((e) => e.toLowerCase());
  if (!email || !allowed.includes(email.toLowerCase())) {
    throw new APIError("FORBIDDEN", { message: "This account is not allowed" });
  }
}

function createAuth() {
  return betterAuth({
    basePath: AUTH_BASE_PATH,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(drizzle(d1, { schema: authSchema }), {
      provider: "sqlite",
      schema: authSchema,
    }),
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        prompt: "select_account",
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => assertAllowed(user.email),
        },
      },
      session: {
        create: {
          before: async (session, ctx) => {
            const user = await ctx?.context.internalAdapter.findUserById(session.userId);
            assertAllowed(user?.email);
          },
        },
      },
    },
    session: { cookieCache: { enabled: true, maxAge: 60 } },
  });
}

export type Auth = ReturnType<typeof createAuth>;

let instance: Auth | undefined;

/** The Better Auth instance, built on first use (it reads secrets from `env`). */
export function getAuth() {
  instance ??= createAuth();
  return instance;
}

/** `getAuth()` for objects built at module scope (Mastra's auth provider). */
export const auth = new Proxy({} as Auth, {
  get(_, prop) {
    const value = Reflect.get(getAuth(), prop);
    return typeof value === "function" ? value.bind(getAuth()) : value;
  },
});
