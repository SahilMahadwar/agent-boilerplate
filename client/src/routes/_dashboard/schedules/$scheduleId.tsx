import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ItemLink } from "@/components/item-link";
import { JsonBlock } from "@/components/json-block";
import { PageHeader } from "@/components/page-header";
import { ErrorState } from "@/components/query-states";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScheduleDialog } from "@/features/schedules/schedule-dialog";
import {
  formatTime,
  RunNowButton,
  RunStatusBadge,
  ScheduleStatusSwitch,
} from "@/features/schedules/schedule-parts";
import { orpc } from "@/lib/orpc";

export const Route = createFileRoute("/_dashboard/schedules/$scheduleId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      context.orpc.schedules.get.queryOptions({ input: { id: params.scheduleId } }),
    ),
  component: SchedulePage,
});

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function SchedulePage() {
  const { scheduleId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scheduleQuery = orpc.schedules.get.queryOptions({ input: { id: scheduleId } });
  const { data: schedule } = useSuspenseQuery(scheduleQuery);
  const runs = useQuery({
    ...orpc.schedules.runs.queryOptions({ input: { id: scheduleId, limit: 20 } }),
    // Poll while a run is in flight (e.g. right after "Run now").
    refetchInterval: (query) =>
      query.state.data?.some((run) => run.status === "running") ? 3000 : false,
  });
  const remove = useMutation(
    orpc.schedules.remove.mutationOptions({
      onSuccess: async () => {
        toast.success("Schedule deleted");
        // Leave the page before refetching, so nothing refetches the deleted id.
        await navigate({ to: "/schedules" });
        queryClient.removeQueries({ queryKey: scheduleQuery.queryKey });
        queryClient.invalidateQueries({ queryKey: orpc.schedules.key() });
      },
    }),
  );

  return (
    <>
      <PageHeader
        title={schedule.name}
        description={`${schedule.targetType} schedule`}
        actions={
          <>
            <RunNowButton schedule={schedule} />
            <ScheduleDialog
              schedule={schedule}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil /> Edit
                </Button>
              }
            />
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate({ id: schedule.id })}
            >
              {remove.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Details</CardTitle>
            <div className="flex items-center gap-2 text-sm">
              {schedule.status === "active" ? "Active" : "Paused"}
              <ScheduleStatusSwitch schedule={schedule} />
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3">
              <Detail label="Target">
                <ItemLink
                  section={schedule.targetType === "agent" ? "agents" : "workflows"}
                  id={schedule.targetId}
                  className="font-mono hover:underline"
                >
                  {schedule.targetId}
                </ItemLink>
              </Detail>
              <Detail label="Cron">
                <span className="font-mono">{schedule.cron}</span> ({schedule.timezone})
              </Detail>
              <Detail label="Next run">{formatTime(schedule.nextFireAt)}</Detail>
              <Detail label="Last run">{formatTime(schedule.lastFireAt)}</Detail>
              <Detail label="Input">
                <JsonBlock value={schedule.input} />
              </Detail>
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Runs</CardTitle>
            <CardDescription>The 20 most recent runs.</CardDescription>
          </CardHeader>
          <CardContent>
            {runs.isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : runs.isError ? (
              <ErrorState error={runs.error} onRetry={() => runs.refetch()} />
            ) : runs.data.length === 0 ? (
              <p className="text-muted-foreground text-sm">No runs yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.data.map((run) => (
                    <TableRow key={run.id} className="align-top">
                      <TableCell>
                        <RunStatusBadge status={run.status} />
                      </TableCell>
                      <TableCell className="text-sm">{run.trigger}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatTime(run.startedAt)}
                        {run.finishedAt && (
                          <span className="block text-xs">
                            {((run.finishedAt - run.startedAt) / 1000).toFixed(1)}s
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-md whitespace-normal">
                        {run.error ? (
                          <span className="text-destructive text-sm">{run.error}</span>
                        ) : run.output != null ? (
                          <details>
                            <summary className="cursor-pointer text-sm">Output</summary>
                            <JsonBlock value={run.output} className="mt-2" />
                          </details>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
