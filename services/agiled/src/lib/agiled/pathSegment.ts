import { AgiledApiError } from "./types.js";

const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;

/**
 * Validate and encode a single URL path segment before interpolating into Agiled paths.
 *
 * Hono decodes `%2F` in route params, so a request like
 * `GET /api/crm/contacts/..%2Fwebhook-subscriptions` yields contactId `../webhook-subscriptions`.
 * Concatenating that into `/contacts/${id}` lets `fetch` normalize to `/webhook-subscriptions`,
 * escaping the CRM proxy allowlist with the service API key.
 */
export function toSafePathSegment(value: string, label = "id"): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new AgiledApiError(`Invalid ${label}`, 400, null);
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    throw new AgiledApiError(`Invalid ${label}`, 400, null);
  }

  if (!SAFE_SEGMENT.test(decoded)) {
    throw new AgiledApiError(`Invalid ${label}`, 400, null);
  }

  return encodeURIComponent(decoded);
}
