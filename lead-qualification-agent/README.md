# Automated Lead Qualification Agent

Processes Gmail lead inquiry emails, scores them with OpenAI, creates HubSpot contacts for qualified leads (score ≥ 7/10), and notifies your sales team on Slack — all via [Pica](https://picaos.com).

## Prerequisites

1. **Pica account** with connected integrations:
   - [Gmail](https://app.picaos.com/connections)
   - [HubSpot](https://app.picaos.com/connections)
   - [Slack](https://app.picaos.com/connections)

2. **Gmail label** named `Leads` (or set `GMAIL_LEADS_LABEL`).

3. **OpenAI API key** for extraction and qualification.

4. **Pica MCP** in Cursor (optional, for discovery): `npx @picahq/mcp` with `PICA_SECRET`.

## Setup

```bash
cd lead-qualification-agent
npm install
cp .env.example .env
# Edit .env with your keys
```

### Environment variables

| Variable | Description |
|----------|-------------|
| `PICA_SECRET` | Pica API secret from [dashboard](https://app.picaos.com) |
| `GMAIL_CONNECTION_KEY` | Gmail connection key from Pica |
| `HUBSPOT_CONNECTION_KEY` | HubSpot connection key |
| `SLACK_CONNECTION_KEY` | Slack connection key |
| `OPENAI_API_KEY` | OpenAI API key |
| `HUBSPOT_PORTAL_ID` | HubSpot portal ID (for contact URLs in Slack) |
| `SLACK_CHANNEL` | Channel ID or name (e.g. `#sales-leads`) |

Connection keys are shown when you run Pica MCP: *“What connections do I have in Pica?”*

## Usage

**Dry run** (fetch + score only, no HubSpot/Slack writes):

```bash
npm run qualify:dry
```

**Full pipeline**:

```bash
npm run qualify
```

Equivalent prompt for an LLM with Pica MCP:

> Qualify today's lead inquiry emails from Gmail: for each email with the "Leads" label, extract sender details and qualify based on high intent signals (budget over $5K, urgent timeline, specific product interest); if qualified with score >7/10, create a new contact in HubSpot with lead source "Email Inquiry"; then send a Slack notification to #sales-leads with lead summary, qualification reasoning, and HubSpot contact link. Only process emails from the last 24 hours.

## Workflow

1. **fetchLeadEmails** — Gmail messages with `label:Leads` and `newer_than:24h`
2. **extractAndQualifyLead** — OpenAI extracts fields + scores 1–10
3. If score ≥ threshold and not spam:
   - **findContactByEmail** / **createHubSpotContact**
   - **sendSlackNotification** with Block Kit formatting
4. Unqualified leads are logged only (no CRM/Slack)

## Qualification criteria

See `src/qualify/criteria.ts` for the full rubric (high/medium/low value indicators).

## Project layout

```
src/
  index.ts              # CLI entry
  pipeline.ts           # Orchestration
  config.ts
  pica/                 # Pica passthrough client + action IDs
  gmail/                # Fetch & decode messages
  qualify/              # OpenAI extraction + scoring
  hubspot/              # Search & create contacts
  slack/                # Sales notifications
```

## Cursor / BuildKit

Copy Pica’s [BuildKit rules](https://docs.picaos.com) into `.cursor/rules/buildkit.mdc` at the repo root if you extend this agent with more Pica tools.

## Troubleshooting

- **No emails found** — Confirm the `Leads` label exists and has messages in the last 24h.
- **Slack `channel_not_found`** — Use a channel ID (`C…`) or invite the Slack app to `#sales-leads`.
- **HubSpot validation errors** — Check required properties in your HubSpot portal; adjust `hubspot/contacts.ts` if you use custom fields.
