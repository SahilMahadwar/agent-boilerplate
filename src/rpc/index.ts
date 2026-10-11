import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError, type RouterClient } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { publicProcedure } from "./orpc.js";
import { exampleRouter } from "./routers/example.js";
import { schedulesRouter } from "./routers/schedules.js";

export const appRouter = {
  health: publicProcedure.handler(() => ({
    ok: true,
    time: new Date().toISOString(),
  })),
  example: exampleRouter,
  schedules: schedulesRouter,
};

export type AppRouter = typeof appRouter;
/** The SPA imports only this type (via the tsconfig project reference). */
export type AppRouterClient = RouterClient<AppRouter>;

/** Used by the SPA through `@orpc/client` (mounted at `/api/rpc`). */
export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [onError((error) => console.error(error))],
});

/** Plain REST + an API reference page (mounted at `/api/openapi`). */
export const openApiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
      specGenerateOptions: { info: { title: "Agent API", version: "1.0.0" } },
    }),
  ],
  interceptors: [onError((error) => console.error(error))],
});
