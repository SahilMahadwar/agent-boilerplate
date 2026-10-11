import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { BookOpen, ChevronRight, LayoutDashboard, RotateCw, Sparkles } from "lucide-react";
import { ItemLink } from "@/components/item-link";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { type Section, sections } from "@/configs/navigation";
import { agentsQuery, toolsQuery, workflowsQuery } from "@/lib/mastra-queries";
import { orpc } from "@/lib/orpc";

/** The `{ id, name }` list each sidebar section expands into. */
function useSectionItems(section: Section) {
  const agents = useQuery({ ...agentsQuery, enabled: section.key === "agents" });
  const workflows = useQuery({ ...workflowsQuery, enabled: section.key === "workflows" });
  const tools = useQuery({ ...toolsQuery, enabled: section.key === "tools" });
  const schedules = useQuery({
    ...orpc.schedules.list.queryOptions(),
    enabled: section.key === "schedules",
  });

  switch (section.key) {
    case "agents":
      return { ...agents, data: agents.data?.map((a) => ({ id: a.id, name: a.name })) };
    case "workflows":
      return { ...workflows, data: workflows.data?.map((w) => ({ id: w.id, name: w.name })) };
    case "tools":
      return { ...tools, data: tools.data?.map((t) => ({ id: t.id, name: t.id })) };
    case "schedules":
      return { ...schedules, data: schedules.data?.map((s) => ({ id: s.id, name: s.name })) };
  }
}

function SectionMenu({ section }: { section: Section }) {
  const { pathname } = useLocation();
  const { data, isPending, isError, refetch } = useSectionItems(section);
  const inSection = pathname.startsWith(section.url);

  return (
    <Collapsible asChild defaultOpen className="group/collapsible">
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={section.title} isActive={pathname === section.url}>
          <Link to={section.url}>
            <section.icon />
            <span>{section.title}</span>
          </Link>
        </SidebarMenuButton>
        <CollapsibleTrigger asChild>
          <SidebarMenuAction className="data-[state=open]:rotate-90">
            <ChevronRight />
            <span className="sr-only">Toggle {section.title}</span>
          </SidebarMenuAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {isPending ? (
              <SidebarMenuSkeleton />
            ) : isError ? (
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild>
                  <button type="button" onClick={() => refetch()} className="text-destructive">
                    <RotateCw />
                    <span>Couldn't load · Retry</span>
                  </button>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ) : data?.length ? (
              data.map((item) => (
                <SidebarMenuSubItem key={item.id}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={inSection && pathname.endsWith(`/${encodeURIComponent(item.id)}`)}
                  >
                    <ItemLink section={section.key} id={item.id}>
                      <span>{item.name}</span>
                    </ItemLink>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))
            ) : (
              <SidebarMenuSubItem>
                <span className="text-muted-foreground px-2 text-xs">
                  No {section.title.toLowerCase()} yet
                </span>
              </SidebarMenuSubItem>
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AppSidebar() {
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Sparkles className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Agent Console</span>
                  <span className="text-muted-foreground truncate text-xs">
                    Mastra on Workers
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Overview" isActive={pathname === "/"}>
                <Link to="/">
                  <LayoutDashboard />
                  <span>Overview</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Build</SidebarGroupLabel>
          <SidebarMenu>
            {sections.map((section) => (
              <SectionMenu key={section.key} section={section} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="API reference">
              <a href="/api/openapi" target="_blank" rel="noreferrer">
                <BookOpen />
                <span>API reference</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
