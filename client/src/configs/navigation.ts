import {
  Bot,
  CalendarClock,
  Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type SectionKey = "agents" | "workflows" | "tools" | "schedules";

export type Section = {
  key: SectionKey;
  title: string;

  noun: string;
  url: `/${SectionKey}`;
  icon: LucideIcon;
};

export const sections: Section[] = [
  { key: "agents", title: "Agents", noun: "agent", url: "/agents", icon: Bot },
  {
    key: "workflows",
    title: "Workflows",
    noun: "workflow",
    url: "/workflows",
    icon: Workflow,
  },
  { key: "tools", title: "Tools", noun: "tool", url: "/tools", icon: Wrench },
  {
    key: "schedules",
    title: "Schedules",
    noun: "schedule",
    url: "/schedules",
    icon: CalendarClock,
  },
];

export const sectionByKey = Object.fromEntries(
  sections.map((section) => [section.key, section]),
) as Record<SectionKey, Section>;
