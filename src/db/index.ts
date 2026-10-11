import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema/index.js";

/**
 * Drizzle over the `DB` binding (the same D1 that Mastra uses). A function, not a
 * module-level constant: the `cloudflare:workers` env proxy can only be read
 * while the Worker is executing.
 */
export const db = () => drizzle(env.DB, { schema });
