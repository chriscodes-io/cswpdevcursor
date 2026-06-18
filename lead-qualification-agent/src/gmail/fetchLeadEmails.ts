import { config } from '../config.js';
import { PICA_ACTIONS } from '../pica/actions.js';
import { picaRequest, withRetry } from '../pica/client.js';
import { extractBodyFromPayload, getHeader, parseEmailAddress, type GmailPart } from './decode.js';

export type LeadEmail = {
  messageId: string;
  threadId: string;
  sender: string;
  senderEmail: string;
  senderName: string;
  subject: string;
  date: string;
  body: string;
  snippet: string;
  internalDate: string;
};

type GmailListResponse = {
  messages?: Array<{ id: string; threadId?: string }>;
};

type GmailMessageResponse = {
  id: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: Array<{ name?: string; value?: string }>;
    body?: { data?: string };
    parts?: Array<{
      mimeType?: string;
      body?: { data?: string };
      parts?: unknown[];
    }>;
  };
};

export async function fetchLeadEmails(): Promise<LeadEmail[]> {
  const label = config.gmailLeadsLabel;
  const hours = config.gmailLookbackHours;
  const maxResults = config.gmailMaxMessages;

  const q = `label:${label} newer_than:${hours}h`;

  const listResult = await withRetry(() =>
    picaRequest<GmailListResponse>(
      '/gmail/v1/users/me/messages',
      PICA_ACTIONS.gmail.listMessages,
      config.gmailConnectionKey(),
      {
        queryParams: {
          maxResults,
          q,
        },
      }
    )
  );

  const refs = listResult.messages || [];
  if (refs.length === 0) {
    return [];
  }

  const emails: LeadEmail[] = [];

  for (const ref of refs) {
    try {
      const message = await withRetry(() =>
        picaRequest<GmailMessageResponse>(
          '/gmail/v1/users/me/messages/{{id}}',
          PICA_ACTIONS.gmail.getMessage,
          config.gmailConnectionKey(),
          {
            pathVariables: { id: ref.id },
            queryParams: {
              format: 'full',
            },
          }
        )
      );

      const headers = message.payload?.headers;
      const from = getHeader(headers, 'From');
      const { name, email } = parseEmailAddress(from);
      let body = extractBodyFromPayload((message.payload || {}) as GmailPart);
      body = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      emails.push({
        messageId: ref.id,
        threadId: message.threadId || ref.threadId || '',
        sender: from,
        senderEmail: email,
        senderName: name,
        subject: getHeader(headers, 'Subject'),
        date: getHeader(headers, 'Date'),
        body: body.slice(0, 4000),
        snippet: message.snippet || body.slice(0, 200),
        internalDate: message.internalDate || '',
      });
    } catch (err) {
      console.warn(`Skipped message ${ref.id}:`, err instanceof Error ? err.message : err);
    }
  }

  return emails;
}
