import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { orpc } from "@/lib/orpc";

export interface RouterAppContext {
  queryClient: QueryClient;
  orpc: typeof orpc;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: () => (
    <TooltipProvider>
      <Outlet />
      <Toaster richColors />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </TooltipProvider>
  ),
});
