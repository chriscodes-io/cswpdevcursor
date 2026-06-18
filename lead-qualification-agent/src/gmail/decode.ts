export function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  return Buffer.from(base64 + pad, 'base64').toString('utf-8');
}

export type GmailPart = {
  mimeType?: string;
  body?: { data?: string; attachmentId?: string };
  parts?: GmailPart[];
};

export function extractBodyFromPayload(payload: GmailPart): string {
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts?.length) {
    let html = '';
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
      if (part.mimeType === 'text/html' && part.body?.data) {
        html = decodeBase64Url(part.body.data);
      }
      const nested = extractBodyFromPayload(part);
      if (nested) return nested;
    }
    if (html) return html;
  }

  return '';
}

export function getHeader(
  headers: Array<{ name?: string; value?: string }> | undefined,
  name: string
): string {
  if (!headers) return '';
  const found = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return found?.value || '';
}

export function parseEmailAddress(from: string): { name: string; email: string } {
  const match = from.match(/^(?:"?([^"]*)"?\s)?<?([^>\s]+@[^>\s]+)>?$/);
  if (match) {
    return { name: (match[1] || '').trim(), email: match[2].trim() };
  }
  return { name: '', email: from.trim() };
}
