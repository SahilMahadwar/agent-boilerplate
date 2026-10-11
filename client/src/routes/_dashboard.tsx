import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/layouts/dashboard-layout";

export const Route = createFileRoute("/_dashboard")({
  // Gate the dashboard here once the project has auth, e.g.
  // beforeLoad: async () => { if (!(await getSession())) throw redirect({ to: "/login" }) },
  component: DashboardLayout,
});
