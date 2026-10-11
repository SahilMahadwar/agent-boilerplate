import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import type { Schedule, ScheduleInput, ScheduleRun } from "@/lib/orpc";
import { ItemLink } from "@/components/item-link";
import { QueryFallback } from "@/components/query-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { orpc } from "@/lib/orpc";
import { ScheduleDialog } from "./schedule-dialog";

export const formatTime = (ms: number | null) =>
  ms == null ? "—" : new Date(ms).toLocaleString();

export function RunStatusBadge({ status }: { status: ScheduleRun["status"] }) {
  const variant =
    status === "failed" ? "destructive" : status === "success" ? "secondary" : "outline";
  return (
    <Badge variant={variant}>
      {status === "running" && <Loader2 className="animate-spin" />}
      {status}
    </Badge>
  );
}

/** Active/paused switch. */
export function ScheduleStatusSwitch({ schedule }: { schedule: Schedule }) {
  const queryClient = useQueryClient();
  const setStatus = useMutation(
    orpc.schedules.setStatus.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: orpc.schedules.key() }),
    }),
  );
  return (
    <Switch
      checked={schedule.status === "active"}
      disabled={setStatus.isPending}
      aria-label={schedule.status === "active" ? "Pause" : "Resume"}
      onCheckedChange={(checked) =>
        setStatus.mutate({ id: schedule.id, status: checked ? "active" : "paused" })
      }
    />
  );
}

export function RunNowButton({ schedule }: { schedule: Schedule }) {
  const queryClient = useQueryClient();
  const runNow = useMutation(
    orpc.schedules.runNow.mutationOptions({
      onSuccess: () => {
        toast.success(`Started "${schedule.name}"`);
        queryClient.invalidateQueries({ queryKey: orpc.schedules.key() });
      },
    }),
  );
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={runNow.isPending}
      onClick={() => runNow.mutate({ id: schedule.id })}
    >
      {runNow.isPending ? <Loader2 className="animate-spin" /> : <Play />}
      Run now
    </Button>
  );
}

/**
 * The schedules that target one agent or workflow, with a prefilled "Schedule"
 * button. Shown on the Configure tab of agents and workflows.
 */
export function TargetSchedules({
  targetType,
  targetId,
  defaults,
}: {
  targetType: ScheduleInput["targetType"];
  targetId: string;
  defaults?: Partial<ScheduleInput>;
}) {
  const query = useQuery(orpc.schedules.list.queryOptions());
  const mine = query.data?.filter(
    (schedule) => schedule.targetType === targetType && schedule.targetId === targetId,
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="grid gap-1">
          <CardTitle>Schedules</CardTitle>
          <CardDescription>Cron runs of this {targetType}.</CardDescription>
        </div>
        <ScheduleDialog initial={{ targetType, targetId, ...defaults }} />
      </CardHeader>
      <CardContent className="grid gap-2">
        {!mine ? (
          <QueryFallback query={query} className="h-12 w-full" />
        ) : mine.length === 0 ? (
          <p className="text-muted-foreground text-sm">Not scheduled.</p>
        ) : (
          mine.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
            >
              <div className="min-w-0">
                <ItemLink
                  section="schedules"
                  id={schedule.id}
                  className="truncate text-sm font-medium hover:underline"
                >
                  {schedule.name}
                </ItemLink>
                <p className="text-muted-foreground font-mono text-xs">
                  {schedule.cron} · {schedule.timezone}
                </p>
              </div>
              <ScheduleStatusSwitch schedule={schedule} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
