import { Cron } from "croner";

// No callback is passed, so croner only parses the pattern and never starts a
// timer: fires are driven by the Worker's cron trigger (see runner.ts).

/** Throws a readable error when the cron pattern or timezone is invalid. */
export function validateCron(cron: string, timezone: string) {
  try {
    new Cron(cron, { timezone });
  } catch (error) {
    throw new Error(
      `Invalid cron "${cron}" (${timezone}): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/** The next fire time after `from`, in epoch ms, or null when the cron never fires again. */
export function nextFireAt(cron: string, timezone: string, from = new Date()) {
  return new Cron(cron, { timezone }).nextRun(from)?.getTime() ?? null;
}
