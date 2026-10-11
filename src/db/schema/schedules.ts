import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Cron schedules for agents and workflows. Mastra's built-in scheduler needs a
// long-lived process and a storage adapter with the `schedules` domain (D1 has
// neither), so the Worker's cron trigger fires these rows instead (src/schedules).
// Times are epoch milliseconds.

export const appSchedules = sqliteTable(
  "app_schedules",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    targetType: text("target_type", { enum: ["agent", "workflow"] }).notNull(),
    /** Agent or workflow `id` (e.g. `weather-agent`), not the registration key. */
    targetId: text("target_id").notNull(),
    cron: text("cron").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    /** Workflow: `inputData`. Agent: `{ prompt: string }`. */
    input: text("input_json", { mode: "json" }).$type<unknown>(),
    status: text("status", { enum: ["active", "paused"] }).notNull().default("active"),
    nextFireAt: integer("next_fire_at"),
    lastFireAt: integer("last_fire_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("app_schedules_due").on(table.status, table.nextFireAt)],
);

export const appScheduleRuns = sqliteTable(
  "app_schedule_runs",
  {
    id: text("id").primaryKey(),
    scheduleId: text("schedule_id")
      .notNull()
      .references(() => appSchedules.id, { onDelete: "cascade" }),
    trigger: text("trigger", { enum: ["cron", "manual"] }).notNull(),
    status: text("status", { enum: ["running", "success", "failed"] }).notNull(),
    startedAt: integer("started_at").notNull(),
    finishedAt: integer("finished_at"),
    output: text("output_json", { mode: "json" }).$type<unknown>(),
    error: text("error"),
  },
  (table) => [index("app_schedule_runs_by_schedule").on(table.scheduleId, table.startedAt)],
);

export type Schedule = typeof appSchedules.$inferSelect;
export type ScheduleRun = typeof appScheduleRuns.$inferSelect;
