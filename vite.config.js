import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (command === "build" && mode === "production") {
    const api = env.VITE_API_BASE_URL || process.env.VITE_API_BASE_URL;
    if (!api || new URL(api).protocol !== "https:") throw new Error("Production requires an HTTPS VITE_API_BASE_URL");
  }
  return ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
});

