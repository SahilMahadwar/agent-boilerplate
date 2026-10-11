import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, RotateCw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { sectionByKey, type SectionKey } from "@/configs/navigation";
import { agentsQuery, toolsQuery, workflowsQuery } from "@/lib/mastra-queries";
import { orpc } from "@/lib/orpc";

export const Route = createFileRoute("/_dashboard/")({
  component: Overview,
});

const blurbs: Record<SectionKey, string> = {
  agents: "Chat with agents and inspect their model, instructions and tools.",
  workflows: "Run multi-step workflows and review their inputs and outputs.",
  tools: "Call tools directly, without a model in the loop.",
  schedules: "Run agents and workflows on a cron, from the Worker's cron trigger.",
};

/** A section count: skeleton while loading, "—" and a retry button on error. */
function Count({ query }: { query: UseQueryResult<unknown[]> }) {
  if (query.isPending) return <Skeleton className="h-9 w-10" />;
  if (query.isError) {
    return (
      <span className="flex items-center gap-2">
        —
        <Button
          variant="ghost"
          size="icon-sm"
          title={query.error.message}
          aria-label="Retry"
          onClick={() => query.refetch()}
        >
          <RotateCw />
        </Button>
      </span>
    );
  }
  return query.data.length;
}

function Overview() {
  const counts: Record<SectionKey, UseQueryResult<unknown[]>> = {
    agents: useQuery(agentsQuery),
    workflows: useQuery(workflowsQuery),
    tools: useQuery(toolsQuery),
    schedules: useQuery(orpc.schedules.list.queryOptions()),
  };

  return (
    <>
      <PageHeader
        title="Overview"
        description="Everything registered in src/mastra/index.ts, plus runtime schedules."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(counts) as SectionKey[]).map((key) => {
          const section = sectionByKey[key];
          return (
            <Card key={key} className="justify-between">
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <section.icon className="size-4" />
                  {section.title}
                </CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  <Count query={counts[key]} />
                </CardTitle>
                <p className="text-muted-foreground text-sm">{blurbs[key]}</p>
              </CardHeader>
              <CardFooter>
                <Link
                  to={section.url}
                  className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
                >
                  Open {section.title.toLowerCase()} <ArrowRight className="size-4" />
                </Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </>
  );
}
