import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ItemTable } from "@/components/item-table";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { agentsQuery } from "@/lib/mastra-queries";

export const Route = createFileRoute("/_dashboard/agents/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(agentsQuery),
  component: AgentsPage,
});

function AgentsPage() {
  const { data } = useSuspenseQuery(agentsQuery);
  return (
    <>
      <PageHeader title="Agents" description="Defined in src/mastra/agents." />
      <ItemTable
        section="agents"
        rows={data}
        empty="No agents registered in src/mastra/index.ts."
        columns={[
          {
            header: "Description",
            className: "hidden md:table-cell whitespace-normal",
            cell: (agent) => (
              <span className="text-muted-foreground text-sm">{agent.description}</span>
            ),
          },
          {
            header: "Model",
            cell: (agent) => <Badge variant="secondary">{agent.modelId}</Badge>,
          },
          {
            header: "Tools",
            cell: (agent) => Object.keys(agent.tools ?? {}).length,
          },
        ]}
      />
    </>
  );
}
