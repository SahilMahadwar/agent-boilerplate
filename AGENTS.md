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
- D1 does not support Mastra's observability domain — do not add `MastraStorageExporter` back
  without first moving traces to a supported store

## Resources

- [Mastra Documentation](https://mastra.ai/llms.txt)
- [Skills Discovery](https://mastra.ai/.well-known/skills/index.json)
