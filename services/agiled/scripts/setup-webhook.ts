import "dotenv/config";
import { config } from "../src/config.js";
import { agiled } from "../src/lib/agiled/client.js";
import { AgiledWebhookEvent } from "../src/lib/agiled/types.js";

const ALL_EVENTS: AgiledWebhookEvent[] = [
  "contact.created",
  "contact.updated",
  "contact.deleted",
  "account.created",
  "account.updated",
  "account.deleted",
  "deal.created",
  "deal.updated",
  "deal.deleted",
  "deal.status_changed",
  "ticket.created",
  "ticket.updated",
  "project.created",
  "project.updated",
  "project.deleted",
  "task.created",
  "task.updated",
  "task.deleted",
  "task.status_changed",
  "invoice.created",
  "invoice.updated",
  "invoice.deleted",
  "invoice.paid",
  "payment.created",
  "payment.updated",
  "payment.deleted",
  "time_entry.created",
  "time_entry.updated",
  "time_entry.deleted",
  "pipeline.created",
  "pipeline.updated",
  "pipeline.deleted",
  "stage.created",
  "stage.updated",
  "stage.deleted",
  "form.created",
  "form.updated",
  "form.deleted",
  "form_submission.received",
  "expense.created",
  "expense.updated",
  "expense.deleted",
  "product.created",
  "product.updated",
  "product.deleted",
  "file.created",
  "file.updated",
  "file.restored",
  "file.deleted",
  "folder.created",
  "folder.updated",
  "folder.restored",
  "folder.deleted",
  "document.created",
  "document.updated",
  "document.deleted",
  "appointment.created",
  "appointment.updated",
  "appointment.deleted",
  "order.created",
  "order.updated",
  "employee.created",
  "employee.updated",
  "employee.deleted",
  "leave.approved",
  "leave.requested",
  "leave.rejected",
  "leave.updated",
  "leave.cancelled",
  "estimate.created",
  "estimate.updated",
  "estimate.deleted",
];

async function main(): Promise<void> {
  const subscriptions = await agiled.listWebhookSubscriptions();
  const legacyId = config.agiled.legacyWebhookSubscriptionId;
  const targetUrl = config.webhookUrl;

  console.info("Existing webhook subscriptions:");
  for (const sub of subscriptions.data) {
    console.info(`- ${sub.id} -> ${sub.target_url} (${sub.description ?? "no description"})`);
  }

  const matching = subscriptions.data.find((sub) => sub.target_url === targetUrl);
  if (matching) {
    console.info(`Webhook already configured for ${targetUrl} (${matching.id})`);
  } else {
    const created = await agiled.createWebhookSubscription({
      target_url: targetUrl,
      description: "CSWP.DEV backend",
      events: ALL_EVENTS,
    });

    console.info("Created webhook subscription:");
    console.info(`  id: ${created.data.id}`);
    console.info(`  url: ${created.data.target_url}`);
    if (created.data.secret) {
      console.info(`  secret: ${created.data.secret}`);
      console.info("Save this secret to AGILED_WEBHOOK_SECRET — it is only shown once.");
    }
  }

  const current = await agiled.listWebhookSubscriptions();

  if (legacyId) {
    const legacy = current.data.find(
      (sub) => sub.id === legacyId || sub.target_url.endsWith("/crm"),
    );
    if (legacy) {
      await agiled.deleteWebhookSubscription(legacy.id);
      console.info(`Deleted legacy webhook subscription: ${legacy.id} (${legacy.target_url})`);
    } else {
      console.info("No legacy /crm webhook subscription found to delete.");
    }
  }

  const me = await agiled.me();
  console.info(`Connected to Agiled org: ${me.data.organization.name}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
