import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { handleEsvPassageRequest } from "./server/esvPassageHandler.mjs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (env.ESV_API_KEY) {
    process.env.ESV_API_KEY = env.ESV_API_KEY;
  }

  return {
    plugins: [
      react(),
      {
        name: "esv-passage-dev-handler",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith("/.netlify/functions/esvPassage")) {
              next();
              return;
            }

            const response = await handleEsvPassageRequest(req.url);
            res.statusCode = response.status;

            for (const [key, value] of response.headers.entries()) {
              res.setHeader(key, value);
            }

            res.end(await response.text());
          });
        },
      },
    ],
  };
});
