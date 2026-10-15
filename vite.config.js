import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import {
  createMathverseMiddleware,
  DEFAULT_APPS_SCRIPT_URL,
} from "./server/mathverseProxy.js";

function mathverseProxyPlugin(options) {
  const mount = (server) => {
    server.middlewares.use(
      "/api/mathverse",
      createMathverseMiddleware(options)
    );
  };

  return {
    name: "mathverse-server-api-proxy",
    configureServer: mount,
    configurePreviewServer: mount,
  };
}

export default defineConfig(({ mode }) => {
  const serverEnv = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      mathverseProxyPlugin({
        apiKey: serverEnv.MATHVERSE_API_KEY,
        appsScriptUrl:
          serverEnv.MATHVERSE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL,
      }),
    ],
  };
});
