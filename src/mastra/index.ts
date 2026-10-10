import { D1Store } from "@mastra/cloudflare-d1";
import { ConsoleLogger } from "@mastra/core/logger";
import { Mastra } from "@mastra/core/mastra";
import {
  MastraPlatformExporter,
  Observability,
  SensitiveDataFilter,
} from "@mastra/observability";
import { env } from "cloudflare:workers";
import { weatherAgent } from "./agents/weather-agent";
import { weatherMcpServer } from "./mcp/weather-mcp-server";
import { weatherWorkflow } from "./workflows/weather-workflow";

const lazyDB = new Proxy({} as D1Database, {
  get(_, prop) {
    const value = Reflect.get(env.DB, prop);
    return typeof value === "function" ? value.bind(env.DB) : value;
  },
});

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { weatherAgent },
  mcpServers: { weatherMcpServer },
  storage: new D1Store({ id: "mastra-storage", binding: lazyDB }),
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
