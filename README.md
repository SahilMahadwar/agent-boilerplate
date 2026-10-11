# mastra-hono

A Mastra agent served by Hono, with a Vite + React frontend, deployed as a **single Cloudflare Worker**.

- `src/index.ts` — Worker entry: a Hono app wrapped by `MastraServer`, serving Mastra under `/api/*`
- `src/mastra/` — Mastra config, agents, tools, workflows
- `client/` — React SPA (chat UI for the weather agent), served from Workers static assets,
  built with Tailwind CSS v4 and [shadcn/ui](https://ui.shadcn.com)
- Storage — Cloudflare D1, shared by Mastra (`@mastra/cloudflare-d1`) and the app's own Drizzle
  tables (`src/db/`)
- `src/rpc/` — custom endpoints as oRPC procedures (`/api/rpc`, REST at `/api/openapi`)
- `src/schedules/` — cron schedules for agents/workflows, fired by the Worker's cron trigger

## Requirements

- **Workers Paid plan.** The Worker bundle is about 4.5 MB gzipped, above the Free plan's 3 MB
  limit (`npx wrangler deploy --dry-run` prints the current size).

## Setup

```bash
pnpm install
```

Add your secrets for local dev and create the local tables:

```bash
cp .dev.vars.example .dev.vars   # then fill in the values (see Auth below)
pnpm db:migrate:local
```

## Auth

- **Dashboard and oRPC:** sign in with Google through Better Auth (`src/auth.ts`, served at
  `/api/better-auth`). Sign-up is closed: an account is created only for an email listed in
  `AUTH_ALLOWED_EMAILS`. Create an OAuth client (Web application) in the Google Cloud console with
  the redirect URI `<BETTER_AUTH_URL>/api/better-auth/callback/google`, for both
  `http://localhost:5173` and the production URL. Then set `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET`. Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`.
- **Mastra API (`/api/agents`, …):** the same session (`@mastra/auth-better-auth`), or an API key.
- **Scripts:** any key from `API_KEYS`, sent as `Authorization: Bearer <key>` or `X-API-Key`.
- **MCP:** OAuth with the owner password (`MCP_OWNER_PASSWORD`, see `docs/mcp.md`).

## Starting a new project from this template

`wrangler.jsonc` points at *this* project's production D1 database and KV namespace. Change
these before the first deploy, or the new project will write to them:

1. Rename `name` in `wrangler.jsonc` and `package.json`, and the local `database_name`.
2. Create the production resources and paste their ids into `env.production` in `wrangler.jsonc`:
   ```bash
   npx wrangler d1 create <name>-prd
   npx wrangler kv namespace create OAUTH_KV --env production
   ```
3. Run `pnpm cf-typegen`.
4. Replace the weather agent, tool and workflow (`src/mastra/`) with your own. Then update
   `src/mastra/index.ts`, the MCP server (`src/mastra/mcp/`), `MCP_PATH` and `resource_name` in
   `src/index.ts`, the `example` oRPC router, and `client/src/features/registry.ts`.
5. Delete or replace `migrations/0001_seed_schedules.sql`, which seeds a schedule for
   `weather-workflow`. If you change the app schema, run `pnpm db:generate`.
6. Set `BETTER_AUTH_URL` under `env.production.vars` in `wrangler.jsonc` to the production URL.
   Then set the production secrets, apply the migrations and deploy:
   ```bash
   npx wrangler secret put OPENROUTER_API_KEY --env production
   npx wrangler secret put MCP_OWNER_PASSWORD --env production
   npx wrangler secret put API_KEYS --env production
   npx wrangler secret put BETTER_AUTH_SECRET --env production
   npx wrangler secret put GOOGLE_CLIENT_ID --env production
   npx wrangler secret put GOOGLE_CLIENT_SECRET --env production
   npx wrangler secret put AUTH_ALLOWED_EMAILS --env production
   pnpm db:migrate:prod
   pnpm run deploy
   ```

## Develop

```bash
pnpm dev
```

Runs the SPA and the Worker together in workerd at http://localhost:5173. The React app and the
Mastra API share an origin, so there is no CORS setup.

```bash
curl -X POST http://localhost:5173/api/agents/weather-agent/generate \
  -H "Authorization: Bearer $API_KEY" \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"weather in Pune?"}]}'
```

Inspect the local D1 database:

```bash
npx wrangler d1 execute DB --local --command "select name from sqlite_master where type='table'"
```

## Deploy

Upload secrets once (the full list is in step 6 above), apply migrations, then deploy:

```bash
pnpm db:migrate:prod
pnpm run deploy
```

`pnpm run deploy` runs `vite build` (SPA → `dist/client`, Worker → `dist/mastra_hono`) and
`wrangler deploy`. Live logs: `npx wrangler tail`.

## UI components

The client uses shadcn/ui (`radix-nova` style, Lucide icons, Geist font). Components are copied
into `client/src/components/ui/`, so edit them directly. Add more with:

```bash
pnpm dlx shadcn@latest add dialog
```

`components.json` points at `client/src/index.css` and the `@` alias, which resolves to
`client/src` in both `vite.config.ts` and `tsconfig.client.json`.

## Other scripts

| Script | What it does |
| --- | --- |
| `pnpm build` | Build the SPA and the Worker |
| `pnpm preview` | Serve the production build locally |
| `pnpm typecheck` | `tsc -b` across the client, worker, and node configs |
| `pnpm cf-typegen` | Regenerate `worker-configuration.d.ts` after editing `wrangler.jsonc` |

## Cloudflare constraints to know

- **Workflows run inside the request.** Mastra's background workers (orchestration, scheduler,
  background tasks) need a long-lived process, so `mastra.startWorkers()` is not called. Cron
  schedules are fired by the Worker's cron trigger instead (`src/schedules/`). Long-running
  workflows would need Durable Objects / Queues, or a separate Node deployment.
- **No self-hosted traces.** D1 does not support Mastra's observability domain, so only
  `MastraPlatformExporter` is configured (active when `MASTRA_PLATFORM_ACCESS_TOKEN` is set).
- **`nodejs_compat` is required** — `@mastra/hono` pulls in `node:http` / `node:stream`. It also
  populates `process.env` from Worker vars and secrets, which is where Mastra reads provider keys.
- **Better Auth lives at `/api/better-auth`, not `/api/auth`**, because Mastra registers its own
  `/api/auth/*` routes.
- D1 enforces a **1 MiB row limit**, which matters only if memory messages carry large attachments.
