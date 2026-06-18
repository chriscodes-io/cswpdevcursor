import { Hono } from "hono";
import { config } from "../config.js";
import { extractSignatureHeader, verifyAgiledWebhookSignature } from "../lib/agiled/verify-signature.js";
import { AgiledWebhookEvent, AgiledWebhookPayload } from "../lib/agiled/types.js";
import { handleAgiledWebhook } from "../services/webhook-handler.js";

const webhooks = new Hono();

webhooks.post("/agiled", async (c) => {
  const rawBody = await c.req.text();
  const signature = extractSignatureHeader(c.req.raw.headers);
  const secret = config.agiled.webhookSecret;

  if (secret) {
    const valid = verifyAgiledWebhookSignature(rawBody, signature, secret);
    if (!valid) {
      console.warn("[agiled:webhook] invalid signature", { signaturePresent: Boolean(signature) });
      return c.json({ error: "Invalid webhook signature" }, 401);
    }
  } else {
    console.warn("[agiled:webhook] AGILED_WEBHOOK_SECRET not set — skipping signature verification");
  }

  let payload: AgiledWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as AgiledWebhookPayload;
  } catch {
    return c.json({ error: "Invalid JSON payload" }, 400);
  }

  if (!payload.event || !payload.data) {
    return c.json({ error: "Malformed webhook payload" }, 422);
  }

  await handleAgiledWebhook({
    event: payload.event as AgiledWebhookEvent,
    payload,
  });

  return c.json({ received: true });
});

export { webhooks };
