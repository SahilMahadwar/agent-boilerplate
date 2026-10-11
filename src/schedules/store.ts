import { and, desc, eq, isNotNull, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  appScheduleRuns,
  appSchedules,
  type Schedule,
  type ScheduleRun,
} from "../db/schema/index.js";
import { nextFireAt, validateCron } from "./cron.js";

// Queries for the `app_schedules` / `app_schedule_runs` tables (src/db/schema).

/** What a caller can set on a schedule; the rest is managed here. */
export type ScheduleInput = Pick<Schedule, "name" | "targetType" | "targetId" | "cron"> &
  Partial<Pick<Schedule, "timezone" | "input" | "status">>;

export function listSchedules() {
  return db().select().from(appSchedules).orderBy(desc(appSchedules.createdAt));
}

export async function getSchedule(id: string) {
  const [schedule] = await db().select().from(appSchedules).where(eq(appSchedules.id, id));
  return schedule ?? null;
}

export async function createSchedule(input: ScheduleInput) {
  const timezone = input.timezone ?? "UTC";
  const status = input.status ?? "active";
  validateCron(input.cron, timezone);
  const now = Date.now();
  const [schedule] = await db()
    .insert(appSchedules)
    .values({
      ...input,
      id: crypto.randomUUID(),
      timezone,
      status,
      input: input.input ?? null,
      nextFireAt: status === "active" ? nextFireAt(input.cron, timezone) : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return schedule!;
}

export async function updateSchedule(id: string, patch: Partial<ScheduleInput>) {
  const current = await getSchedule(id);
  if (!current) return null;
  const next = {
    ...current,
    ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)),
  } as Schedule;
  validateCron(next.cron, next.timezone);
  const [schedule] = await db()
    .update(appSchedules)
    .set({
      name: next.name,
      targetType: next.targetType,
      targetId: next.targetId,
      cron: next.cron,
      timezone: next.timezone,
      input: next.input ?? null,
      status: next.status,
      // Recompute from now, so resuming never replays missed fires.
      nextFireAt: next.status === "active" ? nextFireAt(next.cron, next.timezone) : null,
      updatedAt: Date.now(),
    })
    .where(eq(appSchedules.id, id))
    .returning();
  return schedule ?? null;
}

export async function deleteSchedule(id: string) {
  const database = db();
  await database.batch([
    database.delete(appScheduleRuns).where(eq(appScheduleRuns.scheduleId, id)),
    database.delete(appSchedules).where(eq(appSchedules.id, id)),
  ]);
}

export function listDueSchedules(now: number) {
  return db()
    .select()
    .from(appSchedules)
    .where(
      and(
        eq(appSchedules.status, "active"),
        isNotNull(appSchedules.nextFireAt),
        lte(appSchedules.nextFireAt, now),
      ),
    );
}

/**
 * Advances `next_fire_at` only if no other invocation already did, so overlapping
 * cron ticks fire each due schedule once. Returns whether this caller won.
 */
export async function claimFire(schedule: Schedule, now: number) {
  const result = await db()
    .update(appSchedules)
    .set({
      nextFireAt: nextFireAt(schedule.cron, schedule.timezone, new Date(now)),
      lastFireAt: now,
    })
    .where(
      and(
        eq(appSchedules.id, schedule.id),
        eq(appSchedules.nextFireAt, schedule.nextFireAt!),
      ),
    )
    .run();
  return result.meta.changes === 1;
}

export async function startRun(scheduleId: string, trigger: ScheduleRun["trigger"]) {
  const id = crypto.randomUUID();
  await db()
    .insert(appScheduleRuns)
    .values({ id, scheduleId, trigger, status: "running", startedAt: Date.now() });
  return id;
}

export async function finishRun(id: string, result: { output: unknown } | { error: string }) {
  const failed = "error" in result;
  await db()
    .update(appScheduleRuns)
    .set({
      status: failed ? "failed" : "success",
      finishedAt: Date.now(),
      output: failed ? null : (result.output ?? null),
      error: failed ? result.error : null,
    })
    .where(eq(appScheduleRuns.id, id));
}

/**
 * Marks runs still `running` since before `cutoff` as failed. A Worker that is
 * stopped mid-run never calls finishRun(), which would leave the row running forever.
 */
export async function failStaleRuns(cutoff: number) {
  await db()
    .update(appScheduleRuns)
    .set({
      status: "failed",
      finishedAt: Date.now(),
      error: "Run did not finish (the Worker was stopped)",
    })
    .where(and(eq(appScheduleRuns.status, "running"), lte(appScheduleRuns.startedAt, cutoff)));
}

export function listRuns(scheduleId: string, limit: number) {
  return db()
    .select()
    .from(appScheduleRuns)
    .where(eq(appScheduleRuns.scheduleId, scheduleId))
    .orderBy(desc(appScheduleRuns.startedAt))
    .limit(limit);
}
