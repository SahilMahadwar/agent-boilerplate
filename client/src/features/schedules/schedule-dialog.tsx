import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Loader2 } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { toast } from "sonner";
import type { Schedule, ScheduleInput } from "@/lib/orpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { agentsQuery, workflowsQuery } from "@/lib/mastra-queries";
import { orpc } from "@/lib/orpc";

const CRON_PRESETS = [
  { label: "Every minute", cron: "* * * * *" },
  { label: "Hourly", cron: "0 * * * *" },
  { label: "Daily 08:00", cron: "0 8 * * *" },
  { label: "Weekdays 09:00", cron: "0 9 * * 1-5" },
];

const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

type Draft = {
  name: string;
  targetType: ScheduleInput["targetType"];
  targetId: string;
  cron: string;
  timezone: string;
  input: string;
};

const toDraft = (initial?: Partial<ScheduleInput>): Draft => ({
  name: initial?.name ?? "",
  targetType: initial?.targetType ?? "workflow",
  targetId: initial?.targetId ?? "",
  cron: initial?.cron ?? "0 8 * * *",
  timezone: initial?.timezone ?? browserTimezone,
  input: JSON.stringify(
    initial?.input ?? (initial?.targetType === "agent" ? { prompt: "" } : {}),
    null,
    2,
  ),
});

/**
 * Create or edit a schedule. Pass `schedule` to edit, or `initial` to prefill a
 * new one (e.g. the "Schedule" button on a workflow page).
 */
export function ScheduleDialog({
  schedule,
  initial,
  trigger,
}: {
  schedule?: Schedule;
  initial?: Partial<ScheduleInput>;
  trigger?: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => toDraft(schedule ?? initial));
  const [parseError, setParseError] = useState<string | null>(null);

  const agents = useQuery({ ...agentsQuery, enabled: open });
  const workflows = useQuery({ ...workflowsQuery, enabled: open });
  const targetsQuery = draft.targetType === "agent" ? agents : workflows;
  const targets = targetsQuery.data ?? [];

  const onSuccess = (saved: Schedule) => {
    queryClient.invalidateQueries({ queryKey: orpc.schedules.key() });
    toast.success(schedule ? "Schedule updated" : `Created "${saved.name}"`);
    setOpen(false);
  };
  // Errors show inside the dialog, so no toast.
  const meta = { toast: false };
  const create = useMutation(orpc.schedules.create.mutationOptions({ onSuccess, meta }));
  const update = useMutation(orpc.schedules.update.mutationOptions({ onSuccess, meta }));
  const pending = create.isPending || update.isPending;
  const error = parseError ?? (create.error ?? update.error)?.message;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  function submit(event: FormEvent) {
    event.preventDefault();
    let input: unknown;
    try {
      input = JSON.parse(draft.input || "null");
    } catch {
      setParseError("Input must be valid JSON.");
      return;
    }
    setParseError(null);
    const body = { ...draft, input };
    if (schedule) update.mutate({ id: schedule.id, patch: body });
    else create.mutate(body);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(toDraft(schedule ?? initial));
        setParseError(null);
        create.reset();
        update.reset();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <CalendarPlus /> Schedule
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{schedule ? "Edit schedule" : "New schedule"}</DialogTitle>
            <DialogDescription>
              Runs an agent or workflow on a cron. The Worker checks for due
              schedules every minute.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="schedule-name">Name</Label>
            <Input
              id="schedule-name"
              value={draft.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="Morning report"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Target type</Label>
              <Select
                value={draft.targetType}
                onValueChange={(value: Draft["targetType"]) =>
                  setDraft((current) => ({
                    ...current,
                    targetType: value,
                    targetId: "",
                    input: JSON.stringify(value === "agent" ? { prompt: "" } : {}, null, 2),
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workflow">Workflow</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Target</Label>
              <Select value={draft.targetId} onValueChange={(value) => set("targetId", value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {targetsQuery.isPending && (
                    <SelectItem value="__loading" disabled>
                      Loading…
                    </SelectItem>
                  )}
                  {targetsQuery.isError && (
                    <SelectItem value="__error" disabled>
                      Couldn't load: {targetsQuery.error.message}
                    </SelectItem>
                  )}
                  {/* Keep the current value selectable before the list loads. */}
                  {draft.targetId && !targets.some((t) => t.id === draft.targetId) && (
                    <SelectItem value={draft.targetId}>{draft.targetId}</SelectItem>
                  )}
                  {targets.map((target) => (
                    <SelectItem key={target.id} value={target.id}>
                      {target.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="schedule-cron">Cron</Label>
              <Input
                id="schedule-cron"
                value={draft.cron}
                onChange={(event) => set("cron", event.target.value)}
                className="font-mono"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="schedule-tz">Timezone</Label>
              <Input
                id="schedule-tz"
                value={draft.timezone}
                onChange={(event) => set("timezone", event.target.value)}
                required
              />
            </div>
          </div>
          <div className="-mt-2 flex flex-wrap gap-1">
            {CRON_PRESETS.map((preset) => (
              <Button
                key={preset.cron}
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => set("cron", preset.cron)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="schedule-input">
              {draft.targetType === "agent" ? "Input ({ \"prompt\": … })" : "Workflow input (JSON)"}
            </Label>
            <Textarea
              id="schedule-input"
              value={draft.input}
              onChange={(event) => set("input", event.target.value)}
              className="min-h-24 font-mono text-xs"
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={pending || !draft.targetId}>
              {pending && <Loader2 className="animate-spin" />}
              {schedule ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
