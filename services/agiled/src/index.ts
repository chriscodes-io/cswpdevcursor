import { Hono, type Context, type Next } from "hono";
import { timingSafeEqual } from "node:crypto";
import { config } from "./config.js";
import { crm } from "./routes/crm.js";
import { webhooks } from "./routes/webhooks.js";

const app = new Hono();

function bearerToken(authorization = ""): string {
  const [scheme, ...parts] = authorization.split(" ");
  if (scheme.toLowerCase() !== "bearer") {
    return "";
  }
  return parts.join(" ").trim();
}

function tokenMatches(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

async function requireCrmProxyToken(c: Context, next: Next) {
  const expected = config.crmProxyToken;
  if (!expected) {
    return c.json({ error: "CRM proxy is disabled until CRM_PROXY_TOKEN is configured" }, 503);
  }

  const supplied = bearerToken(c.req.header("Authorization")) || c.req.header("X-CRM-Proxy-Token") || "";
  if (!tokenMatches(supplied, expected)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
}

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

app.use("/api/crm", requireCrmProxyToken);
app.use("/api/crm/*", requireCrmProxyToken);
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
