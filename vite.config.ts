import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    // File-based routes in client/src/routes; must run before react().
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./client/src/routes",
      generatedRouteTree: "./client/src/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
    cloudflare(),
  ],
  environments: {
    mastra_hono: {
      define: { "import.meta.url": JSON.stringify("file:///") },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./client/src"),
    },
  },
});
