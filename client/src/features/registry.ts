import type { ComponentType } from "react";
import {
  WeatherAgentInteract,
  WeatherToolInteract,
  WeatherWorkflowInteract,
} from "./weather/weather-views";

// Custom UIs, keyed by the Mastra `id` of the agent, workflow or tool.
//
// Each item page has two tabs:
//   - interact:  use it (chat, run a form, show results)
//   - configure: inspect and set it up (model, schemas, schedules)
// Any view left out here falls back to the generic one in ./generic/views.tsx.
// To add a UI for a new project, build it under features/<name>/ and add it below.

export type ViewProps = { id: string };

export type ViewSet = {
  interact?: ComponentType<ViewProps>;
  configure?: ComponentType<ViewProps>;
};

export const agentViews: Record<string, ViewSet> = {
  "weather-agent": { interact: WeatherAgentInteract },
};

export const workflowViews: Record<string, ViewSet> = {
  "weather-workflow": { interact: WeatherWorkflowInteract },
};

export const toolViews: Record<string, ViewSet> = {
  "get-weather": { interact: WeatherToolInteract },
};
