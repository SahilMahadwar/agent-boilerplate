import type { Schedule, ScheduleRun } from "../db/schema/index.js";
import { mastra } from "../mastra/index.js";
import {
  claimFire,
  failStaleRuns,
  finishRun,
  listDueSchedules,
  startRun,
} from "./store.js";

const MAX_RUN_MS = 15 * 60_000;

const describe = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

async function execute(schedule: Schedule): Promise<unknown> {
  if (schedule.targetType === "workflow") {
    const workflow = Object.values(mastra.listWorkflows()).find(
      (candidate) => candidate.id === schedule.targetId,
    );
    if (!workflow) throw new Error(`Workflow '${schedule.targetId}' not found`);
    const run = await workflow.createRun();
    const result = await run.start({
      inputData: (schedule.input ?? {}) as never,
    });
    if (result.status === "failed") throw new Error(describe(result.error));
    return result.status === "success"
      ? result.result
      : { status: result.status };
  }

  const agent = Object.values(mastra.listAgents()).find(
    (candidate) => candidate.id === schedule.targetId,
  );
  if (!agent) throw new Error(`Agent '${schedule.targetId}' not found`);
  const prompt = (schedule.input as { prompt?: unknown } | null)?.prompt;
  if (typeof prompt !== "string" || !prompt) {
    throw new Error('Agent schedules need input of the form { "prompt": "…" }');
  }
  const result = await agent.generate(prompt);
  return { text: result.text };
}

/** Runs one schedule and records it in `app_schedule_runs`. Never throws. */
export async function executeSchedule(
  schedule: Schedule,
  trigger: ScheduleRun["trigger"],
  runId?: string,
) {
  const id = runId ?? (await startRun(schedule.id, trigger));
  try {
    await finishRun(id, { output: await execute(schedule) });
  } catch (error) {
    console.error(`Schedule ${schedule.id} failed`, error);
    await finishRun(id, { error: describe(error) });
  }
}

/** Called by the Worker's cron trigger (every minute, see wrangler.jsonc). */
export async function runDueSchedules() {
  const now = Date.now();
  await failStaleRuns(now - MAX_RUN_MS);
  const due = await listDueSchedules(now);
  await Promise.all(
    due.map(async (schedule) => {
      if (await claimFire(schedule, now)) {
        await executeSchedule(schedule, "cron");
      }
    }),
  );
}
