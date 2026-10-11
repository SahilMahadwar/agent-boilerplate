import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import type { SectionKey } from "@/configs/navigation";

type Props = Omit<ComponentProps<"a">, "href" | "ref"> & {
  section: SectionKey;
  id: string;
};

/** A typed link to one agent, workflow, tool or schedule page. */
export function ItemLink({ section, id, ...props }: Props) {
  switch (section) {
    case "agents":
      return <Link to="/agents/$agentId" params={{ agentId: id }} {...props} />;
    case "workflows":
      return <Link to="/workflows/$workflowId" params={{ workflowId: id }} {...props} />;
    case "tools":
      return <Link to="/tools/$toolId" params={{ toolId: id }} {...props} />;
    case "schedules":
      return <Link to="/schedules/$scheduleId" params={{ scheduleId: id }} {...props} />;
  }
}
