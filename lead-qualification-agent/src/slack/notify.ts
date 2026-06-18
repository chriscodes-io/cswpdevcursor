import { config } from '../config.js';
import type { LeadEmail } from '../gmail/fetchLeadEmails.js';
import type { HubSpotContactResult } from '../hubspot/contacts.js';
import type { ExtractedLead, QualificationResult } from '../qualify/qualifyLead.js';
import { PICA_ACTIONS } from '../pica/actions.js';
import { picaRequest, withRetry } from '../pica/client.js';

type SlackPostResponse = { ok: boolean; error?: string };

export async function sendSlackNotification(
  email: LeadEmail,
  extracted: ExtractedLead,
  qualification: QualificationResult,
  hubspot: HubSpotContactResult
): Promise<void> {
  const name =
    [extracted.firstName, extracted.lastName].filter(Boolean).join(' ') ||
    email.senderName ||
    'Unknown';
  const company = extracted.company || '—';
  const budget = extracted.budget || 'Not specified';
  const timeline = extracted.timeline || 'Not specified';
  const preview = (email.body || email.snippet).slice(0, 200);

  const text = `New qualified lead (${qualification.score}/10): ${name} at ${company}`;

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `🎯 New Qualified Lead (Score: ${qualification.score}/10)` },
    },
    { type: 'divider' },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Contact:*\n${name} at ${company}` },
        {
          type: 'mrkdwn',
          text: `*Email:*\n<mailto:${extracted.email}|${extracted.email}>`,
        },
        {
          type: 'mrkdwn',
          text: `*Phone:*\n${extracted.phone || '—'}`,
        },
        {
          type: 'mrkdwn',
          text: `*HubSpot:*\n${hubspot.isNew ? 'Created' : 'Existing'} contact`,
        },
      ],
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Budget:*\n${budget}` },
        { type: 'mrkdwn', text: `*Timeline:*\n${timeline}` },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Qualification reasoning:*\n${qualification.reasoning}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Next actions:*\n• Review HubSpot: <${hubspot.url}|Open contact>\n• Send personalized follow-up within 2 hours\n• Schedule discovery call if appropriate`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Original message:*\n>${preview.replace(/\n/g, '\n>')}${preview.length >= 200 ? '…' : ''}`,
      },
    },
  ];

  const result = await withRetry(() =>
    picaRequest<SlackPostResponse>(
      '/chat.postMessage',
      PICA_ACTIONS.slack.postMessage,
      config.slackConnectionKey(),
      {
        method: 'POST',
        body: {
          channel: config.slackChannel,
          text,
          blocks,
        },
      }
    )
  );

  if (result.ok === false) {
    throw new Error(`Slack post failed: ${result.error || 'unknown error'}`);
  }
}
