import { Hono } from "hono";
import { config } from "./config.js";
import { crm } from "./routes/crm.js";
import { webhooks } from "./routes/webhooks.js";

const app = new Hono();

app.get("/", (c) =>
  c.json({
    service: "cswp-backend",
    status: "running",
    endpoints: {
      health: "/health",
      crm: "/api/crm/me",
      webhooks: "/webhooks/agiled",
    },
    agiled: {
      configured: Boolean(config.agiled.apiKey),
      webhookUrl: config.webhookUrl,
    },
  }),
);

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "cswp-backend",
    agiled: {
      configured: Boolean(config.agiled.apiKey),
      webhookUrl: config.webhookUrl,
    },
  }),
);

app.route("/api/crm", crm);
app.route("/webhooks", webhooks);

// Legacy /crm endpoint — returns 410 so Agiled stops retrying the old subscription.
app.all("/crm", (c) =>
  c.json(
    {
      error: "Legacy CRM webhook removed. Use /webhooks/agiled instead.",
      replacement: config.webhookUrl,
    },
    410,
  ),
);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export { app };
