import { env } from 'cloudflare:workers';
import { D1Store } from '@mastra/cloudflare-d1';
import { Mastra } from '@mastra/core/mastra';
import { ConsoleLogger } from '@mastra/core/logger';
import { Observability, MastraPlatformExporter, SensitiveDataFilter } from '@mastra/observability';
import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { weatherAgent },
  // D1Store must be constructed inline here: the `cloudflare:workers` env proxy
  // can only be read once the Worker is executing, not at module scope.
  storage: new D1Store({ id: 'mastra-storage', binding: env.DB }),
  logger: new ConsoleLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        // D1 does not support the observability domain, so traces are not
        // persisted to storage. Only the platform exporter is wired up here
        // (active when MASTRA_PLATFORM_ACCESS_TOKEN is set).
        exporters: [new MastraPlatformExporter()],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});
