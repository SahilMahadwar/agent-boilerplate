# mastra-hono

A Mastra agent served by Hono, with a Vite + React frontend, deployed as a **single Cloudflare Worker**.

- `src/index.ts` — Worker entry: a Hono app wrapped by `MastraServer`, serving Mastra under `/api/*`
- `src/mastra/` — Mastra config, agents, tools, workflows
- `client/` — React SPA (chat UI for the weather agent), served from Workers static assets,
  built with Tailwind CSS v4 and [shadcn/ui](https://ui.shadcn.com)
- Storage — Cloudflare D1 via `@mastra/cloudflare-d1`

## Setup

```bash
pnpm install
```

Create the D1 database and paste the returned `database_id` into `wrangler.jsonc`:

```bash
npx wrangler d1 create mastra-hono
```

Add your model provider key for local dev:

```bash
cp .dev.vars.example .dev.vars   # then edit OPENAI_API_KEY
```

## Develop

```bash
pnpm dev
```

Runs the SPA and the Worker together in workerd at http://localhost:5173. The React app and the
Mastra API share an origin, so there is no CORS setup.

```bash
curl -X POST http://localhost:5173/api/agents/weather-agent/generate \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"weather in Pune?"}]}'
```

Inspect the local D1 database:

```bash
npx wrangler d1 execute mastra-hono --local --command "select name from sqlite_master where type='table'"
```

## Deploy

Upload secrets once, then deploy:

```bash
npx wrangler secret put OPENAI_API_KEY
pnpm deploy
```

`pnpm deploy` runs `vite build` (SPA → `dist/client`, Worker → `dist/mastra_hono`) and
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
  background tasks) need a long-lived process, so `mastra.startWorkers()` is not called. Cron or
  long-running workflows would need Durable Objects / Queues, or a separate Node deployment.
- **No self-hosted traces.** D1 does not support Mastra's observability domain, so only
  `MastraPlatformExporter` is configured (active when `MASTRA_PLATFORM_ACCESS_TOKEN` is set).
- **`nodejs_compat` is required** — `@mastra/hono` pulls in `node:http` / `node:stream`. It also
  populates `process.env` from Worker vars and secrets, which is where Mastra reads provider keys.
- D1 enforces a **1 MiB row limit**, which matters only if memory messages carry large attachments.
