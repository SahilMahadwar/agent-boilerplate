import { D1Store } from "@mastra/cloudflare-d1";
import { ConsoleLogger } from "@mastra/core/logger";
import { Mastra } from "@mastra/core/mastra";
import {
  MastraPlatformExporter,
  Observability,
  SensitiveDataFilter,
} from "@mastra/observability";
import { d1 } from "../db/index.js";
import { weatherAgent } from "./agents/weather-agent";
import { AppAuthProvider } from "./auth";
import { weatherMcpServer } from "./mcp/weather-mcp-server";
import { weatherTool } from "./tools/weather-tool";
import { weatherWorkflow } from "./workflows/weather-workflow";

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { weatherAgent },
  tools: { weatherTool },
  mcpServers: { weatherMcpServer },
  // A Better Auth session or an API key on every Mastra route except MCP_PATH (src/mastra/auth.ts).
  server: { auth: new AppAuthProvider() },
  storage: new D1Store({ id: "mastra-storage", binding: d1 }),
  logger: new ConsoleLogger({
    name: "Mastra",
    level: "info",
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra",

        exporters: [new MastraPlatformExporter()],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
});
