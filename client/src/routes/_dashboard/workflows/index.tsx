import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ItemTable } from "@/components/item-table";
import { PageHeader } from "@/components/page-header";
import { workflowsQuery } from "@/lib/mastra-queries";

export const Route = createFileRoute("/_dashboard/workflows/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(workflowsQuery),
  component: WorkflowsPage,
});

function WorkflowsPage() {
  const { data } = useSuspenseQuery(workflowsQuery);
  return (
    <>
      <PageHeader title="Workflows" description="Defined in src/mastra/workflows." />
      <ItemTable
        section="workflows"
        rows={data}
        empty="No workflows registered in src/mastra/index.ts."
        columns={[
          {
            header: "Description",
            className: "hidden md:table-cell whitespace-normal",
            cell: (workflow) => (
              <span className="text-muted-foreground text-sm">{workflow.description}</span>
            ),
          },
          {
            header: "Steps",
            cell: (workflow) => Object.keys(workflow.steps ?? {}).length,
          },
        ]}
      />
    </>
  );
}
