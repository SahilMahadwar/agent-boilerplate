import {
  type HonoBindings,
  type HonoVariables,
  MastraServer,
} from "@mastra/hono";
import { Hono } from "hono";
import { mastra } from "./mastra/index.js";

const app = new Hono<{ Bindings: HonoBindings; Variables: HonoVariables }>();
const server = new MastraServer({ app, mastra });

// Route registration is deferred to the first request: a Worker may not perform
// I/O in global scope, so `init()` cannot run at module scope.
let ready: Promise<unknown> | undefined;

export default {
  async fetch(request, env, ctx) {
    ready ??= server.init();
    await ready;
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
