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

  const created = await withRetry(() =>
    picaRequest<HubSpotCreateResponse>(
      '/crm/v3/objects/contacts',
      PICA_ACTIONS.hubspot.createContact,
      config.hubspotConnectionKey(),
      { method: 'POST', body: createBody }
    )
  );

  return {
    contactId: created.id,
    isNew: true,
    url: hubspotContactUrl(created.id),
  };
}
