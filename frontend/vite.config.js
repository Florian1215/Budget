import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // File events are not always forwarded from the host into Docker: poll instead.
    watch: { usePolling: process.env.VITE_POLLING === "1", interval: 300 },
  },
});
