import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import {
  GenericWorkflowConfigure,
  GenericWorkflowInteract,
} from "@/features/generic/views";
import { ItemTabs } from "@/features/item-tabs";
import { workflowViews } from "@/features/registry";
import { workflowQuery } from "@/lib/mastra-queries";
import { validateTabSearch } from "@/lib/tab-search";

export const Route = createFileRoute("/_dashboard/workflows/$workflowId")({
  validateSearch: validateTabSearch,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(workflowQuery(params.workflowId)),
  component: WorkflowPage,
});

function WorkflowPage() {
  const { workflowId } = Route.useParams();
  const { tab = "interact" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: workflow } = useSuspenseQuery(workflowQuery(workflowId));

  return (
    <>
      <PageHeader title={workflow.name} description={workflow.description} />
      <ItemTabs
        id={workflowId}
        custom={workflowViews[workflowId]}
        generic={{ interact: GenericWorkflowInteract, configure: GenericWorkflowConfigure }}
        tab={tab}
        onTabChange={(next) => navigate({ search: { tab: next }, replace: true })}
      />
    </>
  );
}
