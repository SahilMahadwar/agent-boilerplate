import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { executeSchedule } from "../../schedules/runner.js";
import {
  createSchedule,
  deleteSchedule,
  getSchedule,
  listRuns,
  listSchedules,
  startRun,
  updateSchedule,
} from "../../schedules/store.js";
import { publicProcedure } from "../orpc.js";

const status = z.enum(["active", "paused"]);

// No `.default()`s here: zod applies them inside `.partial()` too, which would
// reset fields on every update. createSchedule() fills in UTC / active instead.
const scheduleInput = z.object({
  name: z.string().min(1),
  targetType: z.enum(["agent", "workflow"]),
  targetId: z.string().min(1),
  cron: z.string().min(1),
  timezone: z.string().min(1).optional(),
  /** Workflow: `inputData`. Agent: `{ prompt: string }`. */
  input: z.unknown().optional(),
  status: status.optional(),
});

const byId = z.object({ id: z.string() });

const notFound = (id: string) =>
  new ORPCError("NOT_FOUND", { message: `Schedule '${id}' not found` });

// Invalid cron patterns surface as 400s instead of 500s.
const badRequest = (error: unknown) =>
  new ORPCError("BAD_REQUEST", {
    message: error instanceof Error ? error.message : String(error),
  });

export const schedulesRouter = {
  list: publicProcedure.handler(() => listSchedules()),

  get: publicProcedure.input(byId).handler(async ({ input }) => {
    const schedule = await getSchedule(input.id);
    if (!schedule) throw notFound(input.id);
    return schedule;
  }),

  create: publicProcedure.input(scheduleInput).handler(({ input }) =>
    createSchedule(input).catch((error) => {
      throw badRequest(error);
    }),
  ),

  update: publicProcedure
    .input(byId.extend({ patch: scheduleInput.partial() }))
    .handler(async ({ input }) => {
      const schedule = await updateSchedule(input.id, input.patch).catch((error) => {
        throw badRequest(error);
      });
      if (!schedule) throw notFound(input.id);
      return schedule;
    }),

  setStatus: publicProcedure
    .input(byId.extend({ status }))
    .handler(async ({ input }) => {
      const schedule = await updateSchedule(input.id, { status: input.status });
      if (!schedule) throw notFound(input.id);
      return schedule;
    }),

  remove: publicProcedure.input(byId).handler(async ({ input }) => {
    await deleteSchedule(input.id);
    return { ok: true };
  }),

  /** Fires the schedule now; the run continues in the background. */
  runNow: publicProcedure.input(byId).handler(async ({ input, context }) => {
    const schedule = await getSchedule(input.id);
    if (!schedule) throw notFound(input.id);
    const runId = await startRun(schedule.id, "manual");
    context.waitUntil(executeSchedule(schedule, "manual", runId));
    return { runId };
  }),

  runs: publicProcedure
    .input(byId.extend({ limit: z.number().int().min(1).max(100).default(20) }))
    .handler(({ input }) => listRuns(input.id, input.limit)),
};
