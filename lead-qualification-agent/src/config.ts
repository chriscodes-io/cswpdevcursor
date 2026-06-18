import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function optionalInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  picaSecret: () => requireEnv('PICA_SECRET'),
  gmailConnectionKey: () => requireEnv('GMAIL_CONNECTION_KEY'),
  hubspotConnectionKey: () => requireEnv('HUBSPOT_CONNECTION_KEY'),
  slackConnectionKey: () => requireEnv('SLACK_CONNECTION_KEY'),
  openaiApiKey: () => requireEnv('OPENAI_API_KEY'),
  openaiModel: optionalEnv('OPENAI_MODEL', 'gpt-4o-mini'),
  gmailLeadsLabel: optionalEnv('GMAIL_LEADS_LABEL', 'Leads'),
  gmailLookbackHours: optionalInt('GMAIL_LOOKBACK_HOURS', 24),
  gmailMaxMessages: optionalInt('GMAIL_MAX_MESSAGES', 25),
  qualificationThreshold: optionalInt('QUALIFICATION_THRESHOLD', 7),
  hubspotPortalId: optionalEnv('HUBSPOT_PORTAL_ID', ''),
  slackChannel: optionalEnv('SLACK_CHANNEL', '#sales-leads'),
};
