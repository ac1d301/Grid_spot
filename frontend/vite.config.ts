import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy libs into their own long-cached chunks so the main entry stays lean
        // and recharts (only needed in Race Center) doesn't bloat the initial bundle.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          recharts: ["recharts"],
          query: [
            "@tanstack/react-query",
            "@tanstack/react-query-persist-client",
            "@tanstack/query-sync-storage-persister",
          ],
          datefns: ["date-fns"],
        },
      },
    },
  },
}));
