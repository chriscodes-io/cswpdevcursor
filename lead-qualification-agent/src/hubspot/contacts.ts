import { config } from '../config.js';
import type { ExtractedLead, QualificationResult } from '../qualify/qualifyLead.js';
import { PICA_ACTIONS } from '../pica/actions.js';
import { picaRequest, withRetry } from '../pica/client.js';

type HubSpotSearchResponse = {
  total?: number;
  results?: Array<{ id: string; properties?: Record<string, string> }>;
};

type HubSpotCreateResponse = {
  id: string;
  properties?: Record<string, string>;
};

export type HubSpotContactResult = {
  contactId: string;
  isNew: boolean;
  url: string;
};

/**
 * Decide whether a HubSpot create attempt produced a usable contact id.
 * Create is not idempotent — never blindly retry POST /contacts. On ambiguous
 * failure, callers must re-search by email and treat a found contact as success.
 */
export function reconcileHubSpotCreateAttempt(input: {
  createdId: string | null | undefined;
  createError: unknown | null;
  recoveredId: string | null;
}): { ok: true; contactId: string; isNew: boolean } | { ok: false; error: unknown } {
  if (!input.createError && input.createdId) {
    return { ok: true, contactId: input.createdId, isNew: true };
  }
  if (input.recoveredId) {
    // Contact exists after a failed/ambiguous create — do not POST again.
    return { ok: true, contactId: input.recoveredId, isNew: false };
  }
  return {
    ok: false,
    error:
      input.createError ??
      new Error('HubSpot create returned no contact id'),
  };
}

function hubspotContactUrl(contactId: string): string {
  const portalId = config.hubspotPortalId;
  if (portalId) {
    return `https://app.hubspot.com/contacts/${portalId}/contact/${contactId}`;
  }
  return `https://app.hubspot.com/contacts/contact/${contactId}`;
}

export async function findContactByEmail(email: string): Promise<string | null> {
  if (!email) return null;

  const body = {
    limit: 1,
    after: '0',
    sorts: ['createdAt'],
    properties: ['email', 'firstname', 'lastname'],
    filterGroups: [
      {
        filters: [
          {
            propertyName: 'email',
            operator: 'EQ',
            value: email,
          },
        ],
      },
    ],
  };

  // Search is idempotent — safe to retry on transient transport errors.
  const result = await withRetry(() =>
    picaRequest<HubSpotSearchResponse>(
      '/crm/v3/objects/contacts/search',
      PICA_ACTIONS.hubspot.searchContacts,
      config.hubspotConnectionKey(),
      { method: 'POST', body }
    )
  );

  const first = result.results?.[0];
  return first?.id || null;
}

export async function upsertQualifiedContact(
  extracted: ExtractedLead,
  qualification: QualificationResult
): Promise<HubSpotContactResult> {
  const email = extracted.email || '';
  if (!email) {
    throw new Error('Cannot create HubSpot contact without email');
  }

  const existingId = await findContactByEmail(email);
  if (existingId) {
    return {
      contactId: existingId,
      isNew: false,
      url: hubspotContactUrl(existingId),
    };
  }

  const notes = [
    `Lead score: ${qualification.score}/10`,
    qualification.reasoning,
    qualification.highSignals.length
      ? `High signals: ${qualification.highSignals.join('; ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const properties: Record<string, string> = {
    email,
    firstname: extracted.firstName || '',
    lastname: extracted.lastName || '',
    company: extracted.company || '',
    phone: extracted.phone || '',
    hs_lead_status: 'NEW',
    lifecyclestage: 'lead',
    description: [
      'Lead source: Email Inquiry',
      extracted.budget ? `Budget: ${extracted.budget}` : '',
      extracted.timeline ? `Timeline: ${extracted.timeline}` : '',
      notes,
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 65000),
  };

  const createBody = {
    properties,
  };

  // At-most-once: HubSpot contact create has no idempotency key. Retrying after
  // timeout/5xx can (and does) create duplicate contacts for the same email.
  let createdId: string | null | undefined;
  let createError: unknown | null = null;
  try {
    const created = await picaRequest<HubSpotCreateResponse>(
      '/crm/v3/objects/contacts',
      PICA_ACTIONS.hubspot.createContact,
      config.hubspotConnectionKey(),
      { method: 'POST', body: createBody }
    );
    createdId = created.id;
  } catch (err) {
    createError = err;
  }

  let recoveredId: string | null = null;
  if (createError || !createdId) {
    recoveredId = await findContactByEmail(email);
  }

  const reconciled = reconcileHubSpotCreateAttempt({
    createdId,
    createError,
    recoveredId,
  });
  if (!reconciled.ok) {
    throw reconciled.error instanceof Error
      ? reconciled.error
      : new Error(String(reconciled.error));
  }

  return {
    contactId: reconciled.contactId,
    isNew: reconciled.isNew,
    url: hubspotContactUrl(reconciled.contactId),
  };
}
