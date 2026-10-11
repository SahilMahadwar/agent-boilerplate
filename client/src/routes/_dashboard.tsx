import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { sessionQuery } from "@/lib/auth-client";

export const Route = createFileRoute("/_dashboard")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery);
    if (!session) throw redirect({ to: "/login" });
    return { session };
  },
  component: DashboardLayout,
});
