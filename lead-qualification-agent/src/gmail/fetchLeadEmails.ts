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
  nextPageToken?: string;
  resultSizeEstimate?: number;
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

type GmailMessageRef = { id: string; threadId?: string };

/**
 * List every Gmail message matching the Leads label + lookback window.
 * Previously only the first page (default maxResults=25) was fetched with no
 * pageToken loop, so older leads in a busy window were silently dropped.
 */
export async function listLeadMessageRefs(): Promise<GmailMessageRef[]> {
  const label = config.gmailLeadsLabel;
  const hours = config.gmailLookbackHours;
  const pageSize = Math.min(Math.max(config.gmailMaxMessages, 1), 500);
  const hardCap = Math.max(config.gmailMaxTotalMessages, pageSize);
  const q = `label:${label} newer_than:${hours}h`;

  const refs: GmailMessageRef[] = [];
  let pageToken: string | undefined;

  do {
    const queryParams: Record<string, string | number> = {
      maxResults: pageSize,
      q,
    };
    if (pageToken) queryParams.pageToken = pageToken;

    const listResult = await withRetry(() =>
      picaRequest<GmailListResponse>(
        '/gmail/v1/users/me/messages',
        PICA_ACTIONS.gmail.listMessages,
        config.gmailConnectionKey(),
        { queryParams }
      )
    );

    const page = listResult.messages || [];
    refs.push(...page);
    pageToken = listResult.nextPageToken || undefined;

    if (refs.length >= hardCap) {
      if (pageToken) {
        console.warn(
          `Gmail list hit GMAIL_MAX_TOTAL_MESSAGES=${hardCap}; remaining pages skipped.`
        );
      }
      return refs.slice(0, hardCap);
    }
  } while (pageToken);

  return refs;
}

export async function fetchLeadEmails(): Promise<LeadEmail[]> {
  const refs = await listLeadMessageRefs();
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
