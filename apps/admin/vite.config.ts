import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The base path the SPA is served under; also drives the router basename and
// asset URLs. Overridable at build time for hosts that mount the admin UI
// somewhere other than /admin/ (e.g. otl-site serves it at /comments/admin/).
const base = process.env.ADMIN_BASE ?? "/admin/";

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
