import { defineConfig } from "drizzle-kit";

// Generates SQL migrations into `migrations/`, which wrangler applies
// (`pnpm db:migrate:local` / `db:migrate:prod`). D1 is shared with Mastra, so
// only the app's own `app_*` tables are ever managed here.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema",
  out: "./migrations",
  tablesFilter: ["app_*"],
});
