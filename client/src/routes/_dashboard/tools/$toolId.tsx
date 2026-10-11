import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { GenericToolConfigure, GenericToolInteract } from "@/features/generic/views";
import { ItemTabs } from "@/features/item-tabs";
import { toolViews } from "@/features/registry";
import { toolQuery } from "@/lib/mastra-queries";
import { validateTabSearch } from "@/lib/tab-search";

export const Route = createFileRoute("/_dashboard/tools/$toolId")({
  validateSearch: validateTabSearch,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(toolQuery(params.toolId)),
  component: ToolPage,
});

function ToolPage() {
  const { toolId } = Route.useParams();
  const { tab = "interact" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: tool } = useSuspenseQuery(toolQuery(toolId));

  return (
    <>
      <PageHeader title={toolId} description={tool.description} />
      <ItemTabs
        id={toolId}
        custom={toolViews[toolId]}
        generic={{ interact: GenericToolInteract, configure: GenericToolConfigure }}
        tab={tab}
        onTabChange={(next) => navigate({ search: { tab: next }, replace: true })}
      />
    </>
  );
}
