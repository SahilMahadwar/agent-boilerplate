import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { NotFound, PageSkeleton, RouteError } from "./components/query-states";
import "./index.css";
import { orpc, queryClient } from "./lib/orpc";
import { routeTree } from "./routeTree.gen";

const dark = window.matchMedia("(prefers-color-scheme: dark)");
const applyTheme = (matches: boolean) =>
  document.documentElement.classList.toggle("dark", matches);

applyTheme(dark.matches);
dark.addEventListener("change", (event) => applyTheme(event.matches));

const router = createRouter({
  routeTree,
  context: { queryClient, orpc },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultPendingComponent: PageSkeleton,
  defaultErrorComponent: RouteError,
  defaultNotFoundComponent: NotFound,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
