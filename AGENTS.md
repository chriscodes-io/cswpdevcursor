# Agent notes — Chris Smith Technical SEO app

## Stack

- **Frontend:** React 18 (CRA + CRACO), React Router, shadcn/ui, Tailwind
- **Backend:** FastAPI, MongoDB (Motor)

## One CLI (`one`)

Use the **One CLI** for third-party platform APIs (Gmail, Slack, Shopify, HubSpot, **Stripe**, GitHub, Notion, Salesforce, etc.) — 250+ integrations via one interface. Read skill: `one` (`~/.agents/skills/one/SKILL.md`).

| When | Use One |
|------|---------|
| Send email, post to Slack, Stripe/Shopify/HubSpot calls, GitHub issues, etc. | `one` skill — **not** ad-hoc curl unless One cannot do it |
| List connected platforms | `one list` (with `--agent` for JSON) |
| Discover platform actions | `one search` → `one knowledge` → `one execute` |
| New connection / login | `one add <platform>` or `one login` (user-driven setup) |

**Conventions:** Always pass `--agent` after `one` for structured JSON. Do not use One for `one init` / MCP install unless the user is setting up One itself.

**This repo:** Stripe payments in-app use the existing FastAPI `stripe_service` + webhooks; use **One** when the agent needs to call Stripe (or other services) from the shell on Chris’s connected accounts (e.g. ops, debugging, one-off API tasks).

## Lead qualification agent (Pica)

`lead-qualification-agent/` — Gmail (`Leads` label) → OpenAI score → HubSpot contact → Slack `#sales-leads`. Uses **Pica** passthrough (`PICA_SECRET` + `GMAIL_CONNECTION_KEY`, `HUBSPOT_CONNECTION_KEY`, `SLACK_CONNECTION_KEY`). Run: `cd lead-qualification-agent && npm run qualify` (or `qualify:dry`). See `lead-qualification-agent/README.md`. For new Pica tools, follow `.cursor/rules/buildkit.mdc`.
