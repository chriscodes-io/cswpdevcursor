import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  appUrl: optional("APP_URL", "http://localhost:3001").replace(/\/$/, ""),
  agiled: {
    baseUrl: optional("AGILED_API_BASE_URL", "https://api.agiled.ai/public/v1").replace(/\/$/, ""),
    apiKey: optional("AGILED_API_KEY"),
    webhookSecret: optional("AGILED_WEBHOOK_SECRET"),
    legacyWebhookSubscriptionId: optional("AGILED_LEGACY_WEBHOOK_SUBSCRIPTION_ID"),
  },
  webhookPath: "/webhooks/agiled",
  get webhookUrl(): string {
    return `${this.appUrl}${this.webhookPath}`;
  },
} as const;

export function assertAgiledConfigured(): void {
  required("AGILED_API_KEY");
}

export function assertWebhookSecretConfigured(): void {
  required("AGILED_WEBHOOK_SECRET");
}
