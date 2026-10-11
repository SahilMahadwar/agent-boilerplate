import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema/index.js";

/**
 * The `DB` binding, resolved on each access. Safe to hand to objects built at
 * module scope (Mastra's `D1Store`, Better Auth): the `cloudflare:workers` env
 * proxy can only be read while the Worker is executing.
 */
export const d1 = new Proxy({} as D1Database, {
  get(_, prop) {
    const value = Reflect.get(env.DB, prop);
    return typeof value === "function" ? value.bind(env.DB) : value;
  },
});

/**
 * Drizzle over the `DB` binding (the same D1 that Mastra uses). A function, not a
 * module-level constant: the `cloudflare:workers` env proxy can only be read
 * while the Worker is executing.
 */
export const db = () => drizzle(env.DB, { schema });
