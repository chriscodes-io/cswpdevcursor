import "dotenv/config";
import { serve } from "@hono/node-server";
import type { ServerType } from "@hono/node-server";
import { app } from "./index.js";
import { config } from "./config.js";

const server = serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  (info) => {
    console.info(`CSWP backend listening on http://localhost:${info.port}`);
    console.info(`Agiled webhook URL: ${config.webhookUrl}`);
    console.info(`CRM API proxy: http://localhost:${info.port}/api/crm`);
  },
) as ServerType;

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${config.port} is already in use. Run: lsof -ti :${config.port} | xargs kill -9`);
    process.exit(1);
  }

  throw error;
});
