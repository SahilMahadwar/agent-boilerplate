import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import {
  type HonoBindings,
  type HonoVariables,
  MastraServer,
} from "@mastra/hono";
import { type Context, Hono } from "hono";
import { mastra } from "./mastra/index.js";
import { oauth } from "./routes/oauth.js";
import { openApiHandler, rpcHandler } from "./rpc/index.js";
import type { RpcContext } from "./rpc/orpc.js";
import { runDueSchedules } from "./schedules/runner.js";

// The MCP endpoint ChatGPT and Claude connect to. Only this path is served from
// `/api/mcp/*`, and it requires an OAuth access token (see `providerFor`).
const MCP_PATH = "/api/mcp/weather-mcp/mcp";

const app = new Hono<{ Bindings: HonoBindings; Variables: HonoVariables }>();
const server = new MastraServer({ app, mastra });

// Mastra also registers MCP side routes (`/api/mcp/:serverId/tools/...`, `/sse`, the
// registry) that would bypass OAuth. Requests reach this app with a valid token only
// on MCP_PATH, so everything else under `/api/mcp` is refused before Mastra sees it.
app.use("/api/mcp/*", async (c, next) => {
  if (c.req.path !== MCP_PATH) return c.notFound();
  await next();
});

// Custom endpoints are oRPC procedures (src/rpc/routers). The SPA calls
// them through `/api/rpc`; `/api/openapi` serves the same procedures as REST plus
// an API reference. Mastra and MCP routes are untouched.
const rpcContext = (c: Context): RpcContext => ({
  waitUntil: (promise) => c.executionCtx.waitUntil(promise),
  headers: c.req.raw.headers,
});

app.use("/api/rpc/*", async (c, next) => {
  const { matched, response } = await rpcHandler.handle(c.req.raw, {
    prefix: "/api/rpc",
    context: rpcContext(c),
  });
  return matched ? c.newResponse(response.body, response) : next();
});

app.use("/api/openapi/*", async (c, next) => {
  const { matched, response } = await openApiHandler.handle(c.req.raw, {
    prefix: "/api/openapi",
    context: rpcContext(c),
  });
  return matched ? c.newResponse(response.body, response) : next();
});

app.route("/", oauth);

app.get("/api/health", (c) =>
  c.json({ ok: true, time: new Date().toISOString() }),
);

// Route registration is deferred to the first request: a Worker may not perform
// I/O in global scope, so `init()` cannot run at module scope.
let ready: Promise<unknown> | undefined;

const handler = {
  async fetch(request, env, ctx) {
    ready ??= server.init();
    await ready;
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;

// OAuth 2.1 authorization server for MCP clients: discovery metadata, dynamic client
// registration, CIMD, PKCE, tokens (stored in OAUTH_KV). The resource must be an
// absolute URL, so one provider is built per origin the Worker is served on.
const providers = new Map<string, OAuthProvider<Env>>();

function providerFor(origin: string) {
  let provider = providers.get(origin);
  if (!provider) {
    provider = new OAuthProvider<Env>({
      apiRoute: MCP_PATH,
      apiHandler: handler,
      defaultHandler: handler,
      authorizeEndpoint: "/authorize",
      tokenEndpoint: "/token",
      clientRegistrationEndpoint: "/register",
      clientIdMetadataDocumentEnabled: true,
      scopesSupported: ["mcp"],
      resourceMetadata: {
        resource: `${origin}${MCP_PATH}`,
        authorization_servers: [origin],
        resource_name: "Weather MCP",
      },
    });
    providers.set(origin, provider);
  }
  return provider;
}

export default {
  fetch(request, env, ctx) {
    return providerFor(new URL(request.url).origin).fetch(request, env, ctx);
  },
  // Cron trigger (wrangler.jsonc `triggers.crons`): fires due rows of the
  // `app_schedules` table. Mastra's own scheduler can't run on Workers.
  scheduled(_controller, _env, ctx) {
    ctx.waitUntil(runDueSchedules());
  },
} satisfies ExportedHandler<Env>;
