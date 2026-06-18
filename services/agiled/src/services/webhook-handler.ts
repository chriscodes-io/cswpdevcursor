import { AgiledWebhookEvent, AgiledWebhookPayload } from "../lib/agiled/types.js";

export type WebhookHandlerContext = {
  event: AgiledWebhookEvent;
  payload: AgiledWebhookPayload;
};

export async function handleAgiledWebhook({ event, payload }: WebhookHandlerContext): Promise<void> {
  const resourceType = event.split(".")[0];
  const action = event.split(".")[1];
  const resourceId = payload.data?.id ?? "unknown";

  console.info("[agiled:webhook]", {
    event,
    resourceType,
    action,
    resourceId,
  });

  switch (resourceType) {
    case "contact":
      await handleContactEvent(event, payload);
      break;
    case "account":
      await handleAccountEvent(event, payload);
      break;
    case "deal":
      await handleDealEvent(event, payload);
      break;
    case "ticket":
      await handleTicketEvent(event, payload);
      break;
    case "invoice":
    case "payment":
    case "project":
    case "task":
    case "form":
    case "form_submission":
      break;
    default:
      break;
  }
}

async function handleContactEvent(event: AgiledWebhookEvent, payload: AgiledWebhookPayload): Promise<void> {
  if (event === "contact.deleted") {
    console.info("[agiled:contact] deleted", payload.data.id);
    return;
  }

  console.info("[agiled:contact] upsert", {
    id: payload.data.id,
    email: payload.data.email,
    event,
  });
}

async function handleAccountEvent(event: AgiledWebhookEvent, payload: AgiledWebhookPayload): Promise<void> {
  console.info("[agiled:account]", event, payload.data.id);
}

async function handleDealEvent(event: AgiledWebhookEvent, payload: AgiledWebhookPayload): Promise<void> {
  console.info("[agiled:deal]", event, payload.data.id);
}

async function handleTicketEvent(event: AgiledWebhookEvent, payload: AgiledWebhookPayload): Promise<void> {
  console.info("[agiled:ticket]", event, payload.data.id);
}
