import { MastraClient } from "@mastra/client-js";

// Same origin: the Worker serves this SPA from static assets and the Mastra
// routes under /api, so no cross-origin configuration is needed.
export const mastraClient = new MastraClient({
  baseUrl: window.location.origin,
});

export const weatherAgent = mastraClient.getAgent("weather-agent");
