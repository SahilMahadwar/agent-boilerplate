# AGENTS.md

## CRITICAL: Load `mastra` skill first

Load the `mastra` skill BEFORE any Mastra work. Never rely on cached knowledge — APIs change between versions.

## Architecture

This project deploys as a **single Cloudflare Worker**: the React SPA is served from Workers static
assets and Mastra is served by Hono under `/api/*`. There is no Node server.

- `src/index.ts` — Worker entry. Exports a `fetch` handler; `server.init()` is deferred to the first
  request because a Worker may not perform I/O in global scope.
- `src/mastra/index.ts` — Mastra config. Storage is `D1Store` over the `DB` binding.
- `client/` — React SPA. Talks to Mastra through `@mastra/client-js` at `window.location.origin`
  (the client adds the `/api` prefix itself). Styled with Tailwind CSS v4 + shadcn/ui; `@/*`
  resolves to `client/src/*`.

## Rules

- Register all agents, tools, workflows, and scorers in `src/mastra/index.ts`
- Use the `dev`, `build`, and `deploy` scripts from `package.json`; do not run `mastra dev` /
  `mastra build` directly — they assume a Node server, which this project no longer has
- Keep `D1Store` constructed **inline** inside `new Mastra({...})`. The `cloudflare:workers` `env`
  proxy can only be read while the Worker is executing, not at module scope
- Write no Node-only code in `src/` (no `process.stdout`, no filesystem, no native modules).
  `process.env` is fine — `nodejs_compat` populates it from Worker vars and secrets
- Run `pnpm cf-typegen` after editing `wrangler.jsonc` to refresh `worker-configuration.d.ts`
- There are three TypeScript projects (`tsconfig.client.json`, `tsconfig.worker.json`,
  `tsconfig.node.json`). The worker config uses `hono/jsx`; the client config uses React JSX.
  Verify with `pnpm typecheck`
- Use shadcn/ui components from `@/components/ui/*` rather than hand-rolling UI, and add new ones
  with `pnpm dlx shadcn@latest add <name>`. Use the theme tokens (`bg-muted`, `text-destructive`,
  …) instead of hard-coded colors, so light and dark both work
- The `@` alias is declared in three places that must agree: `vite.config.ts`, `tsconfig.client.json`
  and `components.json`. TypeScript 7 removed `baseUrl`, so `paths` are relative to the config file
- MCP: exposed tools/agents/workflows live in `src/mastra/mcp/` (see `docs/mcp.md`). `/api/mcp/*`
  is behind OAuth (`@cloudflare/workers-oauth-provider`, `OAUTH_KV`); only the endpoint in
  `MCP_PATH` (`src/index.ts`) is served. Expose agents with `agentTool()`, not MCPServer's `agents`
  option, and keep `jsonSchemaValidator: new CfWorkerJsonSchemaValidator()`: Ajv's `new Function`
  is forbidden on Workers. After changing deps, clear `node_modules/.vite` if the dev server
  serves stale code
- Auth: Better Auth (`getAuth()` in `src/auth.ts`, Google only) at `AUTH_BASE_PATH`
  (`/api/better-auth`; `/api/auth/*` belongs to Mastra). Sign-up is closed: the
  `databaseHooks` reject any email not in `AUTH_ALLOWED_EMAILS` (fails closed if unset). Its
  tables are `app_user` / `app_session` / `app_account` / `app_verification`
  (`src/db/schema/auth.ts`). Build the instance with `getAuth()` inside a request; module-scope
  consumers get the lazy `auth` proxy. The SPA gates `_dashboard` on `sessionQuery`
  (`client/src/lib/auth-client.ts`) and redirects to `/login`. Mastra `/api/*` uses
  `AppAuthProvider` (`src/mastra/auth.ts`, extends `MastraAuthBetterAuth`), which accepts the
  session or a key from `API_KEYS` (`Authorization: Bearer`, `X-API-Key`, `?apiKey=`) and keeps
  `MCP_PATH` public (OAuth already checked it); `mapUserToResourceId` pins Mastra memory to
  the single `owner` resource. oRPC procedures use `protectedProcedure` (session
  or API key); only health checks use `publicProcedure`. The MCP OAuth flow (`/authorize`,
  `MCP_OWNER_PASSWORD`) is separate and unchanged
- D1 does not support Mastra's observability domain — do not add `MastraStorageExporter` back
  without first moving traces to a supported store
- Custom (non-Mastra) endpoints are **oRPC** procedures, not Hono routes. The router is the
  source of truth (as in replyflow): write `publicProcedure.input(zod).handler(...)` in
  `src/rpc/routers/` and add it to `appRouter` in `src/rpc/index.ts`. The SPA imports only
  `type AppRouterClient` / `AppRouter` from `src/rpc` (in `client/src/lib/orpc.ts`), which works
  because `tsconfig.client.json` references `tsconfig.worker.json` and reads its emitted
  declarations. Never import worker *values* into the client. Served at `/api/rpc` (SPA) and
  `/api/openapi` (REST + reference). Do not touch Mastra routes or the MCP/OAuth setup
- Database: app tables use **Drizzle** on the same D1 as Mastra. Define tables in
  `src/db/schema/` (prefix names with `app_`), then `pnpm db:generate` (writes SQL to
  `migrations/`) and `pnpm db:migrate:local` / `db:migrate:prod` (wrangler applies it). Query
  with `db()` from `src/db` inside functions, never at module scope. Never run
  `drizzle-kit push`: the database also holds Mastra's tables
- Schedules: Mastra's built-in scheduler cannot run here (D1 lacks the `schedules` domain and
  Workers have no long-lived process). Schedules live in the Drizzle tables `app_schedules` /
  `app_schedule_runs` (`src/db/schema/schedules.ts`, queried in `src/schedules/store.ts`) and are
  fired by the Worker's `* * * * *` cron trigger (`src/schedules/runner.ts`). Test the trigger
  locally with `curl localhost:5173/cdn-cgi/handler/scheduled`
- UI: routes are file-based TanStack Router routes in `client/src/routes` (`routeTree.gen.ts` is
  generated by the Vite plugin; do not edit it). Each agent/workflow/tool page has Interact and
  Configure tabs; register custom views by Mastra `id` in `client/src/features/registry.ts`,
  otherwise the generic views in `client/src/features/generic/` are used
- UI data: every server call goes through TanStack Query. Route data is a loader
  (`ensureQueryData`) + `useSuspenseQuery`, so loading and errors fall to the router's
  `PageSkeleton` / `RouteError`. Component queries render `QueryFallback` until `isSuccess`.
  Every action is a `useMutation` (oRPC `mutationOptions()` or the Mastra factories in
  `client/src/lib/mastra-queries.ts`); failed mutations toast globally unless they show the
  error inline and set `meta: { toast: false }`. States live in `components/query-states.tsx`

## Resources

- [Mastra Documentation](https://mastra.ai/llms.txt)
- [Skills Discovery](https://mastra.ai/.well-known/skills/index.json)
