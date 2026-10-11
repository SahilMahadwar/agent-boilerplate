import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import type { AppRouter, AppRouterClient } from "../../../src/rpc/index.js";

declare module "@tanstack/react-query" {
  interface Register {
    /** `toast: false` for mutations that show their error inline. */
    mutationMeta: { toast?: boolean };
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    // First-load failures render inline (ErrorState); only toast when a
    // background refetch fails over data that is already on screen.
    onError: (error, query) => {
      if (query.state.data === undefined) return;
      toast.error(error.message, {
        action: { label: "Retry", onClick: () => queryClient.invalidateQueries() },
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.toast !== false) toast.error(error.message);
    },
  }),
});

const link = new RPCLink({ url: `${window.location.origin}/api/rpc` });

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);

// Shapes inferred from the server's router: no separate contract to maintain.
type Inputs = InferRouterInputs<AppRouter>;
type Outputs = InferRouterOutputs<AppRouter>;

export type Schedule = Outputs["schedules"]["get"];
export type ScheduleRun = Outputs["schedules"]["runs"][number];
export type ScheduleInput = Inputs["schedules"]["create"];
