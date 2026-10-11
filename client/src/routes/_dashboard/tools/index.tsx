import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ItemTable } from "@/components/item-table";
import { PageHeader } from "@/components/page-header";
import { toolsQuery } from "@/lib/mastra-queries";

export const Route = createFileRoute("/_dashboard/tools/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(toolsQuery),
  component: ToolsPage,
});

function ToolsPage() {
  const { data } = useSuspenseQuery(toolsQuery);
  return (
    <>
      <PageHeader
        title="Tools"
        description="Defined in src/mastra/tools and registered under `tools` in src/mastra/index.ts."
      />
      <ItemTable
        section="tools"
        rows={data.map((tool) => ({ ...tool, name: tool.id }))}
        empty="No tools registered in src/mastra/index.ts."
        columns={[
          {
            header: "Description",
            className: "whitespace-normal",
            cell: (tool) => (
              <span className="text-muted-foreground text-sm">{tool.description}</span>
            ),
          },
        ]}
      />
    </>
  );
}
