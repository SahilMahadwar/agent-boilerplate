import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  GenericAgentConfigure,
  GenericAgentInteract,
} from "@/features/generic/views";
import { ItemTabs } from "@/features/item-tabs";
import { agentViews } from "@/features/registry";
import { agentQuery } from "@/lib/mastra-queries";
import { validateTabSearch } from "@/lib/tab-search";

export const Route = createFileRoute("/_dashboard/agents/$agentId")({
  validateSearch: validateTabSearch,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(agentQuery(params.agentId)),
  component: AgentPage,
});

function AgentPage() {
  const { agentId } = Route.useParams();
  const { tab = "interact" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: agent } = useSuspenseQuery(agentQuery(agentId));

  return (
    <>
      <PageHeader
        title={agent.name}
        description={agent.description}
        actions={<Badge variant="secondary">{agent.modelId}</Badge>}
      />
      <ItemTabs
        id={agentId}
        custom={agentViews[agentId]}
        generic={{ interact: GenericAgentInteract, configure: GenericAgentConfigure }}
        tab={tab}
        onTabChange={(next) => navigate({ search: { tab: next }, replace: true })}
      />
    </>
  );
}
