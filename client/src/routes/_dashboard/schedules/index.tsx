import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { ItemTable } from "@/components/item-table";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScheduleDialog } from "@/features/schedules/schedule-dialog";
import {
  formatTime,
  RunNowButton,
  ScheduleStatusSwitch,
} from "@/features/schedules/schedule-parts";
import { orpc } from "@/lib/orpc";

export const Route = createFileRoute("/_dashboard/schedules/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(context.orpc.schedules.list.queryOptions()),
  component: SchedulesPage,
});

function SchedulesPage() {
  const { data } = useSuspenseQuery(orpc.schedules.list.queryOptions());

  return (
    <>
      <PageHeader
        title="Schedules"
        description="Cron runs of agents and workflows. Stored in D1 and fired by the Worker's cron trigger every minute."
        actions={
          <ScheduleDialog
            trigger={
              <Button size="sm">
                <Plus /> New schedule
              </Button>
            }
          />
        }
      />
      <ItemTable
        section="schedules"
        rows={data}
        empty="No schedules yet. Create one here, or from a workflow's or agent's Configure tab."
        columns={[
          {
            header: "Target",
            cell: (schedule) => (
              <span className="flex items-center gap-2">
                <Badge variant="outline">{schedule.targetType}</Badge>
                <span className="font-mono text-xs">{schedule.targetId}</span>
              </span>
            ),
          },
          {
            header: "Cron",
            className: "hidden md:table-cell",
            cell: (schedule) => (
              <span className="font-mono text-xs">
                {schedule.cron}
                <span className="text-muted-foreground"> · {schedule.timezone}</span>
              </span>
            ),
          },
          {
            header: "Next run",
            className: "hidden lg:table-cell",
            cell: (schedule) => (
              <span className="text-muted-foreground text-sm">
                {formatTime(schedule.nextFireAt)}
              </span>
            ),
          },
          { header: "Active", cell: (schedule) => <ScheduleStatusSwitch schedule={schedule} /> },
          { header: "", cell: (schedule) => <RunNowButton schedule={schedule} /> },
        ]}
      />
    </>
  );
}
